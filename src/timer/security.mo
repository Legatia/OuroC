import Text "mo:base/Text";
import Time "mo:base/Time";
import Map "mo:base/HashMap";
import Result "mo:base/Result";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Option "mo:base/Option";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";

module Security {

    // Types for security system
    public type SolanaAddress = Text;
    public type Timestamp = Int;
    public type SessionToken = Text;
    public type MessageSignature = Blob;
    public type Nonce = Text;
    public type IPAddress = Text;

    // Permission levels
    public type Permission = {
        #ReadSubscriptions;
        #CreateSubscription;
        #ModifySubscription;
        #DeleteSubscription;
        #ConfigureNotifications;
        #ViewHealth;
        #EmergencyPause;
    };

    // User authentication info
    public type AuthenticatedUser = {
        solana_address: SolanaAddress;
        permissions: [Permission];
        session_token: SessionToken;
        expires_at: Timestamp;
        nonce_used: [Nonce];
        rate_limit_remaining: Nat;
        last_request_time: Timestamp;
    };

    // Authentication request format
    public type AuthRequest = {
        solana_address: SolanaAddress;
        message: Text;
        signature: MessageSignature;
        nonce: Nonce;
        requested_permissions: [Permission];
    };

    // Security configuration
    public type SecurityConfig = {
        session_duration_minutes: Nat;
        rate_limit_per_minute: Nat;
        allowed_npm_versions: [Text];
        require_signature_auth: Bool;
        emergency_pause_enabled: Bool;
        // Phase 1 enhancements
        global_rate_limit_per_minute: Nat;
        max_failed_attempts_before_backoff: Nat;
        backoff_multiplier: Float;
        max_backoff_seconds: Nat;
    };

    // Error types
    public type SecurityError = {
        #Unauthorized;
        #InvalidSignature;
        #SessionExpired;
        #RateLimitExceeded;
        #InvalidNpmVersion;
        #InsufficientPermissions;
        #NonceAlreadyUsed;
        #InvalidMessage;
        #TemporarilyBlocked;
        #GlobalRateLimitExceeded;
    };

    // Reputation tracking
    public type ReputationScore = {
        score: Int;
        successful_auths: Nat;
        failed_auths: Nat;
        total_requests: Nat;
        successful_operations: Nat;
        failed_operations: Nat;
        last_updated: Timestamp;
        created_at: Timestamp;
    };

    // Backoff tracking
    public type BackoffState = {
        failed_attempts: Nat;
        blocked_until: Timestamp;
        backoff_duration: Nat; // in seconds
    };

    // IP rate limiting
    public type IPRateLimit = {
        requests_this_minute: Nat;
        window_start: Timestamp;
    };

    // Global rate limiting
    public type GlobalRateLimit = {
        total_requests: Nat;
        window_start: Timestamp;
    };

    public class SecurityManager(config: SecurityConfig) {

        private var authenticated_users = Map.HashMap<SolanaAddress, AuthenticatedUser>(10, Text.equal, Text.hash);
        private var global_nonces = Map.HashMap<Nonce, Timestamp>(50, Text.equal, Text.hash);
        private var security_config = config;

        // Phase 1: Enhanced security tracking
        private var user_reputation = Map.HashMap<SolanaAddress, ReputationScore>(50, Text.equal, Text.hash);
        private var backoff_states = Map.HashMap<SolanaAddress, BackoffState>(20, Text.equal, Text.hash);
        private var ip_rate_limits = Map.HashMap<IPAddress, IPRateLimit>(100, Text.equal, Text.hash);
        private var global_rate_limit: GlobalRateLimit = {
            total_requests = 0;
            window_start = Time.now();
        };

        // =============================================================================
        // PHASE 1: ENHANCED RATE LIMITING & PROTECTION
        // =============================================================================

        // Check global rate limit
        private func check_global_rate_limit(): Result.Result<(), SecurityError> {
            let now = Time.now();
            let one_minute = 60_000_000_000; // 60 seconds in nanoseconds

            // Reset window if expired
            if (now - global_rate_limit.window_start > one_minute) {
                global_rate_limit := {
                    total_requests = 1;
                    window_start = now;
                };
                return #ok();
            };

            // Check limit
            if (global_rate_limit.total_requests >= security_config.global_rate_limit_per_minute) {
                Debug.print("SECURITY: Global rate limit exceeded - " # Nat.toText(global_rate_limit.total_requests) # " requests");
                return #err(#GlobalRateLimitExceeded);
            };

            // Increment counter
            global_rate_limit := {
                total_requests = global_rate_limit.total_requests + 1;
                window_start = global_rate_limit.window_start;
            };

            #ok()
        };

        // Check IP-based rate limit
        private func check_ip_rate_limit(ip_address: ?IPAddress): Result.Result<(), SecurityError> {
            switch (ip_address) {
                case null { #ok() }; // No IP provided, skip check
                case (?ip) {
                    let now = Time.now();
                    let one_minute = 60_000_000_000;

                    let current_limit = switch (ip_rate_limits.get(ip)) {
                        case null {
                            // First request from this IP
                            {
                                requests_this_minute = 1;
                                window_start = now;
                            }
                        };
                        case (?limit) {
                            // Reset window if expired
                            if (now - limit.window_start > one_minute) {
                                {
                                    requests_this_minute = 1;
                                    window_start = now;
                                }
                            } else {
                                // Check if limit exceeded (stricter than per-user limit)
                                let ip_limit = security_config.rate_limit_per_minute / 2; // 50% of user limit
                                if (limit.requests_this_minute >= ip_limit) {
                                    Debug.print("SECURITY: IP rate limit exceeded for " # ip);
                                    return #err(#RateLimitExceeded);
                                };
                                {
                                    requests_this_minute = limit.requests_this_minute + 1;
                                    window_start = limit.window_start;
                                }
                            }
                        };
                    };

                    ip_rate_limits.put(ip, current_limit);
                    #ok()
                };
            }
        };

        // Check if user is temporarily blocked (exponential backoff)
        private func check_backoff_status(solana_address: SolanaAddress): Result.Result<(), SecurityError> {
            switch (backoff_states.get(solana_address)) {
                case null { #ok() };
                case (?state) {
                    let now = Time.now();
                    if (now < state.blocked_until) {
                        let remaining_seconds = (state.blocked_until - now) / 1_000_000_000;
                        Debug.print("SECURITY: User " # solana_address # " blocked for " # Int.toText(remaining_seconds) # " more seconds");
                        return #err(#TemporarilyBlocked);
                    };
                    // Backoff expired, clear it
                    backoff_states.delete(solana_address);
                    #ok()
                };
            }
        };

        // Record failed authentication and apply exponential backoff
        private func record_auth_failure(solana_address: SolanaAddress) {
            let now = Time.now();

            // Update reputation
            update_reputation_on_failure(solana_address, true);

            // Get or create backoff state
            let current_state = switch (backoff_states.get(solana_address)) {
                case null {
                    {
                        failed_attempts = 1;
                        blocked_until = now;
                        backoff_duration = 0;
                    }
                };
                case (?state) {
                    {
                        failed_attempts = state.failed_attempts + 1;
                        blocked_until = state.blocked_until;
                        backoff_duration = state.backoff_duration;
                    }
                };
            };

            // Apply exponential backoff if threshold exceeded
            if (current_state.failed_attempts >= security_config.max_failed_attempts_before_backoff) {
                // Calculate backoff: base * (multiplier ^ attempts)
                let base_backoff: Float = 2.0; // Start with 2 seconds
                let attempts_over_threshold: Nat = Nat.sub(current_state.failed_attempts, security_config.max_failed_attempts_before_backoff);

                var backoff_seconds: Float = base_backoff;
                var i = 0;
                while (i < attempts_over_threshold) {
                    backoff_seconds := backoff_seconds * security_config.backoff_multiplier;
                    i += 1;
                };

                // Cap at max backoff
                let max_backoff_float = Float.fromInt(security_config.max_backoff_seconds);
                if (backoff_seconds > max_backoff_float) {
                    backoff_seconds := max_backoff_float;
                };

                let backoff_nanos = Int.abs(Float.toInt(backoff_seconds * 1_000_000_000.0));

                Debug.print("SECURITY: Applying exponential backoff to " # solana_address # " for " # Float.toText(backoff_seconds) # " seconds");

                backoff_states.put(solana_address, {
                    failed_attempts = current_state.failed_attempts;
                    blocked_until = now + backoff_nanos;
                    backoff_duration = Int.abs(Float.toInt(backoff_seconds));
                });
            } else {
                backoff_states.put(solana_address, current_state);
            };
        };

        // Clear backoff on successful authentication
        private func clear_backoff(solana_address: SolanaAddress) {
            backoff_states.delete(solana_address);
        };

        // Initialize or get reputation score
        private func get_reputation(solana_address: SolanaAddress): ReputationScore {
            switch (user_reputation.get(solana_address)) {
                case (?score) score;
                case null {
                    let now = Time.now();
                    let initial_score: ReputationScore = {
                        score = 100; // Start with neutral reputation
                        successful_auths = 0;
                        failed_auths = 0;
                        total_requests = 0;
                        successful_operations = 0;
                        failed_operations = 0;
                        last_updated = now;
                        created_at = now;
                    };
                    user_reputation.put(solana_address, initial_score);
                    initial_score
                };
            }
        };

        // Update reputation on successful operation
        private func update_reputation_on_success(solana_address: SolanaAddress, is_auth: Bool) {
            let current = get_reputation(solana_address);
            let now = Time.now();

            let updated: ReputationScore = {
                score = current.score + 2; // +2 for success
                successful_auths = if (is_auth) current.successful_auths + 1 else current.successful_auths;
                failed_auths = current.failed_auths;
                total_requests = current.total_requests + 1;
                successful_operations = current.successful_operations + 1;
                failed_operations = current.failed_operations;
                last_updated = now;
                created_at = current.created_at;
            };

            user_reputation.put(solana_address, updated);
        };

        // Update reputation on failure
        private func update_reputation_on_failure(solana_address: SolanaAddress, is_auth: Bool) {
            let current = get_reputation(solana_address);
            let now = Time.now();

            let updated: ReputationScore = {
                score = current.score - 5; // -5 for failure (more penalty)
                successful_auths = current.successful_auths;
                failed_auths = if (is_auth) current.failed_auths + 1 else current.failed_auths;
                total_requests = current.total_requests + 1;
                successful_operations = current.successful_operations;
                failed_operations = current.failed_operations + 1;
                last_updated = now;
                created_at = current.created_at;
            };

            user_reputation.put(solana_address, updated);

            // Log reputation drops
            if (updated.score < 0) {
                Debug.print("SECURITY: Low reputation detected for " # solana_address # " (score: " # Int.toText(updated.score) # ")");
            };
        };

        // Calculate reputation score
        private func _calculate_reputation_score(solana_address: SolanaAddress): Int {
            let rep = get_reputation(solana_address);
            rep.score
        };

        // Generate authentication challenge
        public func generate_auth_challenge(solana_address: SolanaAddress): {nonce: Nonce; message: Text; expires_at: Timestamp} {
            let now = Time.now();
            let nonce = generate_nonce(solana_address, now);
            let expires_at = now + (5 * 60 * 1_000_000_000); // 5 minutes

            let message = "OuroC Authentication\n" #
                         "Address: " # solana_address # "\n" #
                         "Nonce: " # nonce # "\n" #
                         "Timestamp: " # Int.toText(now) # "\n" #
                         "Please sign this message to authenticate with OuroC canister.";

            // Store nonce temporarily
            global_nonces.put(nonce, expires_at);

            {nonce; message; expires_at}
        };

        // Authenticate user with signed message (ENHANCED with Phase 1 protections)
        public func authenticate_user(auth_request: AuthRequest, ip_address: ?IPAddress): Result.Result<SessionToken, SecurityError> {
            // Phase 1 Check 1: Global rate limit
            switch (check_global_rate_limit()) {
                case (#err(e)) { return #err(e) };
                case (#ok()) {};
            };

            // Phase 1 Check 2: IP-based rate limit
            switch (check_ip_rate_limit(ip_address)) {
                case (#err(e)) { return #err(e) };
                case (#ok()) {};
            };

            // Phase 1 Check 3: Exponential backoff for repeated failures
            switch (check_backoff_status(auth_request.solana_address)) {
                case (#err(e)) { return #err(e) };
                case (#ok()) {};
            };

            // Verify nonce is valid and not expired
            switch (global_nonces.get(auth_request.nonce)) {
                case null {
                    record_auth_failure(auth_request.solana_address);
                    return #err(#InvalidMessage);
                };
                case (?expires_at) {
                    if (Time.now() > expires_at) {
                        global_nonces.delete(auth_request.nonce);
                        record_auth_failure(auth_request.solana_address);
                        return #err(#SessionExpired);
                    };
                };
            };

            // Verify signature (DEVNET: bypassed, see verify_solana_signature for details)
            if (not verify_solana_signature(auth_request)) {
                record_auth_failure(auth_request.solana_address);
                return #err(#InvalidSignature);
            };

            // Authentication successful!
            // Clear backoff and update reputation
            clear_backoff(auth_request.solana_address);
            update_reputation_on_success(auth_request.solana_address, true);

            // Generate session token
            let session_token = generate_session_token(auth_request.solana_address);
            let now = Time.now();

            let user: AuthenticatedUser = {
                solana_address = auth_request.solana_address;
                permissions = filter_allowed_permissions(auth_request.requested_permissions);
                session_token = session_token;
                expires_at = now + (security_config.session_duration_minutes * 60 * 1_000_000_000);
                nonce_used = [auth_request.nonce];
                rate_limit_remaining = security_config.rate_limit_per_minute;
                last_request_time = now;
            };

            authenticated_users.put(auth_request.solana_address, user);
            global_nonces.delete(auth_request.nonce);

            Debug.print("SECURITY: Successful authentication for " # auth_request.solana_address);
            #ok(session_token)
        };

        // Validate request permissions (ENHANCED with Phase 1 checks)
        public func validate_request(
            solana_address: SolanaAddress,
            session_token: SessionToken,
            required_permission: Permission,
            npm_version: ?Text,
            ip_address: ?IPAddress
        ): Result.Result<(), SecurityError> {

            // Phase 1 Check 1: Global rate limit
            switch (check_global_rate_limit()) {
                case (#err(e)) { return #err(e) };
                case (#ok()) {};
            };

            // Phase 1 Check 2: IP-based rate limit
            switch (check_ip_rate_limit(ip_address)) {
                case (#err(e)) { return #err(e) };
                case (#ok()) {};
            };

            // Phase 1 Check 3: Check backoff status
            switch (check_backoff_status(solana_address)) {
                case (#err(e)) { return #err(e) };
                case (#ok()) {};
            };

            // Check npm version if provided
            switch (npm_version) {
                case (?version) {
                    if (not is_allowed_npm_version(version)) {
                        update_reputation_on_failure(solana_address, false);
                        return #err(#InvalidNpmVersion);
                    };
                };
                case null {};
            };

            // Get user session
            switch (authenticated_users.get(solana_address)) {
                case null {
                    update_reputation_on_failure(solana_address, false);
                    return #err(#Unauthorized);
                };
                case (?user) {
                    let now = Time.now();

                    // Check session expiry
                    if (now > user.expires_at) {
                        authenticated_users.delete(solana_address);
                        update_reputation_on_failure(solana_address, false);
                        return #err(#SessionExpired);
                    };

                    // Verify session token
                    if (user.session_token != session_token) {
                        update_reputation_on_failure(solana_address, false);
                        return #err(#Unauthorized);
                    };

                    // Check rate limiting
                    let time_since_last = now - user.last_request_time;
                    if (time_since_last < 60_000_000_000 and user.rate_limit_remaining <= 0) { // 1 minute
                        update_reputation_on_failure(solana_address, false);
                        return #err(#RateLimitExceeded);
                    };

                    // Check permissions
                    if (not has_permission(user.permissions, required_permission)) {
                        update_reputation_on_failure(solana_address, false);
                        return #err(#InsufficientPermissions);
                    };

                    // Request validated - update reputation positively
                    update_reputation_on_success(solana_address, false);

                    // Update rate limit and last request time
                    let updated_user = {
                        user with
                        rate_limit_remaining = if (time_since_last >= 60_000_000_000) {
                            Nat.sub(security_config.rate_limit_per_minute, 1)
                        } else {
                            if (user.rate_limit_remaining > 0) Nat.sub(user.rate_limit_remaining, 1) else 0
                        };
                        last_request_time = now;
                    };
                    authenticated_users.put(solana_address, updated_user);

                    #ok()
                };
            };
        };

        // Revoke session
        public func revoke_session(solana_address: SolanaAddress): Bool {
            switch (authenticated_users.remove(solana_address)) {
                case null false;
                case (?_) true;
            };
        };

        // Clean expired sessions
        public func cleanup_expired_sessions(): Nat {
            let now = Time.now();
            var cleaned = 0;

            let entries = Iter.toArray(authenticated_users.entries());
            for ((address, user) in entries.vals()) {
                if (now > user.expires_at) {
                    authenticated_users.delete(address);
                    cleaned += 1;
                };
            };

            // Clean expired nonces
            let nonce_entries = Iter.toArray(global_nonces.entries());
            for ((nonce, expires_at) in nonce_entries.vals()) {
                if (now > expires_at) {
                    global_nonces.delete(nonce);
                };
            };

            cleaned
        };

        // Get user info (for debugging/admin)
        public func get_user_info(solana_address: SolanaAddress): ?{
            permissions: [Permission];
            expires_at: Timestamp;
            rate_limit_remaining: Nat;
        } {
            switch (authenticated_users.get(solana_address)) {
                case null null;
                case (?user) ?{
                    permissions = user.permissions;
                    expires_at = user.expires_at;
                    rate_limit_remaining = user.rate_limit_remaining;
                };
            };
        };

        // =============================================================================
        // PHASE 1: PUBLIC QUERY FUNCTIONS
        // =============================================================================

        // Get reputation score for an address
        public func get_reputation_score(solana_address: SolanaAddress): ?ReputationScore {
            user_reputation.get(solana_address)
        };

        // Get backoff status for an address
        public func get_backoff_status(solana_address: SolanaAddress): ?{
            failed_attempts: Nat;
            blocked_until: Timestamp;
            is_blocked: Bool;
            remaining_seconds: Int;
        } {
            switch (backoff_states.get(solana_address)) {
                case null null;
                case (?state) {
                    let now = Time.now();
                    let is_blocked = now < state.blocked_until;
                    let remaining_seconds = if (is_blocked) {
                        (state.blocked_until - now) / 1_000_000_000
                    } else {
                        0
                    };
                    ?{
                        failed_attempts = state.failed_attempts;
                        blocked_until = state.blocked_until;
                        is_blocked = is_blocked;
                        remaining_seconds = remaining_seconds;
                    }
                };
            }
        };

        // Get security statistics
        public func get_security_stats(): {
            total_authenticated_users: Nat;
            total_reputation_tracked: Nat;
            active_backoffs: Nat;
            global_requests_this_minute: Nat;
            tracked_ips: Nat;
        } {
            let now = Time.now();

            // Count active backoffs
            var active_backoffs = 0;
            for ((_, state) in backoff_states.entries()) {
                if (now < state.blocked_until) {
                    active_backoffs += 1;
                };
            };

            {
                total_authenticated_users = authenticated_users.size();
                total_reputation_tracked = user_reputation.size();
                active_backoffs = active_backoffs;
                global_requests_this_minute = global_rate_limit.total_requests;
                tracked_ips = ip_rate_limits.size();
            }
        };

        // Manual reputation adjustment (admin function)
        public func adjust_reputation(solana_address: SolanaAddress, adjustment: Int): Bool {
            switch (user_reputation.get(solana_address)) {
                case null false;
                case (?current) {
                    let updated: ReputationScore = {
                        current with
                        score = current.score + adjustment;
                        last_updated = Time.now();
                    };
                    user_reputation.put(solana_address, updated);
                    Debug.print("ADMIN: Adjusted reputation for " # solana_address # " by " # Int.toText(adjustment));
                    true
                };
            }
        };

        // Clear backoff manually (admin emergency function)
        public func clear_backoff_admin(solana_address: SolanaAddress): Bool {
            switch (backoff_states.remove(solana_address)) {
                case null false;
                case (?_) {
                    Debug.print("ADMIN: Cleared backoff for " # solana_address);
                    true
                };
            }
        };

        // Clean up old IP rate limits
        public func cleanup_ip_rate_limits(): Nat {
            let now = Time.now();
            let one_hour = 3600_000_000_000; // 1 hour in nanoseconds
            var cleaned = 0;

            let entries = Iter.toArray(ip_rate_limits.entries());
            for ((ip, limit) in entries.vals()) {
                if (now - limit.window_start > one_hour) {
                    ip_rate_limits.delete(ip);
                    cleaned += 1;
                };
            };

            cleaned
        };

        // Private helper functions
        private func generate_nonce(address: SolanaAddress, timestamp: Timestamp): Nonce {
            // Simple nonce generation - in production would use proper randomness
            Int.toText(timestamp) # "_" # Nat.toText(Text.size(address)) # "_nonce"
        };

        private func generate_session_token(address: SolanaAddress): SessionToken {
            // Simple token generation - in production would use cryptographically secure random
            "session_" # address # "_" # Int.toText(Time.now())
        };

        private func verify_solana_signature(_auth_request: AuthRequest): Bool {
            // DEVNET: Signature verification bypassed for testing
            //
            // PRODUCTION: Must implement Ed25519 signature verification
            // 1. Extract message from _auth_request
            // 2. Verify Ed25519 signature against Solana public key
            // 3. Check timestamp to prevent replay attacks
            //
            // For devnet/testing: Allow all requests
            // WARNING: Must implement proper verification before mainnet
            true
        };

        private func filter_allowed_permissions(requested: [Permission]): [Permission] {
            // Filter permissions based on security policy
            // For now, allow all requested permissions, but in production
            // this would enforce permission policies
            requested
        };

        private func has_permission(user_permissions: [Permission], required: Permission): Bool {
            Array.find<Permission>(user_permissions, func(p) { p == required }) != null
        };

        private func is_allowed_npm_version(version: Text): Bool {
            Array.find<Text>(security_config.allowed_npm_versions, func(v) { v == version }) != null
        };
    };
}