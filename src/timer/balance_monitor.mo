import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Nat64 "mo:base/Nat64";
import Float "mo:base/Float";
import Map "mo:base/HashMap";
import Timer "mo:base/Timer";

module {
    public type SolanaAddress = Text;
    public type SubscriptionId = Text;
    public type Timestamp = Int;

    // Balance check record
    public type BalanceCheck = {
        subscription_id: SubscriptionId;
        payer: SolanaAddress;
        required_amount: Nat64;
        last_check: Timestamp;
        last_balance: Nat64;
        reminder_sent: Bool;
        check_frequency_hours: Nat;
    };

    // Reminder schedule
    public type ReminderSchedule = {
        subscription_id: SubscriptionId;
        next_payment_date: Timestamp;
        payment_amount: Nat64;
        reminder_days: [Nat]; // Days before payment to send reminders
        reminders_sent: [Nat]; // Track which reminders have been sent
    };

    // Balance monitoring result
    public type BalanceMonitorResult = {
        subscription_id: SubscriptionId;
        payer: SolanaAddress;
        current_balance: Nat64;
        required_amount: Nat64;
        is_sufficient: Bool;
        days_until_payment: Int;
        action_needed: BalanceAction;
    };

    public type BalanceAction = {
        #NoAction;
        #SendReminder: Nat; // Days until payment
        #UrgentReminder;
        #InsufficientFunds;
    };

    public class BalanceMonitor() {
        private var balance_checks = Map.HashMap<SubscriptionId, BalanceCheck>(10, Text.equal, Text.hash);
        private var reminder_schedules = Map.HashMap<SubscriptionId, ReminderSchedule>(10, Text.equal, Text.hash);
        private var monitor_timer: ?Timer.TimerId = null;

        // Configuration
        private var monitoring_enabled: Bool = true;
        private var check_interval_hours: Nat = 6; // Check every 6 hours
        private var default_reminder_days: [Nat] = [3]; // Send notification 3 days before payment

        // Register a subscription for balance monitoring
        public func register_subscription_monitoring(
            subscription_id: SubscriptionId,
            payer: SolanaAddress,
            payment_amount: Nat64,
            next_payment: Timestamp,
            reminder_days: ?[Nat]
        ) {
            let balance_check: BalanceCheck = {
                subscription_id = subscription_id;
                payer = payer;
                required_amount = payment_amount;
                last_check = 0;
                last_balance = 0;
                reminder_sent = false;
                check_frequency_hours = check_interval_hours;
            };

            let reminder_schedule: ReminderSchedule = {
                subscription_id = subscription_id;
                next_payment_date = next_payment;
                payment_amount = payment_amount;
                reminder_days = switch (reminder_days) {
                    case (?days) days;
                    case null default_reminder_days;
                };
                reminders_sent = [];
            };

            balance_checks.put(subscription_id, balance_check);
            reminder_schedules.put(subscription_id, reminder_schedule);

            Debug.print("Registered balance monitoring for subscription: " # subscription_id);
        };

        // Update next payment date when subscription executes
        public func update_next_payment(subscription_id: SubscriptionId, next_payment: Timestamp) {
            switch (reminder_schedules.get(subscription_id)) {
                case (?schedule) {
                    let updated_schedule = {
                        schedule with
                        next_payment_date = next_payment;
                        reminders_sent = []; // Reset reminders for new payment cycle
                    };
                    reminder_schedules.put(subscription_id, updated_schedule);
                    Debug.print("Updated next payment for subscription: " # subscription_id);
                };
                case null {
                    Debug.print("No reminder schedule found for subscription: " # subscription_id);
                };
            }
        };

        // Check if balance monitoring is needed for a subscription
        public func should_check_balance(subscription_id: SubscriptionId): Bool {
            if (not monitoring_enabled) return false;

            switch (balance_checks.get(subscription_id)) {
                case (?check) {
                    let now = Time.now();
                    let hours_since_check = (now - check.last_check) / (60 * 60 * 1_000_000_000);
                    Int.abs(hours_since_check) >= check.check_frequency_hours
                };
                case null false;
            }
        };

        // Calculate days until payment
        public func days_until_payment(next_payment: Timestamp): Int {
            let now = Time.now();
            let time_diff = next_payment - now;
            let days = time_diff / (24 * 60 * 60 * 1_000_000_000);
            Int.abs(days)
        };

        // Check if reminder should be sent
        public func should_send_reminder(subscription_id: SubscriptionId): ?Nat {
            switch (reminder_schedules.get(subscription_id)) {
                case (?schedule) {
                    let days_left = days_until_payment(schedule.next_payment_date);

                    // Check each reminder threshold
                    for (reminder_day in schedule.reminder_days.vals()) {
                        // If we're at or past a reminder day and haven't sent it yet
                        if (days_left <= reminder_day and not reminder_already_sent(schedule.reminders_sent, reminder_day)) {
                            return ?reminder_day;
                        };
                    };
                    null
                };
                case null null;
            }
        };

        // Check if a reminder for a specific day has already been sent
        private func reminder_already_sent(sent_reminders: [Nat], target_day: Nat): Bool {
            for (sent_day in sent_reminders.vals()) {
                if (sent_day == target_day) return true;
            };
            false
        };

        // Mark reminder as sent
        public func mark_reminder_sent(subscription_id: SubscriptionId, reminder_day: Nat) {
            switch (reminder_schedules.get(subscription_id)) {
                case (?schedule) {
                    let updated_reminders = Array.append(schedule.reminders_sent, [reminder_day]);
                    let updated_schedule = {
                        schedule with reminders_sent = updated_reminders
                    };
                    reminder_schedules.put(subscription_id, updated_schedule);
                    Debug.print("Marked reminder sent for subscription " # subscription_id # " at " # Int.toText(reminder_day) # " days");
                };
                case null {
                    Debug.print("No reminder schedule found for subscription: " # subscription_id);
                };
            }
        };

        // Analyze balance and determine action needed
        public func analyze_balance(
            subscription_id: SubscriptionId,
            current_balance: Nat64
        ): ?BalanceMonitorResult {
            switch (balance_checks.get(subscription_id), reminder_schedules.get(subscription_id)) {
                case (?check, ?schedule) {
                    let days_left = days_until_payment(schedule.next_payment_date);
                    let required_with_buffer = Float.toInt64(Float.fromInt64(Int64.fromNat64(check.required_amount)) * 1.1); // 10% buffer
                    let is_sufficient = Int64.fromNat64(current_balance) >= required_with_buffer;

                    let action = if (not is_sufficient and days_left <= 1) {
                        #UrgentReminder
                    } else if (not is_sufficient) {
                        #InsufficientFunds
                    } else {
                        switch (should_send_reminder(subscription_id)) {
                            case (?reminder_day) #SendReminder(reminder_day);
                            case null #NoAction;
                        }
                    };

                    // Update balance check record
                    let updated_check = {
                        check with
                        last_check = Time.now();
                        last_balance = current_balance;
                    };
                    balance_checks.put(subscription_id, updated_check);

                    ?{
                        subscription_id = subscription_id;
                        payer = check.payer;
                        current_balance = current_balance;
                        required_amount = check.required_amount;
                        is_sufficient = is_sufficient;
                        days_until_payment = days_left;
                        action_needed = action;
                    }
                };
                case _ null;
            }
        };

        // Get all subscriptions that need balance checking
        public func get_subscriptions_for_monitoring(): [SubscriptionId] {
            let to_check = Buffer.Buffer<SubscriptionId>(0);

            for ((sub_id, _) in balance_checks.entries()) {
                if (should_check_balance(sub_id)) {
                    to_check.add(sub_id);
                };
            };

            Buffer.toArray(to_check)
        };

        // Get upcoming payments (next 7 days)
        public func get_upcoming_payments(): [ReminderSchedule] {
            let upcoming = Buffer.Buffer<ReminderSchedule>(0);
            let now = Time.now();
            let seven_days = 7 * 24 * 60 * 60 * 1_000_000_000;

            for (schedule in reminder_schedules.vals()) {
                if (schedule.next_payment_date <= now + seven_days) {
                    upcoming.add(schedule);
                };
            };

            Buffer.toArray(upcoming)
        };

        // Remove monitoring for cancelled subscription
        public func remove_subscription(subscription_id: SubscriptionId) {
            balance_checks.delete(subscription_id);
            reminder_schedules.delete(subscription_id);
            Debug.print("Removed balance monitoring for subscription: " # subscription_id);
        };

        // Configuration functions
        public func set_monitoring_enabled(enabled: Bool) {
            monitoring_enabled := enabled;
            Debug.print("Balance monitoring " # (if enabled "enabled" else "disabled"));
        };

        public func set_check_interval(hours: Nat) {
            check_interval_hours := hours;
            Debug.print("Balance check interval set to " # Int.toText(hours) # " hours");
        };

        public func set_default_reminder_days(days: [Nat]) {
            default_reminder_days := days;
            Debug.print("Default reminder days updated");
        };

        // Getters
        public func get_monitoring_status(): {
            enabled: Bool;
            check_interval_hours: Nat;
            monitored_subscriptions: Nat;
        } {
            {
                enabled = monitoring_enabled;
                check_interval_hours = check_interval_hours;
                monitored_subscriptions = balance_checks.size();
            }
        };

        public func get_balance_check_info(subscription_id: SubscriptionId): ?BalanceCheck {
            balance_checks.get(subscription_id)
        };

        public func get_reminder_schedule(subscription_id: SubscriptionId): ?ReminderSchedule {
            reminder_schedules.get(subscription_id)
        };

        // Start periodic balance monitoring timer
        public func start_monitoring_timer<system>(): Timer.TimerId {
            let interval_nanos = check_interval_hours * 60 * 60 * 1_000_000_000;

            let timer_id = Timer.recurringTimer<system>(
                #nanoseconds(interval_nanos),
                func(): async () {
                    await process_balance_monitoring();
                }
            );

            monitor_timer := ?timer_id;
            Debug.print("Started balance monitoring timer with " # Int.toText(check_interval_hours) # " hour interval");
            timer_id
        };

        // Stop monitoring timer
        public func stop_monitoring_timer() {
            switch (monitor_timer) {
                case (?timer_id) {
                    Timer.cancelTimer(timer_id);
                    monitor_timer := null;
                    Debug.print("Stopped balance monitoring timer");
                };
                case null {};
            };
        };

        // Process all balance monitoring (called by timer)
        private func process_balance_monitoring(): async () {
            if (not monitoring_enabled) return;

            let subscriptions_to_check = get_subscriptions_for_monitoring();
            Debug.print("Processing balance monitoring for " # Int.toText(subscriptions_to_check.size()) # " subscriptions");

            // Note: In real implementation, this would integrate with the main canister
            // to get actual Solana balances and trigger notifications
            for (sub_id in subscriptions_to_check.vals()) {
                Debug.print("Would check balance for subscription: " # sub_id);
                // TODO: Integrate with main canister's Solana balance checking
            };
        };
    };
}