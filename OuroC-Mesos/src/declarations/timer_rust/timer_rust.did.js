export const idlFactory = ({ IDL }) => {
  const CreateSubscriptionRequest = IDL.Record({
    'subscription_id' : IDL.Text,
    'api_key' : IDL.Text,
    'solana_contract_address' : IDL.Text,
    'payment_token_mint' : IDL.Text,
    'start_time' : IDL.Opt(IDL.Nat64),
    'interval_seconds' : IDL.Nat64,
    'subscriber_address' : IDL.Text,
    'amount' : IDL.Nat64,
    'merchant_address' : IDL.Text,
  });
  const CanisterStatus = IDL.Variant({
    'Healthy' : IDL.Null,
    'Critical' : IDL.Null,
    'Offline' : IDL.Null,
    'Degraded' : IDL.Null,
  });
  const CanisterHealth = IDL.Record({
    'status' : CanisterStatus,
    'last_health_check' : IDL.Nat64,
    'is_degraded' : IDL.Bool,
    'active_timers' : IDL.Nat,
    'subscription_count' : IDL.Nat,
    'cycle_balance' : IDL.Nat64,
    'uptime_seconds' : IDL.Nat64,
    'failed_payments' : IDL.Nat32,
    'memory_usage' : IDL.Nat,
    'degradation_reason' : IDL.Opt(IDL.Text),
  });
  const WalletInfo = IDL.Record({
    'main_address' : IDL.Text,
    'last_updated' : IDL.Nat64,
    'main_balance' : IDL.Nat64,
  });
  const CycleReport = IDL.Record({
    'total_consumed' : IDL.Nat64,
    'threshold_balance' : IDL.Nat64,
    'last_refill' : IDL.Opt(IDL.Nat64),
    'current_balance' : IDL.Nat64,
    'auto_refill_enabled' : IDL.Bool,
    'total_refilled' : IDL.Nat64,
  });
  const EncryptedMetadata = IDL.Record({
    'iv' : IDL.Vec(IDL.Nat8),
    'encrypted_data' : IDL.Vec(IDL.Nat8),
    'subscription_id' : IDL.Text,
    'created_at' : IDL.Nat64,
    'version' : IDL.Nat8,
    'encrypted_by' : IDL.Text,
    'data_hash' : IDL.Text,
  });
  const FeeConfig = IDL.Record({
    'cycle_refill_ratio' : IDL.Float64,
    'gas_reserve_lamports' : IDL.Nat64,
    'trigger_fee_lamports' : IDL.Nat64,
  });
  const LicenseTier = IDL.Variant({
    'Enterprise' : IDL.Null,
    'Beta' : IDL.Null,
    'Community' : IDL.Null,
  });
  const LicenseValidationResult = IDL.Record({
    'rate_limit_remaining' : IDL.Nat,
    'tier' : IDL.Opt(LicenseTier),
    'is_valid' : IDL.Bool,
    'message' : IDL.Text,
    'developer_id' : IDL.Opt(IDL.Text),
    'expires_at' : IDL.Nat64,
  });
  const NetworkEnvironment = IDL.Variant({
    'Mainnet' : IDL.Null,
    'Testnet' : IDL.Null,
    'Devnet' : IDL.Null,
  });
  const SubscriptionStatus = IDL.Variant({
    'Paused' : IDL.Null,
    'Active' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Expired' : IDL.Null,
  });
  const Subscription = IDL.Record({
    'id' : IDL.Text,
    'last_error' : IDL.Opt(IDL.Text),
    'status' : SubscriptionStatus,
    'trigger_count' : IDL.Nat64,
    'created_at' : IDL.Nat64,
    'next_execution' : IDL.Nat64,
    'solana_contract_address' : IDL.Text,
    'payment_token_mint' : IDL.Text,
    'interval_seconds' : IDL.Nat64,
    'subscriber_address' : IDL.Text,
    'failed_payment_count' : IDL.Nat32,
    'last_failure_time' : IDL.Opt(IDL.Nat64),
    'last_triggered' : IDL.Opt(IDL.Nat64),
    'merchant_address' : IDL.Text,
  });
  const SystemMetrics = IDL.Record({
    'total_instructions' : IDL.Nat64,
    'canister_id' : IDL.Text,
    'stable_memory_size' : IDL.Nat64,
    'cycle_balance' : IDL.Nat64,
    'timestamp' : IDL.Nat64,
    'heap_size' : IDL.Nat64,
    'uptime_seconds' : IDL.Nat64,
    'memory_usage' : IDL.Nat64,
  });
  const WalletBalance = IDL.Record({
    'lamports' : IDL.Nat64,
    'last_updated' : IDL.Nat64,
  });
  return IDL.Service({
    'add_admin' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'add_controller_admin' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'add_read_only_user' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'admin_withdraw_sol' : IDL.Func(
        [IDL.Text, IDL.Nat64, IDL.Opt(IDL.Vec(IDL.Nat8))],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'admin_withdraw_token' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat64, IDL.Opt(IDL.Vec(IDL.Nat8))],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'cancel_fee_address_proposal' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'cancel_subscription' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'cleanup_old_subscriptions' : IDL.Func([IDL.Nat64], [IDL.Nat], []),
    'create_subscription' : IDL.Func(
        [CreateSubscriptionRequest],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'debug_admin_info' : IDL.Func([], [IDL.Text], ['query']),
    'delete_encrypted_metadata' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'emergency_pause_all' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'enable_auto_refill' : IDL.Func([IDL.Bool], [], []),
    'execute_fee_address_change' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'get_admins' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Vec(IDL.Text), 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_balance_for_address' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'get_balance_for_caller' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'get_canister_health' : IDL.Func([], [CanisterHealth], ['query']),
    'get_canister_status' : IDL.Func(
        [],
        [IDL.Bool, IDL.Text, IDL.Nat64, IDL.Nat64, IDL.Nat64],
        ['query'],
      ),
    'get_comprehensive_wallet_info' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : WalletInfo, 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_comprehensive_wallet_info_v1' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : WalletInfo, 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_current_fee_address' : IDL.Func([], [IDL.Text], ['query']),
    'get_cycle_status' : IDL.Func([], [CycleReport], ['query']),
    'get_ed25519_public_key' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'get_encrypted_metadata' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(EncryptedMetadata)],
        ['query'],
      ),
    'get_fee_config' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : FeeConfig, 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_fee_governance_status' : IDL.Func(
        [],
        [IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Nat64)],
        ['query'],
      ),
    'get_license_info' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : LicenseValidationResult, 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_network_config' : IDL.Func(
        [],
        [NetworkEnvironment, IDL.Text, IDL.Text],
        ['query'],
      ),
    'get_overdue_subscriptions' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'get_read_only_users' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Vec(IDL.Text), 'Err' : IDL.Text })],
        ['query'],
      ),
    'get_solana_address_for_caller' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'get_subscription' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(Subscription)],
        ['query'],
      ),
    'get_system_metrics' : IDL.Func([], [SystemMetrics], ['query']),
    'get_wallet_addresses' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : WalletInfo, 'Err' : IDL.Text })],
        [],
      ),
    'get_wallet_balances' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : WalletBalance, 'Err' : IDL.Text })],
        [],
      ),
    'initialize_canister' : IDL.Func(
        [],
        [
          IDL.Variant({
            'Ok' : IDL.Tuple(IDL.Text, IDL.Text),
            'Err' : IDL.Text,
          }),
        ],
        [],
      ),
    'initialize_first_admin' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'list_encrypted_metadata' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Vec(IDL.Text), 'Err' : IDL.Text })],
        ['query'],
      ),
    'list_subscriptions' : IDL.Func([], [IDL.Vec(Subscription)], ['query']),
    'monitor_cycles' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Bool, 'Err' : IDL.Text })],
        ['query'],
      ),
    'pause_subscription' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'ping' : IDL.Func([], [IDL.Text, IDL.Nat64, IDL.Text], ['query']),
    'propose_fee_address_change' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'refill_cycles_from_fees' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat64, 'Err' : IDL.Text })],
        [],
      ),
    'remove_admin' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'remove_read_only_user' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'report_health_metrics' : IDL.Func([], [], []),
    'resume_operations' : IDL.Func(
        [],
        [IDL.Variant({ 'Ok' : IDL.Nat, 'Err' : IDL.Text })],
        [],
      ),
    'resume_subscription' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'set_cycle_threshold' : IDL.Func([IDL.Nat64], [], []),
    'set_network' : IDL.Func(
        [NetworkEnvironment],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'store_encrypted_metadata' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Text],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_fee_config' : IDL.Func(
        [FeeConfig],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'update_subscription_addresses' : IDL.Func(
        [IDL.Text, IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
