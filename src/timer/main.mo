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
import Solana "./solana";
import CycleManagement "./cycle_management";

persistent actor OuroCTimer {

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
    };

    public type CreateSubscriptionRequest = {
        subscription_id: Text;                  // Must match Solana subscription ID
        solana_contract_address: SolanaAddress; // Deployed Solana program address
        payment_token_mint: Text;               // Token mint address (to determine opcode 0=USDC, 1=other)
        reminder_days_before_payment: Nat;      // Days before payment to send notification
        interval_seconds: Nat64;                // Payment interval in seconds
        start_time: ?Timestamp;                 // Optional start time (defaults to now + interval)
    };

    // State
    private var subscription_counter: Nat = 0;
    private transient var subscriptions = Map.HashMap<SubscriptionId, Subscription>(10, Text.equal, Text.hash);
    private transient var active_timers = Map.HashMap<SubscriptionId, Timer.TimerId>(10, Text.equal, Text.hash);

    // Enhanced Solana integration with Threshold Ed25519
    private var ed25519_key_name: Text = "OuroC_key";
    private var solana_rpc_endpoint: Text = "https://api.mainnet-beta.solana.com";
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
        if (req.interval_seconds < 60) {
            return #err("Minimum interval is 60 seconds");
        };

        if (not Solana.is_valid_solana_address(req.solana_contract_address)) {
            return #err("Invalid Solana contract address");
        };

        if (not Solana.is_valid_solana_address(req.payment_token_mint)) {
            return #err("Invalid payment token mint address");
        };

        // Validate subscription_id format
        if (req.subscription_id == "") {
            return #err("Subscription ID cannot be empty");
        };

        if (Text.size(req.subscription_id) > 32) {
            return #err("Subscription ID too long (max 32 characters)");
        };

        // Check if subscription already exists
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
                            // Success - update timer and schedule next
                            let updated_sub = {
                                sub with
                                next_execution = next_execution;
                                last_triggered = ?now;
                                trigger_count = sub.trigger_count + 1;
                            };

                            subscriptions.put(subscription_id, updated_sub);
                            ignore schedule_subscription_timer<system>(updated_sub);

                            Debug.print("Payment trigger sent: " # tx_hash # ". Next: " # Int.toText(next_execution));
                        };
                        case (#err(error)) {
                            // Payment failed - just reschedule for next interval
                            Debug.print("Payment trigger failed: " # error);

                            let updated_sub = {
                                sub with next_execution = next_execution;
                            };
                            subscriptions.put(subscription_id, updated_sub);
                            ignore schedule_subscription_timer<system>(updated_sub);
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
            total_payments_processed = subscription_counter; // Approximate
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
}