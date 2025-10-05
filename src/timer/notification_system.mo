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

module {
    public type NotificationId = Text;
    public type SolanaAddress = Text;
    public type SubscriptionId = Text;
    public type Timestamp = Int;

    // Notification types
    public type NotificationType = {
        #LowBalance: {
            required_amount: Nat64;
            current_balance: Nat64;
            days_until_payment: Nat;
        };
        #PaymentFailed: {
            failure_reason: Text;
            attempted_amount: Nat64;
            retry_count: Nat;
        };
        #PaymentSuccess: {
            amount: Nat64;
            transaction_hash: Text;
        };
        #SubscriptionExpiring: {
            days_until_expiry: Nat;
        };
        #UpcomingPayment: {
            payment_date: Timestamp;
            amount: Nat64;
            token_type: Text; // USDC, USDT, PYUSD, DAI
            days_until_payment: Nat;
        };
    };

    // Notification channels
    public type NotificationChannel = {
        #Email: Text;
        #Discord: Text;
        #Slack: Text;
        #Webhook: Text;
        #OnChain; // Store on-chain for dApp to query
        #SolanaMemo; // Send as Solana memo transaction
    };

    // Notification configuration
    public type NotificationConfig = {
        payer_channels: [NotificationChannel];
        dapp_channels: [NotificationChannel];
        reminder_days: [Nat]; // Days before payment to send reminders (e.g., [7, 3, 1])
        enabled: Bool;
    };

    // Stored notification
    public type Notification = {
        id: NotificationId;
        subscription_id: SubscriptionId;
        recipient: SolanaAddress;
        notification_type: NotificationType;
        channels: [NotificationChannel];
        created_at: Timestamp;
        sent_at: ?Timestamp;
        status: NotificationStatus;
        retry_count: Nat;
    };

    public type NotificationStatus = {
        #Pending;
        #Sent;
        #Failed;
        #Retry;
    };

    // Balance check configuration
    public type BalanceCheckConfig = {
        enabled: Bool;
        check_interval_hours: Nat; // How often to check balances
        minimum_balance_multiplier: Float; // Minimum balance = payment_amount * multiplier
        reminder_thresholds: [Nat]; // Days before payment to check/remind
    };

    // Payment failure handling
    public type PaymentFailureConfig = {
        max_retry_attempts: Nat;
        retry_delay_hours: Nat;
        grace_period_days: Nat;
        auto_pause_on_failure: Bool;
    };

    public class NotificationManager() {
        private var notifications = Map.HashMap<NotificationId, Notification>(10, Text.equal, Text.hash);
        private var notification_counter: Nat = 0;
        private var notification_configs = Map.HashMap<SubscriptionId, NotificationConfig>(10, Text.equal, Text.hash);

        // Configuration
        private var balance_check_config: BalanceCheckConfig = {
            enabled = true;
            check_interval_hours = 6; // Check every 6 hours
            minimum_balance_multiplier = 1.1; // 110% of payment amount
            reminder_thresholds = [3]; // 3 days before payment
        };

        private var payment_failure_config: PaymentFailureConfig = {
            max_retry_attempts = 3;
            retry_delay_hours = 2;
            grace_period_days = 3;
            auto_pause_on_failure = true;
        };

        // Create a new notification
        public func create_notification(
            subscription_id: SubscriptionId,
            recipient: SolanaAddress,
            notification_type: NotificationType,
            channels: [NotificationChannel]
        ): NotificationId {
            notification_counter += 1;
            let id = "notif_" # Int.toText(notification_counter);

            let notification: Notification = {
                id = id;
                subscription_id = subscription_id;
                recipient = recipient;
                notification_type = notification_type;
                channels = channels;
                created_at = Time.now();
                sent_at = null;
                status = #Pending;
                retry_count = 0;
            };

            notifications.put(id, notification);
            Debug.print("Created notification: " # id);
            id
        };

        // Set notification configuration for a subscription
        public func set_notification_config(subscription_id: SubscriptionId, config: NotificationConfig) {
            notification_configs.put(subscription_id, config);
            Debug.print("Updated notification config for subscription: " # subscription_id);
        };

        // Get notification configuration
        public func get_notification_config(subscription_id: SubscriptionId): ?NotificationConfig {
            notification_configs.get(subscription_id)
        };

        // Check if balance is sufficient for upcoming payment
        public func check_balance_sufficiency(
            payer_balance: Nat64,
            required_amount: Nat64,
            _days_until_payment: Nat
        ): Bool {
            let minimum_required = Float.fromInt64(Int64.fromNat64(required_amount)) * balance_check_config.minimum_balance_multiplier;
            let balance_float = Float.fromInt64(Int64.fromNat64(payer_balance));
            balance_float >= minimum_required
        };

        // Create low balance reminder notification
        public func create_low_balance_reminder(
            subscription_id: SubscriptionId,
            payer: SolanaAddress,
            required_amount: Nat64,
            current_balance: Nat64,
            days_until_payment: Nat
        ): Result.Result<NotificationId, Text> {
            switch (notification_configs.get(subscription_id)) {
                case (?config) {
                    if (not config.enabled) {
                        return #err("Notifications disabled for this subscription");
                    };

                    let notification_type = #LowBalance({
                        required_amount = required_amount;
                        current_balance = current_balance;
                        days_until_payment = days_until_payment;
                    });

                    let notif_id = create_notification(
                        subscription_id,
                        payer,
                        notification_type,
                        config.payer_channels
                    );

                    #ok(notif_id)
                };
                case null {
                    #err("No notification config found for subscription")
                };
            }
        };

        // Create upcoming payment notification (sent 3 days before)
        public func create_upcoming_payment_notification(
            subscription_id: SubscriptionId,
            payer: SolanaAddress,
            payment_date: Timestamp,
            amount: Nat64,
            token_type: Text,
            days_until_payment: Nat
        ): Result.Result<NotificationId, Text> {
            switch (notification_configs.get(subscription_id)) {
                case (?config) {
                    if (not config.enabled) {
                        return #err("Notifications disabled for this subscription");
                    };

                    let notification_type = #UpcomingPayment({
                        payment_date = payment_date;
                        amount = amount;
                        token_type = token_type;
                        days_until_payment = days_until_payment;
                    });

                    let notif_id = create_notification(
                        subscription_id,
                        payer,
                        notification_type,
                        config.payer_channels
                    );

                    #ok(notif_id)
                };
                case null {
                    #err("No notification config found for subscription")
                };
            }
        };

        // Create payment failure notification for dApp
        public func create_payment_failure_notification(
            subscription_id: SubscriptionId,
            dapp_address: SolanaAddress,
            failure_reason: Text,
            attempted_amount: Nat64,
            retry_count: Nat
        ): Result.Result<NotificationId, Text> {
            switch (notification_configs.get(subscription_id)) {
                case (?config) {
                    if (not config.enabled) {
                        return #err("Notifications disabled for this subscription");
                    };

                    let notification_type = #PaymentFailed({
                        failure_reason = failure_reason;
                        attempted_amount = attempted_amount;
                        retry_count = retry_count;
                    });

                    let notif_id = create_notification(
                        subscription_id,
                        dapp_address,
                        notification_type,
                        config.dapp_channels
                    );

                    #ok(notif_id)
                };
                case null {
                    #err("No notification config found for subscription")
                };
            }
        };

        // Send notification through configured channels
        public func send_notification(notification_id: NotificationId): async Result.Result<(), Text> {
            switch (notifications.get(notification_id)) {
                case (?notification) {
                    var all_sent = true;
                    var error_messages: [Text] = [];

                    for (channel in notification.channels.vals()) {
                        let result = await send_to_channel(notification, channel);
                        switch (result) {
                            case (#err(error)) {
                                all_sent := false;
                                error_messages := Array.append(error_messages, [error]);
                            };
                            case (#ok()) {};
                        };
                    };

                    let updated_notification = if (all_sent) {
                        { notification with status = #Sent; sent_at = ?Time.now() }
                    } else {
                        { notification with status = #Failed; retry_count = notification.retry_count + 1 }
                    };

                    notifications.put(notification_id, updated_notification);

                    if (all_sent) {
                        #ok()
                    } else {
                        #err("Failed to send to some channels: " # Text.join(", ", error_messages.vals()))
                    }
                };
                case null {
                    #err("Notification not found")
                };
            }
        };

        // Send notification to specific channel
        // IMPORTANT: This requires a Solana client to be passed for #SolanaMemo
        // Call send_to_channel_with_solana() instead for Solana memo notifications
        private func send_to_channel(notification: Notification, channel: NotificationChannel): async Result.Result<(), Text> {
            switch (channel) {
                case (#Email(address)) {
                    await send_email(notification, address)
                };
                case (#Discord(webhook)) {
                    await send_discord(notification, webhook)
                };
                case (#Slack(webhook)) {
                    await send_slack(notification, webhook)
                };
                case (#Webhook(url)) {
                    await send_webhook(notification, url)
                };
                case (#OnChain) {
                    // Already stored on-chain, just mark as sent
                    #ok()
                };
                case (#SolanaMemo) {
                    // Requires external Solana client - should use send_notification_with_solana()
                    #err("SolanaMemo requires Solana client - use send_notification_with_solana()")
                };
            }
        };

        // Helper to format compact memo message (max 566 bytes for Solana memo)
        private func format_compact_memo(notification: Notification): Text {
            switch (notification.notification_type) {
                case (#UpcomingPayment(details)) {
                    // Compact format for Solana memo
                    "OuroC: Payment in " # Int.toText(details.days_until_payment) #
                    "d. Amount: " # format_token_amount(details.amount, details.token_type) #
                    ". Sub: " # notification.subscription_id
                };
                case (#LowBalance(details)) {
                    "OuroC: Low balance! Need " # Nat64.toText(details.required_amount) #
                    " lamports. Payment in " # Int.toText(details.days_until_payment) # "d"
                };
                case (#PaymentFailed(details)) {
                    "OuroC: Payment FAILED. " # details.failure_reason
                };
                case (#PaymentSuccess(details)) {
                    "OuroC: Payment SUCCESS. " # Nat64.toText(details.amount) # " lamports"
                };
                case (#SubscriptionExpiring(details)) {
                    "OuroC: Expiring in " # Int.toText(details.days_until_expiry) # " days"
                };
            }
        };

        // Channel-specific implementations (simplified for now)
        private func send_email(notification: Notification, email: Text): async Result.Result<(), Text> {
            // Integrate with email service via HTTP API
            let email_payload = create_email_payload(notification, email);
            await send_http_notification("email", email_payload, null)
        };

        private func send_discord(notification: Notification, webhook: Text): async Result.Result<(), Text> {
            // Send to Discord webhook
            let discord_payload = create_discord_payload(notification);
            await send_http_notification("discord", discord_payload, ?webhook)
        };

        private func send_slack(notification: Notification, webhook: Text): async Result.Result<(), Text> {
            // Send to Slack webhook
            let slack_payload = create_slack_payload(notification);
            await send_http_notification("slack", slack_payload, ?webhook)
        };

        private func send_webhook(notification: Notification, url: Text): async Result.Result<(), Text> {
            // Send to custom webhook
            let webhook_payload = create_webhook_payload(notification);
            await send_http_notification("webhook", webhook_payload, ?url)
        };

        private func send_http_notification(service: Text, payload: Text, url: ?Text): async Result.Result<(), Text> {
            // TODO: Implement HTTP outcalls for notifications
            // For now, just log and return success (mock mode)
            let target_url = switch (url) {
                case (?webhook_url) { webhook_url };
                case null {
                    // Use default service URLs for email, etc.
                    "https://api.ouro-c.com/notifications/" # service
                };
            };

            Debug.print("MOCK: Sending " # service # " notification to " # target_url);
            Debug.print("MOCK: Payload: " # payload);
            #ok()
        };

        private func create_email_payload(notification: Notification, email: Text): Text {
            let subject = "Ouro-C Subscription Notification - " # notification.subscription_id;
            let message = format_notification_message(notification);

            "{\"to\":\"" # email # "\",\"subject\":\"" # subject # "\",\"message\":\"" # message # "\"}"
        };

        private func create_discord_payload(notification: Notification): Text {
            let message = format_notification_message(notification);
            let embed_color = switch (notification.notification_type) {
                case (#LowBalance(_)) { "15844367" }; // Yellow
                case (#SubscriptionExpiring(_)) { "15158332" }; // Red
                case (#PaymentSuccess(_)) { "3066993" }; // Green
                case (#PaymentFailed(_)) { "15158332" }; // Red
                case (#UpcomingPayment(_)) { "3447003" }; // Blue
            };

            "{\"embeds\":[{\"title\":\"Ouro-C Subscription Alert\",\"description\":\"" # message # "\",\"color\":" # embed_color # "}]}"
        };

        private func create_slack_payload(notification: Notification): Text {
            let message = format_notification_message(notification);
            let color = switch (notification.notification_type) {
                case (#LowBalance(_)) { "warning" };
                case (#SubscriptionExpiring(_)) { "danger" };
                case (#PaymentSuccess(_)) { "good" };
                case (#PaymentFailed(_)) { "danger" };
                case (#UpcomingPayment(_)) { "#3498db" }; // Blue
            };

            "{\"attachments\":[{\"color\":\"" # color # "\",\"title\":\"Ouro-C Subscription Alert\",\"text\":\"" # message # "\"}]}"
        };

        private func create_webhook_payload(notification: Notification): Text {
            let message = format_notification_message(notification);
            let notification_type_str = switch (notification.notification_type) {
                case (#LowBalance(_)) { "low_balance" };
                case (#PaymentFailed(_)) { "payment_failed" };
                case (#PaymentSuccess(_)) { "payment_success" };
                case (#SubscriptionExpiring(_)) { "subscription_expiring" };
                case (#UpcomingPayment(_)) { "upcoming_payment" };
            };

            "{\"subscription_id\":\"" # notification.subscription_id # "\",\"type\":\"" # notification_type_str # "\",\"message\":\"" # message # "\",\"timestamp\":" # Int.toText(notification.created_at) # "}"
        };

        // Format notification message
        private func format_notification_message(notification: Notification): Text {
            switch (notification.notification_type) {
                case (#LowBalance(details)) {
                    "🔔 Low Balance Alert\n" #
                    "Subscription: " # notification.subscription_id # "\n" #
                    "Required: " # Nat64.toText(details.required_amount) # " lamports\n" #
                    "Current: " # Nat64.toText(details.current_balance) # " lamports\n" #
                    "Payment due in " # Int.toText(details.days_until_payment) # " days"
                };
                case (#PaymentFailed(details)) {
                    "❌ Payment Failed\n" #
                    "Subscription: " # notification.subscription_id # "\n" #
                    "Amount: " # Nat64.toText(details.attempted_amount) # " lamports\n" #
                    "Reason: " # details.failure_reason # "\n" #
                    "Retry #" # Int.toText(details.retry_count)
                };
                case (#PaymentSuccess(details)) {
                    "✅ Payment Successful\n" #
                    "Subscription: " # notification.subscription_id # "\n" #
                    "Amount: " # Nat64.toText(details.amount) # " lamports\n" #
                    "Transaction: " # details.transaction_hash
                };
                case (#SubscriptionExpiring(details)) {
                    "⏰ Subscription Expiring\n" #
                    "Subscription: " # notification.subscription_id # "\n" #
                    "Expires in " # Int.toText(details.days_until_expiry) # " days"
                };
                case (#UpcomingPayment(details)) {
                    "📅 Upcoming Payment Reminder\n" #
                    "Subscription: " # notification.subscription_id # "\n" #
                    "Payment Date: " # format_timestamp(details.payment_date) # "\n" #
                    "Amount: " # format_token_amount(details.amount, details.token_type) # "\n" #
                    "Token: " # details.token_type # "\n" #
                    "Days Until Payment: " # Int.toText(details.days_until_payment)
                };
            }
        };

        // Format timestamp to human-readable date
        private func format_timestamp(timestamp: Timestamp): Text {
            // Convert nanoseconds to seconds
            let seconds = timestamp / 1_000_000_000;
            // Simple format: Unix timestamp (in production, use proper date formatting)
            "Unix: " # Int.toText(seconds)
        };

        // Format token amount with proper decimals
        private func format_token_amount(amount: Nat64, token_type: Text): Text {
            // Most stablecoins use 6 decimals (USDC, USDT, PYUSD)
            // Convert micro-units to human readable
            let amount_int = Nat64.toNat(amount);
            let whole = amount_int / 1_000_000;
            let fractional = amount_int % 1_000_000;

            Int.toText(whole) # "." #
            (if (fractional < 100_000) "0" else "") #
            (if (fractional < 10_000) "0" else "") #
            (if (fractional < 1_000) "0" else "") #
            (if (fractional < 100) "0" else "") #
            (if (fractional < 10) "0" else "") #
            Int.toText(fractional) # " " # token_type
        };

        // Get all notifications for a subscription
        public func get_notifications_for_subscription(subscription_id: SubscriptionId): [Notification] {
            let filtered_notifications = Buffer.Buffer<Notification>(0);
            for (notification in notifications.vals()) {
                if (notification.subscription_id == subscription_id) {
                    filtered_notifications.add(notification);
                };
            };
            Buffer.toArray(filtered_notifications)
        };

        // Get pending notifications
        public func get_pending_notifications(): [Notification] {
            let pending = Buffer.Buffer<Notification>(0);
            for (notification in notifications.vals()) {
                if (notification.status == #Pending or notification.status == #Retry) {
                    pending.add(notification);
                };
            };
            Buffer.toArray(pending)
        };

        // Configuration setters
        public func update_balance_check_config(config: BalanceCheckConfig) {
            balance_check_config := config;
            Debug.print("Updated balance check configuration");
        };

        public func update_payment_failure_config(config: PaymentFailureConfig) {
            payment_failure_config := config;
            Debug.print("Updated payment failure configuration");
        };

        // Getters
        public func get_balance_check_config(): BalanceCheckConfig {
            balance_check_config
        };

        public func get_payment_failure_config(): PaymentFailureConfig {
            payment_failure_config
        };

        // Process pending notifications (called by timer)
        public func process_pending_notifications(): async Nat {
            let pending = get_pending_notifications();
            var processed = 0;

            for (notification in pending.vals()) {
                let result = await send_notification(notification.id);
                switch (result) {
                    case (#ok()) {
                        processed += 1;
                    };
                    case (#err(error)) {
                        Debug.print("Failed to send notification " # notification.id # ": " # error);
                    };
                };
            };

            Debug.print("Processed " # Int.toText(processed) # " notifications");
            processed
        };
    };
}