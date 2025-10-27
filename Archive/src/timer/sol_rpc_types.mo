// SOL RPC Canister Types for Chain Fusion Integration
// Official Canister ID: tghme-zyaaa-aaaar-qarca-cai
// Documentation: https://github.com/dfinity/sol-rpc-canister

import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";

module {
    // Solana RPC cluster configuration
    public type SolanaCluster = {
        #Mainnet;
        #Devnet;
        #Testnet;
    };

    // RPC provider sources
    public type RpcProvider = {
        #Alchemy;
        #Ankr;
        #Chainstack;
        #Helius;
        #dRPC;
        #PublicNode;
        #Custom: Text; // Custom RPC URL
    };

    public type RpcSources = {
        #Default: SolanaCluster; // Use default providers for the cluster
        #Custom: {
            providers: [RpcProvider];
            cluster: SolanaCluster;
        };
    };

    // Commitment levels for Solana
    public type CommitmentLevel = {
        #Processed;
        #Confirmed;
        #Finalized;
    };

    // Solana account information
    public type AccountInfo = {
        lamports: Nat64;
        owner: Blob; // 32 bytes - program that owns this account
        executable: Bool;
        rent_epoch: Nat64;
        data: Blob;
    };

    // Transaction signature status
    public type SignatureStatus = {
        slot: Nat64;
        confirmations: ?Nat64;
        err: ?Text;
        confirmation_status: ?CommitmentLevel;
    };

    // Request/Response types for common Solana RPC methods

    // getBalance
    public type GetBalanceParams = {
        address: Text; // Base58 encoded address
        commitment: ?CommitmentLevel;
    };

    public type GetBalanceResult = {
        value: Nat64; // Balance in lamports
    };

    // getAccountInfo
    public type GetAccountInfoParams = {
        address: Text;
        commitment: ?CommitmentLevel;
        encoding: ?Text; // "base58", "base64", "jsonParsed"
    };

    public type GetAccountInfoResult = {
        value: ?AccountInfo;
    };

    // getRecentBlockhash / getLatestBlockhash
    public type GetLatestBlockhashParams = {
        commitment: ?CommitmentLevel;
    };

    public type GetLatestBlockhashResult = {
        blockhash: Text; // Base58 encoded blockhash
        last_valid_block_height: Nat64;
    };

    // sendTransaction
    public type SendTransactionParams = {
        transaction: Blob; // Serialized, signed transaction
        encoding: ?Text; // "base58" or "base64"
        skip_preflight: ?Bool;
        preflight_commitment: ?CommitmentLevel;
        max_retries: ?Nat64;
        min_context_slot: ?Nat64;
    };

    public type SendTransactionResult = {
        signature: Text; // Base58 encoded transaction signature
    };

    // getSignatureStatuses
    public type GetSignatureStatusesParams = {
        signatures: [Text]; // Array of transaction signatures
        search_transaction_history: ?Bool;
    };

    public type GetSignatureStatusesResult = {
        value: [?SignatureStatus];
    };

    // getSlot
    public type GetSlotParams = {
        commitment: ?CommitmentLevel;
        min_context_slot: ?Nat64;
    };

    public type GetSlotResult = Nat64; // Current slot

    // getTokenAccountBalance
    public type GetTokenAccountBalanceParams = {
        token_account: Text; // Base58 encoded token account address
        commitment: ?CommitmentLevel;
    };

    public type TokenAmount = {
        amount: Text; // Raw token amount as string
        decimals: Nat8;
        ui_amount: ?Float; // Human-readable amount
        ui_amount_string: Text;
    };

    public type GetTokenAccountBalanceResult = {
        value: TokenAmount;
    };

    // getTokenAccountsByOwner
    public type GetTokenAccountsByOwnerParams = {
        owner: Text; // Base58 encoded owner address
        mint: ?Text; // Optional: filter by mint address
        program_id: ?Text; // Optional: filter by token program (default SPL Token)
        commitment: ?CommitmentLevel;
        encoding: ?Text; // "base58", "base64", "jsonParsed"
    };

    public type TokenAccountInfo = {
        pubkey: Text; // Token account address
        account: {
            data: {
                parsed: {
                    info: {
                        mint: Text;
                        owner: Text;
                        tokenAmount: TokenAmount;
                    };
                    type_: Text;
                };
                program: Text;
                space: Nat64;
            };
            executable: Bool;
            lamports: Nat64;
            owner: Text;
            rentEpoch: Nat64;
        };
    };

    public type GetTokenAccountsByOwnerResult = {
        value: [TokenAccountInfo];
    };

    // RPC Error type
    public type RpcError = {
        code: Int;
        message: Text;
        data: ?Text;
    };

    // Generic RPC response wrapper
    public type RpcResponse<T> = {
        #Ok: T;
        #Err: RpcError;
    };

    // RPC Configuration
    public type RpcConfig = {
        responseSizeEstimate: ?Nat64;
        responseConsensus: ?{
            #Equality;
            #Threshold: {
                total: ?Nat8;
                min: Nat8;
            };
        };
    };

    // Multi-result types (canister queries multiple providers)
    public type MultiGetBalanceResult = {
        #Ok: GetBalanceResult;
        #Err: RpcError;
    };

    public type MultiGetLatestBlockhashResult = {
        #Ok: GetLatestBlockhashResult;
        #Err: RpcError;
    };

    public type MultiSendTransactionResult = {
        #Ok: SendTransactionResult;
        #Err: RpcError;
    };

    public type MultiGetTokenAccountBalanceResult = {
        #Ok: GetTokenAccountBalanceResult;
        #Err: RpcError;
    };

    // SOL RPC Canister Actor Interface (updated to match actual deployed interface)
    public type SolRpcCanister = actor {
        // Balance queries
        getBalance: shared (RpcSources, ?RpcConfig, GetBalanceParams) -> async MultiGetBalanceResult;

        // Blockhash queries
        getLatestBlockhash: shared (RpcSources, ?RpcConfig, GetLatestBlockhashParams) -> async MultiGetLatestBlockhashResult;

        // Send transaction
        sendTransaction: shared (RpcSources, ?RpcConfig, SendTransactionParams) -> async MultiSendTransactionResult;

        // Token account balance
        getTokenAccountBalance: shared (RpcSources, ?RpcConfig, GetTokenAccountBalanceParams) -> async MultiGetTokenAccountBalanceResult;
    };

    // Helper function to create SOL RPC canister actor
    public func get_sol_rpc_canister(): SolRpcCanister {
        // Official mainnet SOL RPC canister ID
        actor("tghme-zyaaa-aaaar-qarca-cai")
    };

    // Helper: Create default commitment level
    public func default_commitment(): ?CommitmentLevel {
        ?#Confirmed
    };

    // Helper: Create finalized commitment level
    public func finalized_commitment(): ?CommitmentLevel {
        ?#Finalized
    };
}
