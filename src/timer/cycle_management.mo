import Debug "mo:base/Debug";
import Cycles "mo:base/ExperimentalCycles";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Blob "mo:base/Blob";

module {
    // HTTP Outcalls Types (for price oracle)
    public type HttpHeader = {
        name: Text;
        value: Text;
    };

    public type HttpMethod = {
        #get;
        #post;
        #head;
    };

    public type TransformArgs = {
        response: HttpResponsePayload;
        context: Blob;
    };

    public type HttpResponsePayload = {
        status: Nat;
        headers: [HttpHeader];
        body: Blob;
    };

    public type TransformContext = {
        function: shared query (TransformArgs) -> async HttpResponsePayload;
        context: Blob;
    };

    public type HttpRequestArgs = {
        url: Text;
        max_response_bytes: ?Nat64;
        headers: [HttpHeader];
        body: ?Blob;
        method: HttpMethod;
        transform: ?TransformContext;
    };

    public type IC = actor {
        http_request: (HttpRequestArgs) -> async HttpResponsePayload;
    };

    public type CycleBalance = Nat;
    public type CycleReport = {
        current_balance: CycleBalance;
        threshold_balance: CycleBalance;
        auto_refill_enabled: Bool;
        last_refill: ?Int; // timestamp
        total_consumed: CycleBalance;
        total_refilled: CycleBalance;
    };

    public type FeeDistribution = {
        solana_lamports_collected: Nat64;
        cycles_purchased: CycleBalance;
        conversion_rate: Float; // lamports per cycle
        distribution_timestamp: Int;
    };

    public class CycleManager(
        initial_threshold: CycleBalance,
        auto_refill_enabled: Bool
    ) {

        private var cycle_threshold = initial_threshold;
        private var auto_refill = auto_refill_enabled;
        private var total_consumed: CycleBalance = 0;
        private var total_refilled: CycleBalance = 0;
        private var last_refill_time: ?Int = null;

        // Fee distribution tracking
        private var fee_distributions: [FeeDistribution] = [];

        public func get_cycle_balance(): CycleBalance {
            Cycles.balance()
        };

        public func check_cycle_status(): CycleReport {
            let current = get_cycle_balance();
            {
                current_balance = current;
                threshold_balance = cycle_threshold;
                auto_refill_enabled = auto_refill;
                last_refill = last_refill_time;
                total_consumed = total_consumed;
                total_refilled = total_refilled;
            }
        };

        public func set_cycle_threshold(new_threshold: CycleBalance): () {
            cycle_threshold := new_threshold;
            Debug.print("Cycle threshold updated to: " # debug_show(new_threshold));
        };

        public func enable_auto_refill(enabled: Bool): () {
            auto_refill := enabled;
            Debug.print("Auto-refill " # (if enabled "enabled" else "disabled"));
        };

        public func needs_refill(): Bool {
            get_cycle_balance() < cycle_threshold
        };

        // Convert Solana lamports to ICP cycles and refill
        public func refill_from_solana_fees(
            lamports_amount: Nat64,
            conversion_rate: Float // lamports per cycle
        ): async Result.Result<CycleBalance, Text> {
            try {
                let cycles_to_add = Float.toInt(Float.fromInt64(Int64.fromNat64(lamports_amount)) / conversion_rate);
                let cycles_nat = Int.abs(cycles_to_add);

                if (cycles_nat < 1_000_000_000) { // Minimum 1B cycles
                    return #err("Insufficient lamports for meaningful cycle refill");
                };

                // In a real implementation, this would:
                // 1. Convert SOL to ICP on a DEX or exchange
                // 2. Use the ICP to purchase cycles
                // For now, we simulate the cycle addition

                Debug.print("Simulating cycle refill: " # debug_show(cycles_nat) # " cycles from " # debug_show(lamports_amount) # " lamports");

                // Record the fee distribution
                let distribution: FeeDistribution = {
                    solana_lamports_collected = lamports_amount;
                    cycles_purchased = cycles_nat;
                    conversion_rate = conversion_rate;
                    distribution_timestamp = Time.now();
                };

                fee_distributions := Array.append(fee_distributions, [distribution]);
                total_refilled += cycles_nat;
                last_refill_time := ?Time.now();

                #ok(cycles_nat)
            } catch (_) {
                #err("Cycle refill failed")
            }
        };

        // Monitor and auto-refill if needed
        public func monitor_and_refill(
            available_lamports: Nat64,
            conversion_rate: Float
        ): async Result.Result<Bool, Text> {
            if (not auto_refill) {
                return #ok(false);
            };

            if (not needs_refill()) {
                return #ok(false);
            };

            Debug.print("Auto-refill triggered - current balance: " # debug_show(get_cycle_balance()) # ", threshold: " # debug_show(cycle_threshold));

            let refill_result = await refill_from_solana_fees(available_lamports, conversion_rate);

            switch (refill_result) {
                case (#ok(cycles_added)) {
                    Debug.print("Auto-refill successful: " # debug_show(cycles_added) # " cycles added");
                    #ok(true)
                };
                case (#err(error)) {
                    Debug.print("Auto-refill failed: " # error);
                    #err(error)
                };
            }
        };

        // Record cycle consumption for tracking
        public func record_consumption(amount: CycleBalance): () {
            total_consumed += amount;
        };

        // Get fee distribution history
        public func get_fee_distributions(): [FeeDistribution] {
            fee_distributions
        };

        // Calculate optimal fee collection timing
        public func should_collect_fees(
            current_lamports: Nat64,
            conversion_rate: Float
        ): Bool {
            if (not needs_refill()) {
                return false;
            };

            let potential_cycles = Float.toInt(Float.fromInt64(Int64.fromNat64(current_lamports)) / conversion_rate);
            Int.abs(potential_cycles) > 1_000_000_000 // Worth at least 1B cycles
        };

        // Emergency cycle status check
        public func is_emergency_low(): Bool {
            get_cycle_balance() < (cycle_threshold / 10) // Less than 10% of threshold
        };

        // Get cycle consumption rate (cycles per second)
        public func get_consumption_rate(): ?Float {
            switch (last_refill_time) {
                case (?last_refill) {
                    let time_elapsed = Time.now() - last_refill;
                    if (time_elapsed > 0) {
                        let seconds_elapsed = Float.fromInt(time_elapsed / 1_000_000_000);
                        ?(Float.fromInt(total_consumed) / seconds_elapsed)
                    } else {
                        null
                    }
                };
                case null null;
            }
        };

        // Estimate time until cycle depletion
        public func estimate_depletion_time(): ?Int {
            switch (get_consumption_rate()) {
                case (?rate) {
                    if (rate > 0.0) {
                        let current_balance = Float.fromInt(get_cycle_balance());
                        let seconds_remaining = current_balance / rate;
                        let nanos_remaining = Float.toInt(seconds_remaining * 1_000_000_000.0);
                        ?(Time.now() + nanos_remaining)
                    } else {
                        null
                    }
                };
                case null null;
            }
        };
    };

    // Utility functions
    public func lamports_to_icp_estimate(lamports: Nat64): async Result.Result<Float, Text> {
        // Get real SOL/ICP exchange rate from price oracle
        try {
            let sol_price = await get_sol_price_usd();
            let icp_price = await get_icp_price_usd();

            switch (sol_price, icp_price) {
                case (#ok(sol_usd), #ok(icp_usd)) {
                    let sol_amount = Float.fromInt64(Int64.fromNat64(lamports)) / 1_000_000_000.0;
                    let exchange_rate = sol_usd / icp_usd;
                    #ok(sol_amount * exchange_rate)
                };
                case _ {
                    #err("Failed to get exchange rates")
                };
            }
        } catch (_) {
            #err("Price oracle unavailable")
        }
    };

    private func get_sol_price_usd(): async Result.Result<Float, Text> {
        // Get SOL price from CoinGecko API
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
        await fetch_price_from_api(url, "solana")
    };

    private func get_icp_price_usd(): async Result.Result<Float, Text> {
        // Get ICP price from CoinGecko API
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd";
        await fetch_price_from_api(url, "internet-computer")
    };

    private func fetch_price_from_api(_url: Text, coin_id: Text): async Result.Result<Float, Text> {
        // TODO: Implement HTTP outcall for price oracle
        // For now, return mock prices for testing
        if (coin_id == "solana") {
            #ok(150.0) // Mock SOL price in USD
        } else if (coin_id == "internet-computer") {
            #ok(15.0) // Mock ICP price in USD
        } else {
            #err("Unknown coin ID")
        }
    };

    private func _extract_price_from_response(_response: Text, _coin_id: Text): Result.Result<Float, Text> {
        // TODO: Implement proper JSON parsing when HTTP outcalls are enabled
        // For now, this is not used as we're returning mock prices
        #err("Not implemented - using mock prices")
    };

    public func icp_to_cycles_estimate(icp: Float): Nat {
        // 1 ICP ≈ 1T cycles (rough estimate)
        Int.abs(Float.toInt(icp * 1_000_000_000_000.0))
    };

    public func calculate_conversion_rate(sol_price_usd: Float, icp_price_usd: Float): Float {
        // Returns lamports per cycle
        if (icp_price_usd <= 0.0) {
            1.0 // Fallback rate
        } else {
            let sol_per_icp = sol_price_usd / icp_price_usd;
            let lamports_per_icp = sol_per_icp * 1_000_000_000.0;
            let cycles_per_icp = 1_000_000_000_000.0; // 1T cycles per ICP
            lamports_per_icp / cycles_per_icp
        }
    };
}