export const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const ApiKey = IDL.Text;
  const DeveloperId = IDL.Principal;
  const UsageStats = IDL.Record({
    'subscriptions_created' : IDL.Nat,
    'last_payment' : IDL.Opt(IDL.Int),
    'subscriptions_active' : IDL.Nat,
    'monthly_usage' : IDL.Vec(IDL.Tuple(IDL.Int, IDL.Nat)),
    'payments_processed' : IDL.Nat,
  });
  const LicenseTier = IDL.Variant({
    'Enterprise' : IDL.Null,
    'Beta' : IDL.Null,
    'Community' : IDL.Null,
  });
  const Developer = IDL.Record({
    'id' : DeveloperId,
    'usage_stats' : UsageStats,
    'name' : IDL.Text,
    'tier' : LicenseTier,
    'created_at' : IDL.Int,
    'last_active' : IDL.Int,
    'email' : IDL.Text,
    'is_active' : IDL.Bool,
    'api_keys' : IDL.Vec(ApiKey),
  });
  const Result_2 = IDL.Variant({ 'ok' : Developer, 'err' : IDL.Text });
  const RegistrationRequest = IDL.Record({
    'project_description' : IDL.Text,
    'name' : IDL.Text,
    'tier' : LicenseTier,
    'email' : IDL.Text,
  });
  const Result = IDL.Variant({
    'ok' : IDL.Record({ 'api_key' : ApiKey, 'developer_id' : DeveloperId }),
    'err' : IDL.Text,
  });
  const LicenseValidation = IDL.Record({
    'rate_limit_remaining' : IDL.Nat,
    'tier' : IDL.Opt(LicenseTier),
    'is_valid' : IDL.Bool,
    'message' : IDL.Text,
    'developer_id' : IDL.Opt(DeveloperId),
    'expires_at' : IDL.Int,
  });
  return IDL.Service({
    'add_admin' : IDL.Func([IDL.Principal], [Result_1], []),
    'consume_license_usage' : IDL.Func([ApiKey], [Result_1], []),
    'get_admins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'get_developer_info' : IDL.Func([DeveloperId], [Result_2], ['query']),
    'get_registry_stats' : IDL.Func(
        [],
        [
          IDL.Record({
            'beta_users' : IDL.Nat,
            'total_subscriptions' : IDL.Nat,
            'total_api_keys' : IDL.Nat,
            'active_developers' : IDL.Nat,
            'total_developers' : IDL.Nat,
            'enterprise_users' : IDL.Nat,
            'community_users' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'initialize_registry' : IDL.Func([], [Result_1], []),
    'register_developer' : IDL.Func([RegistrationRequest], [Result], []),
    'validate_license' : IDL.Func([ApiKey], [LicenseValidation], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
