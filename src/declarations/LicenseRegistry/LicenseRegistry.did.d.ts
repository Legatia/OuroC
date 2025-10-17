import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type ApiKey = string;
export interface Developer {
  'id' : DeveloperId,
  'usage_stats' : UsageStats,
  'name' : string,
  'tier' : LicenseTier,
  'created_at' : bigint,
  'last_active' : bigint,
  'email' : string,
  'is_active' : boolean,
  'api_keys' : Array<ApiKey>,
}
export type DeveloperId = Principal;
export type LicenseTier = { 'Enterprise' : null } |
  { 'Beta' : null } |
  { 'Community' : null };
export interface LicenseValidation {
  'rate_limit_remaining' : bigint,
  'tier' : [] | [LicenseTier],
  'is_valid' : boolean,
  'message' : string,
  'developer_id' : [] | [DeveloperId],
  'expires_at' : bigint,
}
export interface RegistrationRequest {
  'project_description' : string,
  'name' : string,
  'tier' : LicenseTier,
  'email' : string,
}
export type Result = {
    'ok' : { 'api_key' : ApiKey, 'developer_id' : DeveloperId }
  } |
  { 'err' : string };
export type Result_1 = { 'ok' : null } |
  { 'err' : string };
export type Result_2 = { 'ok' : Developer } |
  { 'err' : string };
export interface UsageStats {
  'subscriptions_created' : bigint,
  'last_payment' : [] | [bigint],
  'subscriptions_active' : bigint,
  'monthly_usage' : Array<[bigint, bigint]>,
  'payments_processed' : bigint,
}
export interface _SERVICE {
  'add_admin' : ActorMethod<[Principal], Result_1>,
  'consume_license_usage' : ActorMethod<[ApiKey], Result_1>,
  'get_admins' : ActorMethod<[], Array<Principal>>,
  'get_developer_info' : ActorMethod<[DeveloperId], Result_2>,
  'get_registry_stats' : ActorMethod<
    [],
    {
      'beta_users' : bigint,
      'total_subscriptions' : bigint,
      'total_api_keys' : bigint,
      'active_developers' : bigint,
      'total_developers' : bigint,
      'enterprise_users' : bigint,
      'community_users' : bigint,
    }
  >,
  'initialize_registry' : ActorMethod<[], Result_1>,
  'register_developer' : ActorMethod<[RegistrationRequest], Result>,
  'validate_license' : ActorMethod<[ApiKey], LicenseValidation>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
