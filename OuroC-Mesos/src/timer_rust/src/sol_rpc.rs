// SOL RPC Client wrapper for interacting with IC's SOL RPC canister
// This module provides a clean interface to the mainnet SOL RPC canister: tghme-zyaaa-aaaar-qarca-cai

use crate::state::get_network_config;
use sol_rpc_client::{IcRuntime, SolRpcClient};
use sol_rpc_types::{
    CommitmentLevel,
};
use candid::Principal;

/// The IC mainnet SOL RPC canister ID
const SOL_RPC_CANISTER_ID: &str = "tghme-zyaaa-aaaar-qarca-cai";

/// Create a SOL RPC client configured for Solana Devnet
/// This client makes inter-canister calls to the IC's SOL RPC canister
/// Uses single provider (DrpcDevnet) for transaction submissions to avoid consensus issues
pub fn create_sol_rpc_client() -> SolRpcClient<IcRuntime> {
    let (_network_env, _key_name, _rpc_endpoint) = get_network_config();

    // Use single provider (DrpcDevnet) to avoid consensus issues with transaction submissions
    // This follows IC team's recommendation for write operations
    use sol_rpc_types::{RpcSources, RpcSource, SupportedRpcProviderId};

    let rpc_sources = RpcSources::Custom(vec![
        RpcSource::Supported(SupportedRpcProviderId::DrpcDevnet)
    ]);

    // Parse the SOL RPC canister ID
    let sol_rpc_principal = Principal::from_text(SOL_RPC_CANISTER_ID)
        .expect("Invalid SOL RPC canister ID");

    ic_cdk::println!("🔗 Creating SOL RPC client for canister: {}", SOL_RPC_CANISTER_ID);
    ic_cdk::println!("   Network: Solana Devnet");
    ic_cdk::println!("   Provider: DrpcDevnet (single provider for transaction consensus)");

    SolRpcClient::builder(IcRuntime, sol_rpc_principal)
        .with_rpc_sources(rpc_sources)
        .with_default_commitment_level(CommitmentLevel::Finalized)
        .build()
}

/// Get the SOL RPC canister ID as a Principal
pub fn get_sol_rpc_canister_id() -> Principal {
    Principal::from_text(SOL_RPC_CANISTER_ID)
        .expect("Invalid SOL RPC canister ID")
}
