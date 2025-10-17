import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Hash "mo:base/Hash";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Map "mo:base/HashMap";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";

persistent actor LicenseRegistry {

    // =============================================================================
    // TYPES
    // =============================================================================

    public type DeveloperId = Principal;
    public type ApiKey = Text;
    public type LicenseTier = {
        #Community;
        #Enterprise;
        #Beta;
    };

    public type UsageStats = {
        subscriptions_created: Nat;
        subscriptions_active: Nat;
        payments_processed: Nat;
        last_payment: ?Int;
        monthly_usage: [(Int, Nat)];
    };

    public type Developer = {
        id: DeveloperId;
        name: Text;
        email: Text;
        tier: LicenseTier;
        created_at: Int;
        last_active: Int;
        is_active: Bool;
        usage_stats: UsageStats;
        api_keys: [ApiKey];
    };

    public type ApiKeyInfo = {
        key: ApiKey;
        developer_id: DeveloperId;
        tier: LicenseTier;
        created_at: Int;
        last_used: ?Int;
        usage_count: Nat;
        rate_limit_remaining: Nat;
        rate_limit_reset: Int;
    };

    public type RegistrationRequest = {
        name: Text;
        email: Text;
        tier: LicenseTier;
        project_description: Text;
    };

    public type LicenseValidation = {
        is_valid: Bool;
        developer_id: ?DeveloperId;
        tier: ?LicenseTier;
        rate_limit_remaining: Nat;
        expires_at: Int;
        message: Text;
    };

    // =============================================================================
    // CONSTANTS & RATE LIMITS
    // =============================================================================

    // Rate limits per tier (per hour)
    private transient let COMMUNITY_RATE_LIMIT: Nat = 10;
    private transient let ENTERPRISE_RATE_LIMIT: Nat = 1000;
    private transient let BETA_RATE_LIMIT: Nat = 50;

    // Maximum active subscriptions per tier
    private transient let COMMUNITY_MAX_SUBSCRIPTIONS: Nat = 10;
    private transient let ENTERPRISE_MAX_SUBSCRIPTIONS: Nat = 10000;
    private transient let BETA_MAX_SUBSCRIPTIONS: Nat = 100;

    // API key configuration
    private transient let MAX_API_KEYS_PER_DEVELOPER: Nat = 5;

    // =============================================================================
    // STATE
    // =============================================================================

    // Developer registry - use stable storage for simplicity
    stable var developers: [(DeveloperId, Developer)] = [];
    stable var api_keys: [(ApiKey, ApiKeyInfo)] = [];
    stable var admins: [Principal] = [];
    stable var is_initialized: Bool = false;

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    public shared({caller}) func initialize_registry(): async Result.Result<(), Text> {
        if (is_initialized) {
            return #err("Registry already initialized");
        };

        // Set caller as first admin
        admins := [caller];
        is_initialized := true;

        Debug.print("License Registry initialized by: " # Principal.toText(caller));
        #ok(())
    };

    public shared({caller}) func add_admin(new_admin: Principal): async Result.Result<(), Text> {
        if (not is_initialized) {
            return #err("Registry not initialized");
        };

        if (not isAdmin(caller)) {
            return #err("Unauthorized: Admin access required");
        };

        if (Principal.isAnonymous(new_admin)) {
            return #err("Cannot add anonymous principal as admin");
        };

        if (Array.find(admins, func(admin: Principal): Bool { Principal.equal(admin, new_admin) }) != null) {
            return #err("Admin already exists");
        };

        admins := Array.append(admins, [new_admin]);
        Debug.print("Added admin: " # Principal.toText(new_admin));
        #ok(())
    };

    // =============================================================================
    // DEVELOPER REGISTRATION
    // =============================================================================

    public shared({caller}) func register_developer(
        request: RegistrationRequest
    ): async Result.Result<{api_key: ApiKey; developer_id: DeveloperId}, Text> {

        // Validation
        if (Text.size(request.name) == 0) {
            return #err("Name cannot be empty");
        };

        if (Text.size(request.email) == 0 or not Text.contains(request.email, #text("@"))) {
            return #err("Valid email required");
        };

        if (Text.size(request.project_description) < 10) {
            return #err("Project description must be at least 10 characters");
        };

        // Check if developer already exists
        if (Array.find(developers, func((id, _): (DeveloperId, Developer)): Bool {
            Principal.equal(id, caller)
        }) != null) {
            return #err("Developer already registered");
        };

        // Create developer
        let now = Time.now();
        let developer: Developer = {
            id = caller;
            name = request.name;
            email = request.email;
            tier = request.tier;
            created_at = now;
            last_active = now;
            is_active = true;
            usage_stats = {
                subscriptions_created = 0;
                subscriptions_active = 0;
                payments_processed = 0;
                last_payment = null;
                monthly_usage = [];
            };
            api_keys = [];
        };

        // Generate API key
        let api_key = generate_api_key();
        let api_key_info: ApiKeyInfo = {
            key = api_key;
            developer_id = caller;
            tier = request.tier;
            created_at = now;
            last_used = null;
            usage_count = 0;
            rate_limit_remaining = get_rate_limit_for_tier(request.tier);
            rate_limit_reset = now + (60 * 60 * 1_000_000_000); // 1 hour from now
        };

        // Store in registry
        developers := Array.append(developers, [(caller, developer)]);
        api_keys := Array.append(api_keys, [(api_key, api_key_info)]);

        Debug.print("Registered developer: " # request.name # " (" # Principal.toText(caller) # ") with tier: " # debug_show(request.tier));

        #ok({
            api_key = api_key;
            developer_id = caller;
        })
    };

    // =============================================================================
    // LICENSE VALIDATION (Core IP Protection)
    // =============================================================================

    public query func validate_license(api_key: ApiKey): async LicenseValidation {
        switch (Array.find(api_keys, func((key, _): (ApiKey, ApiKeyInfo)): Bool { key == api_key })) {
            case (null) {
                {
                    is_valid = false;
                    developer_id = null;
                    tier = null;
                    rate_limit_remaining = 0;
                    expires_at = 0;
                    message = "Invalid API key";
                }
            };
            case (?(_, info)) {
                // Check rate limiting
                let now = Time.now();
                let rate_limit_remaining = if (now > info.rate_limit_reset) {
                    get_rate_limit_for_tier(info.tier); // Reset
                } else {
                    info.rate_limit_remaining;
                };

                let is_valid = rate_limit_remaining > 0 and info.developer_id != Principal.fromText("aaaaa-aa");

                {
                    is_valid = is_valid;
                    developer_id = ?info.developer_id;
                    tier = ?info.tier;
                    rate_limit_remaining = rate_limit_remaining;
                    expires_at = info.rate_limit_reset;
                    message = if (is_valid) "Valid license" else "Rate limit exceeded";
                }
            };
        }
    };

    public shared({caller}) func consume_license_usage(api_key: ApiKey): async Result.Result<(), Text> {
        var api_key_index: ?Nat = null;
        var index_counter: Nat = 0;
        for ((key, _) in api_keys.vals()) {
            if (key == api_key) {
                api_key_index := ?index_counter;
            };
            index_counter += 1;
        };

        switch (api_key_index) {
            case (null) {
                return #err("Invalid API key");
            };
            case (?index) {
                let (_, info) = api_keys[index];
                let now = Time.now();

                // Check if rate limit needs reset
                let (new_remaining, new_reset) = if (now > info.rate_limit_reset) {
                    // Reset rate limit
                    (get_rate_limit_for_tier(info.tier) - 1, now + (60 * 60 * 1_000_000_000))
                } else if (info.rate_limit_remaining > 0) {
                    // Consume one usage
                    (info.rate_limit_remaining - 1, info.rate_limit_reset)
                } else {
                    // Rate limit exceeded
                    return #err("Rate limit exceeded");
                };

                // Update API key info
                let updated_info = {
                    info with
                    last_used = ?now;
                    usage_count = info.usage_count + 1;
                    rate_limit_remaining = new_remaining;
                    rate_limit_reset = new_reset;
                };

                // Update the array - create new array since arrays are immutable
                let new_api_keys = Array.tabulate< (ApiKey, ApiKeyInfo) >(
                    api_keys.size(),
                    func(i: Nat): (ApiKey, ApiKeyInfo) {
                        if (i == index) {
                            (api_key, updated_info)
                        } else {
                            api_keys[i]
                        }
                    }
                );
                api_keys := new_api_keys;

                // Update developer usage stats
                var dev_index: ?Nat = null;
                var dev_counter: Nat = 0;
                for ((id, _) in developers.vals()) {
                    if (Principal.equal(id, info.developer_id)) {
                        dev_index := ?dev_counter;
                    };
                    dev_counter += 1;
                };

                switch (dev_index) {
                    case (null) {}; // Shouldn't happen
                    case (?dev_idx) {
                        let (dev_id, developer) = developers[dev_idx];
                        let updated_stats = {
                            developer.usage_stats with
                            subscriptions_created = developer.usage_stats.subscriptions_created + 1;
                        };
                        let updated_developer = {
                            developer with
                            usage_stats = updated_stats;
                            last_active = now;
                        };
                        // Update the developers array - create new array since arrays are immutable
                        let new_developers = Array.tabulate< (DeveloperId, Developer) >(
                            developers.size(),
                            func(i: Nat): (DeveloperId, Developer) {
                                if (i == dev_idx) {
                                    (dev_id, updated_developer)
                                } else {
                                    developers[i]
                                }
                            }
                        );
                        developers := new_developers;
                    };
                };

                #ok(())
            };
        }
    };

    // =============================================================================
    // QUERY FUNCTIONS
    // =============================================================================

    public query func get_developer_info(developer_id: DeveloperId): async Result.Result<Developer, Text> {
        switch (Array.find(developers, func((id, _): (DeveloperId, Developer)): Bool {
            Principal.equal(id, developer_id)
        })) {
            case (null) {
                #err("Developer not found")
            };
            case (?(_, developer)) {
                #ok(developer)
            };
        }
    };

    public query func get_registry_stats(): async {
        total_developers: Nat;
        active_developers: Nat;
        community_users: Nat;
        enterprise_users: Nat;
        beta_users: Nat;
        total_api_keys: Nat;
        total_subscriptions: Nat;
    } {
        let community_devs = Array.filter(developers, func((_, dev): (DeveloperId, Developer)): Bool { dev.tier == #Community });
        let enterprise_devs = Array.filter(developers, func((_, dev): (DeveloperId, Developer)): Bool { dev.tier == #Enterprise });
        let beta_devs = Array.filter(developers, func((_, dev): (DeveloperId, Developer)): Bool { dev.tier == #Beta });
        let active_devs = Array.filter(developers, func((_, dev): (DeveloperId, Developer)): Bool { dev.is_active });

        var total_subs = 0;
        for ((_, dev) in developers.vals()) {
            total_subs += dev.usage_stats.subscriptions_active;
        };

        {
            total_developers = developers.size();
            active_developers = active_devs.size();
            community_users = community_devs.size();
            enterprise_users = enterprise_devs.size();
            beta_users = beta_devs.size();
            total_api_keys = api_keys.size();
            total_subscriptions = total_subs;
        }
    };

    public query func get_admins(): async [Principal] {
        admins
    };

    // =============================================================================
    // PRIVATE HELPER FUNCTIONS
    // =============================================================================

    private func isAdmin(caller: Principal): Bool {
        Array.find(admins, func(admin: Principal): Bool { Principal.equal(admin, caller) }) != null
    };

    private func generate_api_key(): ApiKey {
        // Generate a secure API key - simplified version
        let prefix = "ouro_";
        let timestamp = Nat.toText(Int.abs(Time.now() / 1_000_000_000)); // Convert to seconds
        let random_num = Nat.toText(Int.abs(Time.now()) % 1000000);
        let checksum = Nat.toText(Int.abs(Time.now()) % 10000);

        prefix # timestamp # "_" # random_num # "_" # checksum
    };

    private func get_rate_limit_for_tier(tier: LicenseTier): Nat {
        switch (tier) {
            case (#Community) { COMMUNITY_RATE_LIMIT };
            case (#Enterprise) { ENTERPRISE_RATE_LIMIT };
            case (#Beta) { BETA_RATE_LIMIT };
        }
    };
}