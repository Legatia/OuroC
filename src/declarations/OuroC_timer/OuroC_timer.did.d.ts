import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CanisterHealth {
  'status' : CanisterStatus,
  'last_health_check' : Timestamp,
  'is_degraded' : boolean,
  'active_timers' : bigint,
  'subscription_count' : bigint,
  'cycle_balance' : bigint,
  'uptime_seconds' : bigint,
  'failed_payments' : bigint,
  'memory_usage' : bigint,
  'degradation_reason' : [] | [string],
}
export type CanisterStatus = { 'Healthy' : null } |
  { 'Critical' : null } |
  { 'Offline' : null } |
  { 'Degraded' : null };
export interface CreateSubscriptionRequest {
  'subscription_id' : string,
  'reminder_days_before_payment' : bigint,
  'solana_contract_address' : SolanaAddress,
  'payment_token_mint' : string,
  'start_time' : [] | [Timestamp],
  'interval_seconds' : bigint,
  'subscriber_address' : SolanaAddress,
  'amount' : bigint,
  'merchant_address' : SolanaAddress,
}
export type CycleBalance = bigint;
export interface CycleReport {
  'total_consumed' : CycleBalance,
  'threshold_balance' : CycleBalance,
  'last_refill' : [] | [bigint],
  'current_balance' : CycleBalance,
  'auto_refill_enabled' : boolean,
  'total_refilled' : CycleBalance,
}
export interface EncryptedMetadata {
  'iv' : Uint8Array | number[],
  'encrypted_data' : Uint8Array | number[],
  'subscription_id' : SubscriptionId,
  'created_at' : Timestamp,
  'version' : number,
  'encrypted_by' : Principal,
  'data_hash' : string,
}
export interface FeeConfig {
  'cycle_refill_ratio' : number,
  'gas_reserve_lamports' : bigint,
  'trigger_fee_lamports' : bigint,
}
export type NetworkEnvironment = { 'Mainnet' : null } |
  { 'Testnet' : null } |
  { 'Devnet' : null };
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_10 = {
    'ok' : {
      'tokens' : Array<
        { 'decimals' : number, 'balance' : bigint, 'mint' : string }
      >,
      'address' : string,
      'sol_balance' : bigint,
    }
  } |
  { 'err' : string };
export type Result_11 = { 'ok' : SubscriptionId } |
  { 'err' : string };
export type Result_12 = { 'ok' : TransactionHash } |
  { 'err' : string };
export type Result_2 = { 'ok' : boolean } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<SubscriptionId> } |
  { 'err' : string };
export type Result_4 = {
    'ok' : { 'main_address' : string, 'fee_address' : string }
  } |
  { 'err' : string };
export type Result_5 = { 'ok' : { 'main' : bigint } } |
  { 'err' : string };
export type Result_6 = { 'ok' : { 'main' : string } } |
  { 'err' : string };
export type Result_7 = { 'ok' : Array<Principal> } |
  { 'err' : string };
export type Result_8 = { 'ok' : FeeConfig } |
  { 'err' : string };
export type Result_9 = { 'ok' : EncryptedMetadata } |
  { 'err' : string };
export type SolanaAddress = string;
export interface Subscription {
  'id' : SubscriptionId,
  'last_error' : [] | [string],
  'status' : SubscriptionStatus,
  'trigger_count' : bigint,
  'reminder_days_before_payment' : bigint,
  'created_at' : Timestamp,
  'next_execution' : Timestamp,
  'solana_contract_address' : SolanaAddress,
  'payment_token_mint' : string,
  'interval_seconds' : bigint,
  'failed_payment_count' : bigint,
  'last_failure_time' : [] | [Timestamp],
  'last_triggered' : [] | [Timestamp],
}
export type SubscriptionId = string;
export type SubscriptionStatus = { 'Paused' : null } |
  { 'Active' : null } |
  { 'Cancelled' : null } |
  { 'Expired' : null };
export type Timestamp = bigint;
export type TransactionHash = string;
export interface _SERVICE {
  'add_admin' : ActorMethod<[Principal], Result>,
  'add_controller_admin' : ActorMethod<[Principal], Result>,
  'add_read_only_user' : ActorMethod<[Principal], Result>,
  /**
   * / Withdraw SOL from canister wallet (admin only) - DEPRECATED but kept for compatibility
   * / This method is deprecated because fee collection is now handled by Solana contract
   */
  'admin_withdraw_sol' : ActorMethod<[SolanaAddress, bigint], Result_12>,
  /**
   * / Cancel a pending fee address change proposal (admin only)
   */
  'cancel_fee_address_proposal' : ActorMethod<[], Result>,
  'cancel_subscription' : ActorMethod<[SubscriptionId], Result>,
  /**
   * / Cleanup old cancelled/expired subscriptions to free memory
   * / Returns the number of subscriptions cleaned up
   */
  'cleanup_old_subscriptions' : ActorMethod<[bigint], bigint>,
  'create_subscription' : ActorMethod<[CreateSubscriptionRequest], Result_11>,
  'debug_admin_info' : ActorMethod<[], string>,
  /**
   * / Delete encrypted metadata (GDPR compliance - right to erasure)
   */
  'delete_encrypted_metadata' : ActorMethod<[SubscriptionId], Result>,
  'emergency_pause_all' : ActorMethod<[], Result_1>,
  'enable_auto_refill' : ActorMethod<[boolean], undefined>,
  /**
   * / Execute a proposed fee address change (admin only, after 7-day delay)
   */
  'execute_fee_address_change' : ActorMethod<[], Result>,
  'get_admins' : ActorMethod<[], Result_7>,
  'get_canister_health' : ActorMethod<[], CanisterHealth>,
  'get_canister_status' : ActorMethod<
    [],
    {
      'total_subscriptions' : bigint,
      'ed25519_key_name' : string,
      'active_timers' : bigint,
      'active_subscriptions' : bigint,
      'is_initialized' : boolean,
      'main_wallet' : string,
    }
  >,
  'get_comprehensive_wallet_info' : ActorMethod<[], Result_10>,
  /**
   * / Get current fee address (for use by Solana client)
   */
  'get_current_fee_address' : ActorMethod<[], string>,
  'get_cycle_status' : ActorMethod<[], CycleReport>,
  /**
   * / Retrieve encrypted metadata for a subscription
   * / Returns encrypted data that must be decrypted client-side
   */
  'get_encrypted_metadata' : ActorMethod<[SubscriptionId], Result_9>,
  'get_fee_config' : ActorMethod<[], Result_8>,
  /**
   * / Get current fee configuration and proposal status
   */
  'get_fee_governance_status' : ActorMethod<
    [],
    {
      'time_until_execution' : [] | [bigint],
      'current_address' : string,
      'proposal_time' : [] | [bigint],
      'proposed_address' : [] | [string],
      'is_proposal_pending' : boolean,
    }
  >,
  /**
   * / Get current network configuration
   */
  'get_network_config' : ActorMethod<
    [],
    {
      'network' : NetworkEnvironment,
      'rpc_endpoint' : string,
      'key_name' : string,
    }
  >,
  'get_overdue_subscriptions' : ActorMethod<[], Array<SubscriptionId>>,
  'get_read_only_users' : ActorMethod<[], Result_7>,
  'get_subscription' : ActorMethod<[SubscriptionId], [] | [Subscription]>,
  'get_system_metrics' : ActorMethod<
    [],
    {
      'paused_subscriptions' : bigint,
      'total_subscriptions' : bigint,
      'cycle_balance_estimate' : bigint,
      'total_payments_processed' : bigint,
      'active_subscriptions' : bigint,
      'uptime_seconds' : bigint,
      'failed_payments' : bigint,
    }
  >,
  'get_wallet_addresses' : ActorMethod<[], Result_6>,
  'get_wallet_balances' : ActorMethod<[], Result_5>,
  'initialize_canister' : ActorMethod<[], Result_4>,
  'initialize_first_admin' : ActorMethod<[], Result>,
  /**
   * / List all subscription IDs that have encrypted metadata (admin only)
   */
  'list_encrypted_metadata' : ActorMethod<[], Result_3>,
  'list_subscriptions' : ActorMethod<[], Array<Subscription>>,
  'monitor_cycles' : ActorMethod<[], Result_2>,
  'pause_subscription' : ActorMethod<[SubscriptionId], Result>,
  'ping' : ActorMethod<
    [],
    { 'status' : string, 'version' : string, 'timestamp' : Timestamp }
  >,
  /**
   * / Propose a new fee collection address (admin only)
   * / This starts a 7-day waiting period before the change can be executed
   */
  'propose_fee_address_change' : ActorMethod<[string], Result>,
  'refill_cycles_from_fees' : ActorMethod<[], Result_1>,
  'remove_admin' : ActorMethod<[Principal], Result>,
  'remove_read_only_user' : ActorMethod<[Principal], Result>,
  'report_health_metrics' : ActorMethod<
    [],
    {
      'status' : string,
      'health_check_counter' : bigint,
      'last_check' : Timestamp,
    }
  >,
  'resume_operations' : ActorMethod<[], Result_1>,
  'resume_subscription' : ActorMethod<[SubscriptionId], Result>,
  'set_cycle_threshold' : ActorMethod<[bigint], undefined>,
  /**
   * / Set the network environment (MUST be called before initialization)
   * / Only callable before canister is initialized to prevent accidental network switches
   */
  'set_network' : ActorMethod<[NetworkEnvironment], Result>,
  /**
   * / Store encrypted metadata for a subscription
   * / Called by SDK after encrypting sensitive data client-side
   */
  'store_encrypted_metadata' : ActorMethod<
    [
      SubscriptionId,
      Uint8Array | number[],
      Uint8Array | number[],
      string,
      number,
    ],
    Result
  >,
  'update_fee_config' : ActorMethod<[FeeConfig], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
