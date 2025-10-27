export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const SolanaAddress = IDL.Text;
  const TransactionHash = IDL.Text;
  const Result_14 = IDL.Variant({ 'ok' : TransactionHash, 'err' : IDL.Text });
  const SubscriptionId = IDL.Text;
  const Timestamp = IDL.Int;
  const CreateSubscriptionRequest = IDL.Record({
    'subscription_id' : IDL.Text,
    'api_key' : IDL.Text,
    'solana_contract_address' : SolanaAddress,
    'payment_token_mint' : IDL.Text,
    'start_time' : IDL.Opt(Timestamp),
    'interval_seconds' : IDL.Nat64,
    'subscriber_address' : SolanaAddress,
    'amount' : IDL.Nat64,
    'merchant_address' : SolanaAddress,
  });
  const Result_13 = IDL.Variant({ 'ok' : SubscriptionId, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result_7 = IDL.Variant({
    'ok' : IDL.Vec(IDL.Principal),
    'err' : IDL.Text,
  });
  const CanisterStatus = IDL.Variant({
    'Healthy' : IDL.Null,
    'Critical' : IDL.Null,
    'Offline' : IDL.Null,
    'Degraded' : IDL.Null,
  });
  const CanisterHealth = IDL.Record({
    'status' : CanisterStatus,
    'last_health_check' : Timestamp,
    'is_degraded' : IDL.Bool,
    'active_timers' : IDL.Nat,
    'subscription_count' : IDL.Nat,
    'cycle_balance' : IDL.Nat,
    'uptime_seconds' : IDL.Nat,
    'failed_payments' : IDL.Nat,
    'memory_usage' : IDL.Nat,
    'degradation_reason' : IDL.Opt(IDL.Text),
  });
  const Result_11 = IDL.Variant({
    'ok' : IDL.Record({
      'tokens' : IDL.Vec(
        IDL.Record({
          'decimals' : IDL.Nat8,
          'balance' : IDL.Nat64,
          'mint' : IDL.Text,
        })
      ),
      'address' : IDL.Text,
      'sol_balance' : IDL.Nat64,
    }),
    'err' : IDL.Text,
  });
  const CycleBalance = IDL.Nat;
  const CycleReport = IDL.Record({
    'total_consumed' : CycleBalance,
    'threshold_balance' : CycleBalance,
    'last_refill' : IDL.Opt(IDL.Int),
    'current_balance' : CycleBalance,
    'auto_refill_enabled' : IDL.Bool,
    'total_refilled' : CycleBalance,
  });
  const EncryptedMetadata = IDL.Record({
    'iv' : IDL.Vec(IDL.Nat8),
    'encrypted_data' : IDL.Vec(IDL.Nat8),
    'subscription_id' : SubscriptionId,
    'created_at' : Timestamp,
    'version' : IDL.Nat8,
    'encrypted_by' : IDL.Principal,
    'data_hash' : IDL.Text,
  });
  const Result_10 = IDL.Variant({ 'ok' : EncryptedMetadata, 'err' : IDL.Text });
  const FeeConfig = IDL.Record({
    'cycle_refill_ratio' : IDL.Float64,
    'gas_reserve_lamports' : IDL.Nat64,
    'trigger_fee_lamports' : IDL.Nat64,
  });
  const Result_9 = IDL.Variant({ 'ok' : FeeConfig, 'err' : IDL.Text });
  const LicenseTier = IDL.Variant({
    'Enterprise' : IDL.Null,
    'Beta' : IDL.Null,
    'Community' : IDL.Null,
  });
  const Result_8 = IDL.Variant({
    'ok' : IDL.Record({
      'rate_limit_remaining' : IDL.Nat,
      'tier' : IDL.Opt(LicenseTier),
      'is_valid' : IDL.Bool,
      'expires_at' : IDL.Int,
    }),
    'err' : IDL.Text,
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
    'id' : SubscriptionId,
    'last_error' : IDL.Opt(IDL.Text),
    'status' : SubscriptionStatus,
    'trigger_count' : IDL.Nat,
    'created_at' : Timestamp,
    'next_execution' : Timestamp,
    'solana_contract_address' : SolanaAddress,
    'payment_token_mint' : IDL.Text,
    'interval_seconds' : IDL.Nat64,
    'subscriber_address' : SolanaAddress,
    'failed_payment_count' : IDL.Nat,
    'last_failure_time' : IDL.Opt(Timestamp),
    'last_triggered' : IDL.Opt(Timestamp),
    'merchant_address' : SolanaAddress,
  });
  const Result_6 = IDL.Variant({
    'ok' : IDL.Record({ 'main' : IDL.Text }),
    'err' : IDL.Text,
  });
  const Result_5 = IDL.Variant({
    'ok' : IDL.Record({ 'main' : IDL.Nat64 }),
    'err' : IDL.Text,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Record({ 'main_address' : IDL.Text, 'fee_address' : IDL.Text }),
    'err' : IDL.Text,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Vec(SubscriptionId),
    'err' : IDL.Text,
  });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Bool, 'err' : IDL.Text });
  return IDL.Service({
    'add_admin' : IDL.Func([IDL.Principal], [Result], []),
    'add_controller_admin' : IDL.Func([IDL.Principal], [Result], []),
    'add_read_only_user' : IDL.Func([IDL.Principal], [Result], []),
    'admin_withdraw_sol' : IDL.Func(
        [
          IDL.Variant({ 'FeeCollection' : IDL.Null, 'Main' : IDL.Null }),
          SolanaAddress,
          IDL.Nat64,
        ],
        [Result_14],
        [],
      ),
    'admin_withdraw_token' : IDL.Func(
        [
          IDL.Variant({ 'FeeCollection' : IDL.Null, 'Main' : IDL.Null }),
          SolanaAddress,
          SolanaAddress,
          IDL.Nat64,
        ],
        [Result_14],
        [],
      ),
    'cancel_fee_address_proposal' : IDL.Func([], [Result], []),
    'cancel_subscription' : IDL.Func([SubscriptionId], [Result], []),
    'cleanup_old_subscriptions' : IDL.Func([IDL.Nat64], [IDL.Nat], []),
    'create_subscription' : IDL.Func(
        [CreateSubscriptionRequest],
        [Result_13],
        [],
      ),
    'debug_admin_info' : IDL.Func([], [IDL.Text], ['query']),
    'delete_encrypted_metadata' : IDL.Func([SubscriptionId], [Result], []),
    'emergency_pause_all' : IDL.Func([], [Result_1], []),
    'enable_auto_refill' : IDL.Func([IDL.Bool], [], []),
    'execute_fee_address_change' : IDL.Func([], [Result], []),
    'get_admins' : IDL.Func([], [Result_7], ['query']),
    'get_canister_health' : IDL.Func([], [CanisterHealth], ['query']),
    'get_canister_status' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_subscriptions' : IDL.Nat,
            'ed25519_key_name' : IDL.Text,
            'active_timers' : IDL.Nat,
            'fee_wallet' : IDL.Text,
            'active_subscriptions' : IDL.Nat,
            'is_initialized' : IDL.Bool,
            'main_wallet' : IDL.Text,
          }),
        ],
        ['query'],
      ),
    'get_comprehensive_wallet_info' : IDL.Func([], [Result_11], []),
    'get_comprehensive_wallet_info_v1' : IDL.Func([], [Result_11], []),
    'get_current_fee_address' : IDL.Func([], [IDL.Text], ['query']),
    'get_cycle_status' : IDL.Func([], [CycleReport], []),
    'get_encrypted_metadata' : IDL.Func(
        [SubscriptionId],
        [Result_10],
        ['query'],
      ),
    'get_fee_config' : IDL.Func([], [Result_9], []),
    'get_fee_governance_status' : IDL.Func(
        [],
        [
          IDL.Record({
            'time_until_execution' : IDL.Opt(IDL.Int),
            'current_address' : IDL.Text,
            'proposal_time' : IDL.Opt(IDL.Int),
            'proposed_address' : IDL.Opt(IDL.Text),
            'is_proposal_pending' : IDL.Bool,
          }),
        ],
        ['query'],
      ),
    'get_license_info' : IDL.Func([IDL.Text], [Result_8], []),
    'get_network_config' : IDL.Func(
        [],
        [
          IDL.Record({
            'network' : NetworkEnvironment,
            'rpc_endpoint' : IDL.Text,
            'key_name' : IDL.Text,
          }),
        ],
        ['query'],
      ),
    'get_overdue_subscriptions' : IDL.Func(
        [],
        [IDL.Vec(SubscriptionId)],
        ['query'],
      ),
    'get_read_only_users' : IDL.Func([], [Result_7], ['query']),
    'get_subscription' : IDL.Func(
        [SubscriptionId],
        [IDL.Opt(Subscription)],
        ['query'],
      ),
    'get_system_metrics' : IDL.Func(
        [],
        [
          IDL.Record({
            'paused_subscriptions' : IDL.Nat,
            'total_subscriptions' : IDL.Nat,
            'cycle_balance_estimate' : IDL.Nat,
            'total_payments_processed' : IDL.Nat,
            'active_subscriptions' : IDL.Nat,
            'uptime_seconds' : IDL.Nat,
            'failed_payments' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'get_wallet_addresses' : IDL.Func([], [Result_6], []),
    'get_wallet_balances' : IDL.Func([], [Result_5], []),
    'initialize_canister' : IDL.Func([], [Result_4], []),
    'initialize_first_admin' : IDL.Func([], [Result], []),
    'list_encrypted_metadata' : IDL.Func([], [Result_3], []),
    'list_subscriptions' : IDL.Func([], [IDL.Vec(Subscription)], ['query']),
    'monitor_cycles' : IDL.Func([], [Result_2], []),
    'pause_subscription' : IDL.Func([SubscriptionId], [Result], []),
    'ping' : IDL.Func(
        [],
        [
          IDL.Record({
            'status' : IDL.Text,
            'version' : IDL.Text,
            'timestamp' : Timestamp,
          }),
        ],
        ['query'],
      ),
    'propose_fee_address_change' : IDL.Func([IDL.Text], [Result], []),
    'refill_cycles_from_fees' : IDL.Func([], [Result_1], []),
    'remove_admin' : IDL.Func([IDL.Principal], [Result], []),
    'remove_read_only_user' : IDL.Func([IDL.Principal], [Result], []),
    'report_health_metrics' : IDL.Func(
        [],
        [
          IDL.Record({
            'status' : IDL.Text,
            'health_check_counter' : IDL.Nat,
            'last_check' : Timestamp,
          }),
        ],
        [],
      ),
    'resume_operations' : IDL.Func([], [Result_1], []),
    'resume_subscription' : IDL.Func([SubscriptionId], [Result], []),
    'set_cycle_threshold' : IDL.Func([IDL.Nat], [], []),
    'set_network' : IDL.Func([NetworkEnvironment], [Result], []),
    'store_encrypted_metadata' : IDL.Func(
        [
          SubscriptionId,
          IDL.Vec(IDL.Nat8),
          IDL.Vec(IDL.Nat8),
          IDL.Text,
          IDL.Nat8,
        ],
        [Result],
        [],
      ),
    'update_fee_config' : IDL.Func([FeeConfig], [Result], []),
    'update_subscription_addresses' : IDL.Func(
        [SubscriptionId, SolanaAddress, SolanaAddress],
        [Result],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
