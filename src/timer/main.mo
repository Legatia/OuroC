import Timer "mo:base/Timer";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Map "mo:base/HashMap";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Solana "./solana";
import CycleManagement "./cycle_management";
import Authorization "./authorization";

persistent actor OuroCTimer {

    // =============================================================================
    // CONSTANTS & VALIDATION LIMITS
    // =============================================================================

    private let MAX_AMOUNT_USDC: Nat64 = 1_000_000_000_000; // 1M USDC (6 decimals)
    private let MIN_INTERVAL_SECONDS: Nat64 = 3600; // 1 hour minimum (prevents spam)
    private let MAX_INTERVAL_SECONDS: Nat64 = 31536000; // 1 year maximum
    private let MAX_SUBSCRIPTIONS_PER_PRINCIPAL: Nat = 100;
    private let MAX_TOTAL_SUBSCRIPTIONS: Nat = 10000;
    private let SUBSCRIPTION_ID_MAX_LENGTH: Nat = 64;
    private let SUBSCRIPTION_ID_MIN_LENGTH: Nat = 4;

    // Failure handling constants
    private let MAX_CONSECUTIVE_FAILURES: Nat = 10; // Auto-pause after this many failures
    private let EXPONENTIAL_BACKOFF_BASE: Nat64 = 2; // 2x multiplier per failure
    private let MAX_BACKOFF_MULTIPLIER: Nat64 = 16; // Cap at 16x normal interval

    // Types
    public type SubscriptionId = Text;
    public type SolanaAddress = Text;
    public type Timestamp = Int;

    public type SubscriptionStatus = {
        #Active;
        #Paused;
        #Cancelled;
        #Expired;
    };

    // Minimalistic subscription timer - ICP only tracks WHEN to trigger, Solana has WHAT data
    public type Subscription = {
        id: SubscriptionId;
        solana_contract_address: SolanaAddress; // Deployed Solana program address
        payment_token_mint: Text;               // Token mint to determine opcode (0=USDC, 1=other)
        reminder_days_before_payment: Nat;      // Days before payment to send notification (opcode 2)
        interval_seconds: Nat64;                // Payment interval
        next_execution: Timestamp;              // Next trigger time
        status: SubscriptionStatus;             // Timer status
        created_at: Timestamp;
        last_triggered: ?Timestamp;
        trigger_count: Nat;
        // Failure tracking
        failed_payment_count: Nat;              // Consecutive failures
        last_failure_time: ?Timestamp;          // When last failure occurred
        last_error: ?Text;                      // Last error message
    };

    public type CreateSubscriptionRequest = {
        subscription_id: Text;                  // Must match Solana subscription ID
        solana_contract_address: SolanaAddress; // Deployed Solana program address
        payment_token_mint: Text;               // Token mint address (to determine opcode 0=USDC, 1=other)
        amount: Nat64;                          // Subscription amount (for validation only)
        subscriber_address: SolanaAddress;      // Subscriber's wallet address
        merchant_address: SolanaAddress;        // Merchant's wallet address
        reminder_days_before_payment: Nat;      // Days before payment to send notification
        interval_seconds: Nat64;                // Payment interval in seconds
        start_time: ?Timestamp;                 // Optional start time (defaults to now + interval)
    };

    // State
    private transient var subscriptions = Map.HashMap<SubscriptionId, Subscription>(10, Text.equal, Text.hash);
    private transient var active_timers = Map.HashMap<SubscriptionId, Timer.TimerId>(10, Text.equal, Text.hash);

    // Authorization
    private transient let authManager = Authorization.AuthorizationManager();
    private var auth_initialized = false;

    // Enhanced Solana integration with Threshold Ed25519
    // Network configuration
    public type NetworkEnvironment = {
        #Mainnet;
        #Devnet;
        #Testnet;
    };

    private var network_env: NetworkEnvironment = #Devnet; // Start with devnet for safety
    private var ed25519_key_name: Text = "test_key_1"; // Will be set to Ed25519:key_1 for mainnet
    private var solana_rpc_endpoint: Text = "https://api.devnet.solana.com";
    private transient var solana_client: ?Solana.SolanaClient = null;
    private transient var is_initialized: Bool = false;

    // Cycle management
    private transient var cycle_manager: ?CycleManagement.CycleManager = null;
    private var auto_cycle_refill: Bool = true;
    private var cycle_threshold: Nat = 5_000_000_000_000; // 5T cycles threshold

    // Fee and wallet addresses
    private var main_wallet_address: Text = "";
    private var fee_collection_address: Text = "";

    // Stable storage for upgrades
    private var stable_subscriptions: [(SubscriptionId, Subscription)] = [];

    system func preupgrade() {
        stable_subscriptions := Iter.toArray(subscriptions.entries());
    };

    system func postupgrade() {
        // Initialize authorization with deployer as first admin
        if (not auth_initialized) {
            let deployer = Principal.fromActor(OuroCTimer);
            authManager.initWithDeployer(deployer);
            auth_initialized := true;
            Debug.print("Authorization initialized. Deployer: " # Principal.toText(deployer));
        };

        stable_subscriptions := [];
        for ((id, sub) in stable_subscriptions.vals()) {
            subscriptions.put(id, sub);
            if (sub.status == #Active) {
                ignore schedule_subscription_timer<system>(sub);
            };
        };
        // Initialize components
        let rpc_config: Solana.SolanaRpcConfig = {
            endpoint = solana_rpc_endpoint;
            commitment = "confirmed";
        };
        solana_client := ?Solana.SolanaClient(ed25519_key_name, rpc_config);
        cycle_manager := ?CycleManagement.CycleManager(cycle_threshold, auto_cycle_refill);
    };

    // Public functions

    // =============================================================================
    // CANISTER INITIALIZATION
    // =============================================================================

    /// Set the network environment (MUST be called before initialization)
    /// Only callable before canister is initialized to prevent accidental network switches
    public func set_network(network: NetworkEnvironment): async Result.Result<(), Text> {
        if (is_initialized) {
            return #err("Cannot change network after initialization");
        };

        network_env := network;

        // Update RPC endpoint and key name based on network
        switch (network) {
            case (#Mainnet) {
                solana_rpc_endpoint := "https://api.mainnet-beta.solana.com";
                ed25519_key_name := "Ed25519:key_1"; // Production key
            };
            case (#Devnet) {
                solana_rpc_endpoint := "https://api.devnet.solana.com";
                ed25519_key_name := "test_key_1"; // Test key for devnet
            };
            case (#Testnet) {
                solana_rpc_endpoint := "https://api.testnet.solana.com";
                ed25519_key_name := "test_key_1"; // Test key for testnet
            };
        };

        Debug.print("Network set to " # debug_show(network) # " with endpoint: " # solana_rpc_endpoint);
        #ok()
    };

    /// Get current network configuration
    public query func get_network_config(): async {
        network: NetworkEnvironment;
        rpc_endpoint: Text;
        key_name: Text;
    } {
        {
            network = network_env;
            rpc_endpoint = solana_rpc_endpoint;
            key_name = ed25519_key_name;
        }
    };

    // Initialize the canister with Threshold Ed25519 wallets
    public func initialize_canister(): async Result.Result<{main_address: Text; fee_address: Text}, Text> {
        if (is_initialized) {
            return #ok({main_address = main_wallet_address; fee_address = fee_collection_address});
        };

        // Initialize Solana client if not already done
        switch (solana_client) {
            case null {
                let rpc_config: Solana.SolanaRpcConfig = {
                    endpoint = solana_rpc_endpoint;
                    commitment = "confirmed";
                };
                solana_client := ?Solana.SolanaClient(ed25519_key_name, rpc_config);
            };
            case (?_) {};
        };

        // Initialize cycle manager if not already done
        switch (cycle_manager) {
            case null {
                cycle_manager := ?CycleManagement.CycleManager(cycle_threshold, auto_cycle_refill);
            };
            case (?_) {};
        };


        switch (solana_client) {
            case (?client) {
                let init_result = await client.initialize();
                switch (init_result) {
                    case (#ok(addresses)) {
                        main_wallet_address := addresses.main_address;
                        fee_collection_address := addresses.fee_address;
                        is_initialized := true;
                        Debug.print("Canister initialized with wallets - Main: " # addresses.main_address # ", Fee: " # addresses.fee_address);
                        #ok(addresses)
                    };
                    case (#err(error)) {
                        #err("Failed to initialize Solana wallets: " # error)
                    };
                }
            };
            case null {
                #err("Solana client not available")
            };
        }
    };

    public func create_subscription(req: CreateSubscriptionRequest): async Result.Result<SubscriptionId, Text> {
        // 1. Rate limiting - check total subscriptions
        if (subscriptions.size() >= MAX_TOTAL_SUBSCRIPTIONS) {
            return #err("Maximum total subscriptions reached");
        };

        // 2. Validate subscription ID
        let id_len = Text.size(req.subscription_id);
        if (id_len < SUBSCRIPTION_ID_MIN_LENGTH) {
            return #err("Subscription ID too short (min " # Nat.toText(SUBSCRIPTION_ID_MIN_LENGTH) # " chars)");
        };
        if (id_len > SUBSCRIPTION_ID_MAX_LENGTH) {
            return #err("Subscription ID too long (max " # Nat.toText(SUBSCRIPTION_ID_MAX_LENGTH) # " chars)");
        };

        // Validate ID contains only alphanumeric, dash, underscore
        if (not is_valid_subscription_id(req.subscription_id)) {
            return #err("Subscription ID must be alphanumeric with - or _ only");
        };

        // 3. Validate interval
        if (req.interval_seconds < MIN_INTERVAL_SECONDS) {
            return #err("Minimum interval is " # Nat64.toText(MIN_INTERVAL_SECONDS) # " seconds (1 hour)");
        };
        if (req.interval_seconds > MAX_INTERVAL_SECONDS) {
            return #err("Maximum interval is " # Nat64.toText(MAX_INTERVAL_SECONDS) # " seconds (1 year)");
        };

        // 4. Validate amount (assuming USDC with 6 decimals)
        if (req.amount == 0) {
            return #err("Amount must be greater than 0");
        };
        if (req.amount > MAX_AMOUNT_USDC) {
            return #err("Amount exceeds maximum allowed (1M USDC)");
        };

        // 5. Validate Solana addresses
        if (not Solana.is_valid_solana_address(req.solana_contract_address)) {
            return #err("Invalid Solana contract address format");
        };
        if (not Solana.is_valid_solana_address(req.payment_token_mint)) {
            return #err("Invalid payment token mint address format");
        };
        if (not Solana.is_valid_solana_address(req.subscriber_address)) {
            return #err("Invalid subscriber address format");
        };
        if (not Solana.is_valid_solana_address(req.merchant_address)) {
            return #err("Invalid merchant address format");
        };

        // 6. Check if subscription already exists
        switch (subscriptions.get(req.subscription_id)) {
            case (?_) {
                return #err("Subscription ID already exists");
            };
            case null {};
        };

        // Ensure canister is initialized
        if (not is_initialized) {
            return #err("Canister not initialized. Call initialize_canister() first");
        };

        let id = req.subscription_id;
        let now = Time.now();
        let start_time = switch (req.start_time) {
            case (?time) time;
            case null now + Int64.toInt(Int64.fromNat64(req.interval_seconds) * 1_000_000_000);
        };

        let subscription: Subscription = {
            id = id;
            solana_contract_address = req.solana_contract_address;
            payment_token_mint = req.payment_token_mint;
            reminder_days_before_payment = req.reminder_days_before_payment;
            interval_seconds = req.interval_seconds;
            next_execution = start_time;
            status = #Active;
            created_at = now;
            last_triggered = null;
            trigger_count = 0;
            failed_payment_count = 0;
            last_failure_time = null;
            last_error = null;
        };

        subscriptions.put(id, subscription);
        ignore schedule_subscription_timer<system>(subscription);

        Debug.print("Created subscription timer: " # id # " for Solana contract: " # req.solana_contract_address);
        #ok(id)
    };

    public query func get_subscription(id: SubscriptionId): async ?Subscription {
        subscriptions.get(id)
    };

    public query func list_subscriptions(): async [Subscription] {
        Iter.toArray(subscriptions.vals())
    };

    public func pause_subscription(id: SubscriptionId): async Result.Result<(), Text> {
        switch (subscriptions.get(id)) {
            case (?sub) {
                let updated_sub = {
                    sub with status = #Paused
                };
                subscriptions.put(id, updated_sub);
                cancel_timer(id);
                #ok()
            };
            case null #err("Subscription not found");
        }
    };

    public func resume_subscription(id: SubscriptionId): async Result.Result<(), Text> {
        switch (subscriptions.get(id)) {
            case (?sub) {
                if (sub.status == #Paused) {
                    let now = Time.now();
                    let updated_sub = {
                        sub with
                        status = #Active;
                        next_execution = now + Int64.toInt(Int64.fromNat64(sub.interval_seconds) * 1_000_000_000);
                    };
                    subscriptions.put(id, updated_sub);
                    ignore schedule_subscription_timer<system>(updated_sub);
                    #ok()
                } else {
                    #err("Subscription is not paused")
                }
            };
            case null #err("Subscription not found");
        }
    };

    public func cancel_subscription(id: SubscriptionId): async Result.Result<(), Text> {
        switch (subscriptions.get(id)) {
            case (?sub) {
                let updated_sub = {
                    sub with status = #Cancelled
                };
                subscriptions.put(id, updated_sub);
                cancel_timer(id);
                #ok()
            };
            case null #err("Subscription not found");
        }
    };

    /// Cleanup old cancelled/expired subscriptions to free memory
    /// Returns the number of subscriptions cleaned up
    public func cleanup_old_subscriptions(older_than_seconds: Nat64): async Nat {
        let now = Time.now();
        let cutoff_time = now - (Int64.toInt(Int64.fromNat64(older_than_seconds)) * 1_000_000_000);
        var cleanup_count: Nat = 0;

        // Collect IDs to remove (can't modify HashMap while iterating)
        let to_remove = Buffer.Buffer<SubscriptionId>(0);

        for ((id, sub) in subscriptions.entries()) {
            // Remove if cancelled/expired and old enough
            if ((sub.status == #Cancelled or sub.status == #Expired) and sub.next_execution < cutoff_time) {
                to_remove.add(id);
            };
        };

        // Remove collected subscriptions
        for (id in to_remove.vals()) {
            subscriptions.delete(id);
            cancel_timer(id); // Ensure timer is cancelled
            cleanup_count += 1;
        };

        Debug.print("Cleaned up " # Nat.toText(cleanup_count) # " old subscriptions");
        cleanup_count
    };

    // Private functions

    private func schedule_subscription_timer<system>(subscription: Subscription): Timer.TimerId {
        let now = Time.now();
        let delay_nanos = Int.abs(subscription.next_execution - now);
        let delay_seconds = delay_nanos / 1_000_000_000;

        Debug.print("Scheduling timer for subscription " # subscription.id # " in " # Int.toText(delay_seconds) # " seconds");

        let timer_id = Timer.setTimer<system>(
            #nanoseconds(delay_nanos),
            func(): async () {
                await trigger_subscription(subscription.id);
            }
        );

        active_timers.put(subscription.id, timer_id);
        timer_id
    };

    private func cancel_timer(subscription_id: SubscriptionId) {
        switch (active_timers.get(subscription_id)) {
            case (?timer_id) {
                Timer.cancelTimer(timer_id);
                active_timers.delete(subscription_id);
                Debug.print("Cancelled timer for subscription: " # subscription_id);
            };
            case null {};
        };
    };

    private func trigger_subscription(subscription_id: SubscriptionId): async () {
        Debug.print("Triggering subscription: " # subscription_id);

        switch (subscriptions.get(subscription_id)) {
            case (?sub) {
                if (sub.status == #Active) {
                    // Opcode 0: Payment (Solana decides swap vs direct)
                    let result = await send_solana_opcode(
                        sub.solana_contract_address,
                        subscription_id,
                        0 // Opcode 0 = Payment
                    );

                    let now = Time.now();
                    let next_execution = now + Int64.toInt(Int64.fromNat64(sub.interval_seconds) * 1_000_000_000);

                    switch (result) {
                        case (#ok(tx_hash)) {
                            // Success - reset failure count and schedule next
                            let updated_sub = {
                                sub with
                                next_execution = next_execution;
                                last_triggered = ?now;
                                trigger_count = sub.trigger_count + 1;
                                failed_payment_count = 0; // Reset on success
                                last_failure_time = null;
                                last_error = null;
                            };

                            subscriptions.put(subscription_id, updated_sub);
                            ignore schedule_subscription_timer<system>(updated_sub);

                            Debug.print("Payment trigger sent: " # tx_hash # ". Next: " # Int.toText(next_execution));
                        };
                        case (#err(error)) {
                            // Payment failed - increment failure count and apply exponential backoff
                            let new_failure_count = sub.failed_payment_count + 1;
                            Debug.print("Payment trigger failed (" # Nat.toText(new_failure_count) # "): " # error);

                            // Check if we should auto-pause
                            if (new_failure_count >= MAX_CONSECUTIVE_FAILURES) {
                                // Too many failures - pause subscription
                                let paused_sub = {
                                    sub with
                                    status = #Paused;
                                    failed_payment_count = new_failure_count;
                                    last_failure_time = ?now;
                                    last_error = ?error;
                                };
                                subscriptions.put(subscription_id, paused_sub);
                                cancel_timer(subscription_id);
                                Debug.print("Subscription " # subscription_id # " auto-paused after " # Nat.toText(MAX_CONSECUTIVE_FAILURES) # " failures");
                            } else {
                                // Apply exponential backoff
                                let backoff_multiplier = Nat64.min(
                                    EXPONENTIAL_BACKOFF_BASE ** Nat64.fromNat(new_failure_count),
                                    MAX_BACKOFF_MULTIPLIER
                                );
                                let backoff_interval = sub.interval_seconds * backoff_multiplier;
                                let backoff_next_execution = now + Int64.toInt(Int64.fromNat64(backoff_interval) * 1_000_000_000);

                                let updated_sub = {
                                    sub with
                                    next_execution = backoff_next_execution;
                                    failed_payment_count = new_failure_count;
                                    last_failure_time = ?now;
                                    last_error = ?error;
                                };
                                subscriptions.put(subscription_id, updated_sub);
                                ignore schedule_subscription_timer<system>(updated_sub);
                                Debug.print("Retrying with " # Nat64.toText(backoff_multiplier) # "x backoff. Next: " # Int.toText(backoff_next_execution));
                            };
                        };
                    };
                } else {
                    Debug.print("Subscription " # subscription_id # " is not active, skipping");
                }
            };
            case null {
                Debug.print("Subscription " # subscription_id # " not found");
            };
        };
    };

    // Send opcode-based transaction to Solana contract
    // Opcode 0: Payment (Solana decides swap vs direct USDC)
    // Opcode 1: Notification (send memo to subscriber)
    private func send_solana_opcode(
        contract_address: SolanaAddress,
        subscription_id: SubscriptionId,
        opcode: Nat8
    ): async Result.Result<Text, Text> {
        let opcode_name = if (opcode == 0) "Payment" else "Notification";
        Debug.print("Sending opcode " # Nat8.toText(opcode) # " (" # opcode_name # ") for subscription: " # subscription_id);

        switch (solana_client) {
            case (?client) {
                // Call Solana contract with opcode + subscription_id
                // Solana contract reads subscription PDA and handles routing
                let tx_result = await client.call_with_opcode(
                    contract_address,
                    subscription_id,
                    opcode
                );

                // Record cycle consumption
                switch (cycle_manager) {
                    case (?cm) {
                        cm.record_consumption(25_000_000_000);
                    };
                    case null {};
                };

                tx_result
            };
            case null {
                Debug.print("Solana client not initialized, simulation mode");
                #ok("simulated_tx_" # Nat8.toText(opcode) # "_" # Int.toText(Time.now()))
            };
        }
    };

    // Configuration and management functions

    public func get_wallet_addresses(): async Result.Result<{main: Text; fee_collection: Text}, Text> {
        if (not is_initialized) {
            #err("Canister not initialized")
        } else {
            #ok({main = main_wallet_address; fee_collection = fee_collection_address})
        }
    };

    public func get_wallet_balances(): async Result.Result<{main: Nat64; fee_collection: Nat64}, Text> {
        switch (solana_client) {
            case (?client) {
                await client.get_wallet_balances()
            };
            case null {
                #err("Solana client not initialized")
            };
        }
    };

    public func update_fee_config(new_config: Solana.FeeConfig): async Result.Result<(), Text> {
        switch (solana_client) {
            case (?client) {
                client.update_fee_config(new_config);
                #ok()
            };
            case null {
                #err("Solana client not initialized")
            };
        }
    };

    public func get_fee_config(): async Result.Result<Solana.FeeConfig, Text> {
        switch (solana_client) {
            case (?client) {
                #ok(client.get_fee_config())
            };
            case null {
                #err("Solana client not initialized")
            };
        }
    };

    // Cycle management functions
    public func get_cycle_status(): async CycleManagement.CycleReport {
        switch (cycle_manager) {
            case (?cm) {
                cm.check_cycle_status()
            };
            case null {
                {
                    current_balance = 0;
                    threshold_balance = cycle_threshold;
                    auto_refill_enabled = auto_cycle_refill;
                    last_refill = null;
                    total_consumed = 0;
                    total_refilled = 0;
                }
            };
        }
    };

    public func refill_cycles_from_fees(): async Result.Result<Nat, Text> {
        switch (solana_client, cycle_manager) {
            case (?client, ?cm) {
                let balance_result = await client.get_wallet_balances();
                switch (balance_result) {
                    case (#ok(balances)) {
                        if (balances.fee_collection > 10000) { // Minimum threshold
                            let conversion_rate = CycleManagement.calculate_conversion_rate(150.0, 15.0); // Mock prices
                            await cm.refill_from_solana_fees(balances.fee_collection, conversion_rate)
                        } else {
                            #err("Insufficient fee balance for cycle refill")
                        }
                    };
                    case (#err(error)) {
                        #err("Failed to get wallet balances: " # error)
                    };
                }
            };
            case _ {
                #err("Components not initialized")
            };
        }
    };

    public func set_cycle_threshold(new_threshold: Nat): async () {
        cycle_threshold := new_threshold;
        switch (cycle_manager) {
            case (?cm) {
                cm.set_cycle_threshold(new_threshold);
            };
            case null {};
        };
        Debug.print("Cycle threshold updated to: " # debug_show(new_threshold));
    };

    public func enable_auto_refill(enabled: Bool): async () {
        auto_cycle_refill := enabled;
        switch (cycle_manager) {
            case (?cm) {
                cm.enable_auto_refill(enabled);
            };
            case null {};
        };
    };

    // Monitor and potentially refill cycles
    public func monitor_cycles(): async Result.Result<Bool, Text> {
        switch (solana_client, cycle_manager) {
            case (?client, ?cm) {
                let balance_result = await client.get_wallet_balances();
                switch (balance_result) {
                    case (#ok(balances)) {
                        let conversion_rate = CycleManagement.calculate_conversion_rate(150.0, 15.0); // Mock prices
                        await cm.monitor_and_refill(balances.fee_collection, conversion_rate)
                    };
                    case (#err(error)) {
                        #err("Failed to check balances: " # error)
                    };
                }
            };
            case _ {
                #err("Components not initialized")
            };
        }
    };

    // Utility functions

    public query func get_canister_status(): async {
        total_subscriptions: Nat;
        active_subscriptions: Nat;
        active_timers: Nat;
        is_initialized: Bool;
        main_wallet: Text;
        fee_wallet: Text;
        ed25519_key_name: Text;
    } {
        let all_subs = Iter.toArray(subscriptions.vals());
        let active_subs = Array.filter(all_subs, func(sub: Subscription): Bool {
            sub.status == #Active
        });

        {
            total_subscriptions = all_subs.size();
            active_subscriptions = active_subs.size();
            active_timers = active_timers.size();
            is_initialized = is_initialized;
            main_wallet = main_wallet_address;
            fee_wallet = fee_collection_address;
            ed25519_key_name = ed25519_key_name;
        }
    };


    // =============================================================================
    // HEALTH MONITORING & FALLBACK FUNCTIONS
    // =============================================================================

    // Comprehensive canister health status
    public type CanisterHealth = {
        status: CanisterStatus;
        uptime_seconds: Nat;
        last_health_check: Timestamp;
        subscription_count: Nat;
        active_timers: Nat;
        failed_payments: Nat;
        cycle_balance: Nat;
        memory_usage: Nat;
        is_degraded: Bool;
        degradation_reason: ?Text;
    };

    public type CanisterStatus = {
        #Healthy;
        #Degraded;
        #Critical;
        #Offline;
    };

    // Track health metrics
    private var last_health_check: Timestamp = 0;
    private var canister_start_time: Timestamp = Time.now();
    private var failed_payment_count: Nat = 0;
    private var health_check_counter: Nat = 0;

    // Get comprehensive canister health status
    public query func get_canister_health(): async CanisterHealth {
        let now = Time.now();
        let uptime = Int.abs(now - canister_start_time) / 1_000_000_000; // Convert to seconds

        // Calculate cycle balance (simplified - would use Cycles.balance() in real implementation)
        let estimated_cycles = 1_000_000_000_000; // 1T cycles estimate

        // Determine canister status
        let (status, is_degraded, degradation_reason) = determine_health_status(estimated_cycles);

        // Update health check timestamp
        last_health_check := now;
        health_check_counter += 1;

        {
            status = status;
            uptime_seconds = uptime;
            last_health_check = now;
            subscription_count = subscriptions.size();
            active_timers = active_timers.size();
            failed_payments = failed_payment_count;
            cycle_balance = estimated_cycles;
            memory_usage = 0; // Would use debug_show(heap_size()) in real implementation
            is_degraded = is_degraded;
            degradation_reason = degradation_reason;
        }
    };

    // Determine overall health status based on various metrics
    private func determine_health_status(cycle_balance: Nat): (CanisterStatus, Bool, ?Text) {
        // Critical: Very low cycles
        if (cycle_balance < 100_000_000_000) { // < 100B cycles
            return (#Critical, true, ?"Critical: Very low cycle balance");
        };

        // Degraded: Low cycles or high failure rate
        if (cycle_balance < 500_000_000_000) { // < 500B cycles
            return (#Degraded, true, ?"Warning: Low cycle balance");
        };

        // Degraded: High failure rate
        if (failed_payment_count > 10) {
            return (#Degraded, true, ?"Warning: High payment failure rate");
        };

        // Degraded: Too many active subscriptions (performance impact)
        if (subscriptions.size() > 10000) {
            return (#Degraded, true, ?"Warning: High subscription load");
        };

        // Healthy
        (#Healthy, false, null)
    };

    // Get overdue subscriptions that need manual collection (timer auxiliary function)
    public query func get_overdue_subscriptions(): async [SubscriptionId] {
        let now = Time.now();
        let buffer = Buffer.Buffer<SubscriptionId>(0);

        for ((id, subscription) in subscriptions.entries()) {
            if (subscription.status == #Active and subscription.next_execution < now) {
                // Payment is overdue - this subscription needs manual collection
                buffer.add(id);
            };
        };

        Buffer.toArray(buffer)
    };

    // Health check ping - lightweight function for quick status check
    public query func ping(): async {status: Text; timestamp: Timestamp; version: Text} {
        {
            status = "ok";
            timestamp = Time.now();
            version = "1.0.0";
        }
    };

    // Get system metrics for monitoring
    public query func get_system_metrics(): async {
        total_subscriptions: Nat;
        active_subscriptions: Nat;
        paused_subscriptions: Nat;
        total_payments_processed: Nat;
        failed_payments: Nat;
        uptime_seconds: Nat;
        cycle_balance_estimate: Nat;
    } {
        let now = Time.now();
        let uptime = Int.abs(now - canister_start_time) / 1_000_000_000;

        let active_count = subscriptions.size(); // Simplified - would count active vs paused
        let paused_count = 0; // Would be calculated from subscription states

        {
            total_subscriptions = subscriptions.size();
            active_subscriptions = active_count;
            paused_subscriptions = paused_count;
            total_payments_processed = 0; // TODO: Track actual payment count
            failed_payments = failed_payment_count;
            uptime_seconds = uptime;
            cycle_balance_estimate = 1_000_000_000_000; // 1T cycles estimate
        }
    };

    // Emergency function to pause all subscriptions (if canister is in critical state)
    public func emergency_pause_all(): async Result.Result<Nat, Text> {
        var paused_count = 0;

        for ((sub_id, subscription) in subscriptions.entries()) {
            if (subscription.status == #Active) {
                let paused_subscription = {
                    subscription with status = #Paused;
                };
                subscriptions.put(sub_id, paused_subscription);
                paused_count += 1;

                // Cancel timer if exists
                switch (active_timers.get(sub_id)) {
                    case (?timer_id) {
                        Timer.cancelTimer(timer_id);
                        active_timers.delete(sub_id);
                    };
                    case null {};
                };
            };
        };

        Debug.print("EMERGENCY: Paused " # Int.toText(paused_count) # " subscriptions");
        #ok(paused_count)
    };

    // Function to gracefully resume operations after maintenance
    public func resume_operations(): async Result.Result<Nat, Text> {
        var resumed_count = 0;

        for ((sub_id, subscription) in subscriptions.entries()) {
            if (subscription.status == #Paused) {
                let resumed_subscription = {
                    subscription with status = #Active;
                };
                subscriptions.put(sub_id, resumed_subscription);

                // Reschedule timer
                ignore schedule_subscription_timer<system>(resumed_subscription);
                resumed_count += 1;
            };
        };

        Debug.print("RECOVERY: Resumed " # Int.toText(resumed_count) # " subscriptions");
        #ok(resumed_count)
    };

    // Report health metrics (called by monitoring systems)
    public func report_health_metrics(): async {
        health_check_counter: Nat;
        last_check: Timestamp;
        status: Text;
    } {
        let now = Time.now();
        let (status, _, _) = determine_health_status(1_000_000_000_000);

        let status_text = switch (status) {
            case (#Healthy) "healthy";
            case (#Degraded) "degraded";
            case (#Critical) "critical";
            case (#Offline) "offline";
        };

        {
            health_check_counter = health_check_counter;
            last_check = now;
            status = status_text;
        }
    };

    // =============================================================================
    // PRIVATE HELPER FUNCTIONS
    // =============================================================================

    /// Validate subscription ID contains only safe characters
    private func is_valid_subscription_id(id: Text): Bool {
        let chars = Text.toArray(id);
        for (char in chars.vals()) {
            let is_alphanumeric = (char >= 'a' and char <= 'z') or
                                  (char >= 'A' and char <= 'Z') or
                                  (char >= '0' and char <= '9');
            let is_allowed_special = char == '-' or char == '_';

            if (not (is_alphanumeric or is_allowed_special)) {
                return false;
            };
        };
        true
    };

    // =============================================================================
    // AUTHORIZATION HELPERS
    // =============================================================================

    private func requireAdmin(caller: Principal) : Result.Result<(), Text> {
        if (authManager.isAdmin(caller)) {
            return #ok();
        };
        #err("Unauthorized: Admin access required")
    };

    private func requireReadAccess(caller: Principal) : Result.Result<(), Text> {
        if (authManager.hasReadAccess(caller)) {
            return #ok();
        };
        #err("Unauthorized: Read access required")
    };

    // =============================================================================
    // ADMIN MANAGEMENT FUNCTIONS
    // =============================================================================

    public shared(msg) func add_admin(new_admin: Principal) : async Result.Result<(), Text> {
        authManager.addAdmin(msg.caller, new_admin)
    };

    public shared(msg) func remove_admin(admin_to_remove: Principal) : async Result.Result<(), Text> {
        authManager.removeAdmin(msg.caller, admin_to_remove)
    };

    public shared(msg) func add_read_only_user(user: Principal) : async Result.Result<(), Text> {
        authManager.addReadOnlyUser(msg.caller, user)
    };

    public shared(msg) func remove_read_only_user(user: Principal) : async Result.Result<(), Text> {
        authManager.removeReadOnlyUser(msg.caller, user)
    };

    public shared query(msg) func get_admins() : async Result.Result<[Principal], Text> {
        switch (requireAdmin(msg.caller)) {
            case (#err(e)) { #err(e) };
            case (#ok()) { #ok(authManager.getAdmins()) };
        };
    };

    public shared query(msg) func get_read_only_users() : async Result.Result<[Principal], Text> {
        switch (requireAdmin(msg.caller)) {
            case (#err(e)) { #err(e) };
            case (#ok()) { #ok(authManager.getReadOnlyUsers()) };
        };
    };

    // Emergency: Initialize first admin if authManager is empty (one-time fix)
    public shared(msg) func initialize_first_admin() : async Result.Result<(), Text> {
        let admins = authManager.getAdmins();
        if (admins.size() == 0) {
            authManager.initWithDeployer(msg.caller);
            Debug.print("First admin initialized: " # Principal.toText(msg.caller));
            return #ok();
        };
        #err("Admin already initialized")
    };
}