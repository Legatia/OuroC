export const idlFactory = ({ IDL }: any) => {
  const SubscriptionId = IDL.Text;
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const SolanaAddress = IDL.Text;
  const Timestamp = IDL.Int;
  const CreateSubscriptionRequest = IDL.Record({
    'subscription_id' : IDL.Text,
    'solana_contract_address' : SolanaAddress,
    'payment_token_mint' : IDL.Text,
    'start_time' : IDL.Opt(Timestamp),
    'interval_seconds' : IDL.Nat64,
    'subscriber_address' : SolanaAddress,
    'amount' : IDL.Nat64,
    'merchant_address' : SolanaAddress,
    'api_key' : IDL.Text,
  });
  const Result_7 = IDL.Variant({ 'ok' : SubscriptionId, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
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
    'failed_payment_count' : IDL.Nat,
    'last_failure_time' : IDL.Opt(Timestamp),
    'last_triggered' : IDL.Opt(Timestamp),
  });
  const Result_5 = IDL.Variant({
    'ok' : IDL.Record({ 'fee_collection' : IDL.Text, 'main' : IDL.Text }),
    'err' : IDL.Text,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Record({ 'main_address' : IDL.Text, 'fee_address' : IDL.Text }),
    'err' : IDL.Text,
  });
  return IDL.Service({
    'cancel_subscription' : IDL.Func([SubscriptionId], [Result], []),
    'create_subscription' : IDL.Func(
        [CreateSubscriptionRequest],
        [Result_7],
        [],
      ),
    'emergency_pause_all' : IDL.Func([], [Result_1], []),
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
    'get_overdue_subscriptions' : IDL.Func(
        [],
        [IDL.Vec(SubscriptionId)],
        ['query'],
      ),
    'get_subscription' : IDL.Func(
        [SubscriptionId],
        [IDL.Opt(Subscription)],
        ['query'],
      ),
    'get_wallet_addresses' : IDL.Func([], [Result_5], []),
    'initialize_canister' : IDL.Func([], [Result_3], []),
    'list_subscriptions' : IDL.Func([], [IDL.Vec(Subscription)], ['query']),
    'pause_subscription' : IDL.Func([SubscriptionId], [Result], []),
    'resume_subscription' : IDL.Func([SubscriptionId], [Result], []),
    'set_network' : IDL.Func([NetworkEnvironment], [Result], []),
  });
};
