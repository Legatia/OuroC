import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CanisterHealth {
  'status' : CanisterStatus,
  'last_health_check' : bigint,
  'is_degraded' : boolean,
  'active_timers' : bigint,
  'subscription_count' : bigint,
  'cycle_balance' : bigint,
  'uptime_seconds' : bigint,
  'failed_payments' : number,
  'memory_usage' : bigint,
  'degradation_reason' : [] | [string],
}
export type CanisterStatus = { 'Healthy' : null } |
  { 'Critical' : null } |
  { 'Offline' : null } |
  { 'Degraded' : null };
export interface CreateSubscriptionRequest {
  'subscription_id' : string,
  'api_key' : string,
  'solana_contract_address' : string,
  'payment_token_mint' : string,
  'start_time' : [] | [bigint],
  'interval_seconds' : bigint,
  'subscriber_address' : string,
  'amount' : bigint,
  'merchant_address' : string,
}
export interface CycleReport {
  'total_consumed' : bigint,
  'threshold_balance' : bigint,
  'last_refill' : [] | [bigint],
  'current_balance' : bigint,
  'auto_refill_enabled' : boolean,
  'total_refilled' : bigint,
}
export interface EncryptedMetadata {
  'iv' : Uint8Array | number[],
  'encrypted_data' : Uint8Array | number[],
  'subscription_id' : string,
  'created_at' : bigint,
  'version' : number,
  'encrypted_by' : string,
  'data_hash' : string,
}
export interface FeeConfig {
  'cycle_refill_ratio' : number,
  'gas_reserve_lamports' : bigint,
  'trigger_fee_lamports' : bigint,
}
export type LicenseTier = { 'Enterprise' : null } |
  { 'Beta' : null } |
  { 'Community' : null };
export interface LicenseValidationResult {
  'rate_limit_remaining' : bigint,
  'tier' : [] | [LicenseTier],
  'is_valid' : boolean,
  'message' : string,
  'developer_id' : [] | [string],
  'expires_at' : bigint,
}
export type NetworkEnvironment = { 'Mainnet' : null } |
  { 'Testnet' : null } |
  { 'Devnet' : null };
export interface Subscription {
  'id' : string,
  'last_error' : [] | [string],
  'status' : SubscriptionStatus,
  'trigger_count' : bigint,
  'created_at' : bigint,
  'next_execution' : bigint,
  'solana_contract_address' : string,
  'payment_token_mint' : string,
  'interval_seconds' : bigint,
  'subscriber_address' : string,
  'failed_payment_count' : number,
  'last_failure_time' : [] | [bigint],
  'last_triggered' : [] | [bigint],
  'merchant_address' : string,
}
export type SubscriptionStatus = { 'Paused' : null } |
  { 'Active' : null } |
  { 'Cancelled' : null } |
  { 'Expired' : null };
export interface SystemMetrics {
  'total_instructions' : bigint,
  'canister_id' : string,
  'stable_memory_size' : bigint,
  'cycle_balance' : bigint,
  'timestamp' : bigint,
  'heap_size' : bigint,
  'uptime_seconds' : bigint,
  'memory_usage' : bigint,
}
export interface WalletBalance { 'lamports' : bigint, 'last_updated' : bigint }
export interface WalletInfo {
  'main_address' : string,
  'last_updated' : bigint,
  'main_balance' : bigint,
}
export interface _SERVICE {
  'add_admin' : ActorMethod<[string], { 'Ok' : null } | { 'Err' : string }>,
  'add_controller_admin' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'add_read_only_user' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'admin_withdraw_sol' : ActorMethod<
    [string, bigint, [] | [Uint8Array | number[]]],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'admin_withdraw_token' : ActorMethod<
    [string, string, bigint, [] | [Uint8Array | number[]]],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'cancel_fee_address_proposal' : ActorMethod<
    [],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'cancel_subscription' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'cleanup_old_subscriptions' : ActorMethod<[bigint], bigint>,
  'create_subscription' : ActorMethod<
    [CreateSubscriptionRequest],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'debug_admin_info' : ActorMethod<[], string>,
  'delete_encrypted_metadata' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'emergency_pause_all' : ActorMethod<
    [],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'enable_auto_refill' : ActorMethod<[boolean], undefined>,
  'execute_fee_address_change' : ActorMethod<
    [],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'get_admins' : ActorMethod<[], { 'Ok' : Array<string> } | { 'Err' : string }>,
  'get_balance_for_address' : ActorMethod<
    [string],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'get_balance_for_caller' : ActorMethod<
    [],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'get_canister_health' : ActorMethod<[], CanisterHealth>,
  'get_canister_status' : ActorMethod<
    [],
    [boolean, string, bigint, bigint, bigint]
  >,
  'get_comprehensive_wallet_info' : ActorMethod<
    [],
    { 'Ok' : WalletInfo } |
      { 'Err' : string }
  >,
  'get_comprehensive_wallet_info_v1' : ActorMethod<
    [],
    { 'Ok' : WalletInfo } |
      { 'Err' : string }
  >,
  'get_current_fee_address' : ActorMethod<[], string>,
  'get_cycle_status' : ActorMethod<[], CycleReport>,
  'get_ed25519_public_key' : ActorMethod<
    [],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'get_encrypted_metadata' : ActorMethod<[string], [] | [EncryptedMetadata]>,
  'get_fee_config' : ActorMethod<[], { 'Ok' : FeeConfig } | { 'Err' : string }>,
  'get_fee_governance_status' : ActorMethod<
    [],
    [string, [] | [string], [] | [bigint]]
  >,
  'get_license_info' : ActorMethod<
    [string],
    { 'Ok' : LicenseValidationResult } |
      { 'Err' : string }
  >,
  'get_network_config' : ActorMethod<[], [NetworkEnvironment, string, string]>,
  'get_overdue_subscriptions' : ActorMethod<[], Array<string>>,
  'get_read_only_users' : ActorMethod<
    [],
    { 'Ok' : Array<string> } |
      { 'Err' : string }
  >,
  'get_solana_address_for_caller' : ActorMethod<
    [],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'get_subscription' : ActorMethod<[string], [] | [Subscription]>,
  'get_system_metrics' : ActorMethod<[], SystemMetrics>,
  'get_wallet_addresses' : ActorMethod<
    [],
    { 'Ok' : WalletInfo } |
      { 'Err' : string }
  >,
  'get_wallet_balances' : ActorMethod<
    [],
    { 'Ok' : WalletBalance } |
      { 'Err' : string }
  >,
  'initialize_canister' : ActorMethod<
    [],
    { 'Ok' : [string, string] } |
      { 'Err' : string }
  >,
  'initialize_first_admin' : ActorMethod<
    [],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'list_encrypted_metadata' : ActorMethod<
    [],
    { 'Ok' : Array<string> } |
      { 'Err' : string }
  >,
  'list_subscriptions' : ActorMethod<[], Array<Subscription>>,
  'monitor_cycles' : ActorMethod<[], { 'Ok' : boolean } | { 'Err' : string }>,
  'pause_subscription' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'ping' : ActorMethod<[], [string, bigint, string]>,
  'propose_fee_address_change' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'refill_cycles_from_fees' : ActorMethod<
    [],
    { 'Ok' : bigint } |
      { 'Err' : string }
  >,
  'remove_admin' : ActorMethod<[string], { 'Ok' : null } | { 'Err' : string }>,
  'remove_read_only_user' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'report_health_metrics' : ActorMethod<[], undefined>,
  'resume_operations' : ActorMethod<[], { 'Ok' : bigint } | { 'Err' : string }>,
  'resume_subscription' : ActorMethod<
    [string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'set_cycle_threshold' : ActorMethod<[bigint], undefined>,
  'set_network' : ActorMethod<
    [NetworkEnvironment],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'store_encrypted_metadata' : ActorMethod<
    [string, Uint8Array | number[], Uint8Array | number[], string],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_fee_config' : ActorMethod<
    [FeeConfig],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
  'update_subscription_addresses' : ActorMethod<
    [string, [] | [string], [] | [string]],
    { 'Ok' : null } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
