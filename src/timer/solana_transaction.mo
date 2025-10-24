/**
 * Solana Transaction Builder for ICP
 *
 * Builds and signs Solana transactions to call process_trigger on the Solana smart contract
 */

import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Buffer "mo:base/Buffer";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Debug "mo:base/Debug";

import SHA256 "mo:sha2/Sha256";
import BaseX "mo:base-x-encoder";

module {
    public type SolanaAddress = Text;
    public type TransactionHash = Text;

    // Solana constants
    private let TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    private let ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
    private let SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
    private let MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
    private let SYSVAR_INSTRUCTIONS = "Sysvar1nstructions1111111111111111111111111";

    /**
     * Decode Base58 address to bytes
     */
    private func decodeBase58(address: Text): ?[Nat8] {
        switch (BaseX.fromBase58(address)) {
            case (#ok(bytes)) { ?bytes };
            case (#err(_)) { null };
        };
    };

    /**
     * Encode bytes to Base58 address
     */
    private func encodeBase58(bytes: [Nat8]): Text {
        BaseX.toBase58(bytes.vals())
    };

    /**
     * Derive Program Derived Address (PDA)
     *
     * @param seeds - Array of seed blobs
     * @param program_id - Program ID as base58 string
     * @returns PDA address as base58 string, or null if derivation fails
     */
    public func derivePDA(seeds: [Blob], program_id: SolanaAddress): ?SolanaAddress {
        let ?program_id_bytes = decodeBase58(program_id) else return null;

        // Try bumps from 255 down to 0
        var bump: Nat8 = 255;
        label finding loop {
            // Build hash input: seeds + program_id + bump
            let hash_buffer = Buffer.Buffer<Nat8>(256);

            // Add all seeds
            for (seed in seeds.vals()) {
                for (byte in Blob.toArray(seed).vals()) {
                    hash_buffer.add(byte);
                };
            };

            // Add bump seed
            hash_buffer.add(bump);

            // Add program ID
            for (byte in program_id_bytes.vals()) {
                hash_buffer.add(byte);
            };

            // Add PDA marker
            let pda_marker = Blob.toArray(Text.encodeUtf8("ProgramDerivedAddress"));
            for (byte in pda_marker.vals()) {
                hash_buffer.add(byte);
            };

            // SHA256 hash
            let hash_input = Buffer.toArray(hash_buffer);
            let hash = SHA256.fromBlob(#sha256, Blob.fromArray(hash_input));
            let hash_bytes = Blob.toArray(hash);

            // Check if point is on curve (simplified - check if not all zeros/ones)
            // In real Solana, this checks ed25519 curve
            // For now, we accept the first hash that looks reasonable
            if (not isOnCurve(hash_bytes)) {
                return ?encodeBase58(hash_bytes);
            };

            if (bump == 0) {
                break finding;
            };
            bump -= 1;
        };

        null
    };

    /**
     * Simple curve check - in production, this should check ed25519 curve
     * For now, just check it's not all zeros or all 255s
     */
    private func isOnCurve(point: [Nat8]): Bool {
        var all_zero = true;
        var all_ff = true;

        for (byte in point.vals()) {
            if (byte != 0) all_zero := false;
            if (byte != 255) all_ff := false;
        };

        all_zero or all_ff
    };

    /**
     * Get Associated Token Account address
     *
     * @param wallet - Wallet address
     * @param mint - Token mint address
     * @returns Associated token account address
     */
    public func getAssociatedTokenAccount(wallet: SolanaAddress, mint: SolanaAddress): ?SolanaAddress {
        let ?wallet_bytes = decodeBase58(wallet) else return null;
        let ?mint_bytes = decodeBase58(mint) else return null;
        let ?token_program_bytes = decodeBase58(TOKEN_PROGRAM_ID) else return null;

        let seeds: [Blob] = [
            Blob.fromArray(wallet_bytes),
            Blob.fromArray(token_program_bytes),
            Blob.fromArray(mint_bytes)
        ];

        derivePDA(seeds, ASSOCIATED_TOKEN_PROGRAM_ID)
    };

    /**
     * Generate Anchor instruction discriminator
     *
     * @param namespace - Usually "global" for Anchor programs
     * @param function_name - Function name like "process_trigger"
     * @returns 8-byte discriminator
     */
    public func getAnchorDiscriminator(namespace: Text, function_name: Text): [Nat8] {
        // Anchor discriminator is: sha256("namespace:function_name")[0..8]
        let input_text = namespace # ":" # function_name;
        let input_bytes = Blob.toArray(Text.encodeUtf8(input_text));
        let hash = SHA256.fromBlob(#sha256, Blob.fromArray(input_bytes));
        let hash_bytes = Blob.toArray(hash);

        // Take first 8 bytes
        Array.tabulate<Nat8>(8, func(i: Nat): Nat8 {
            if (i < hash_bytes.size()) hash_bytes[i] else 0
        })
    };

    /**
     * Serialize process_trigger arguments in Borsh format
     *
     * @param opcode - 0=payment, 1=notification
     * @param timestamp - Unix timestamp
     * @returns Borsh-serialized bytes
     */
    public func serializeTriggerArgs(opcode: Nat8, timestamp: Int): [Nat8] {
        let buffer = Buffer.Buffer<Nat8>(16);

        // 1. Opcode (u8): 1 byte
        buffer.add(opcode);

        // 2. icp_signature (Option<[u8; 64]>): 1 byte (None) or 1 byte + 64 bytes (Some)
        // For now, send None (0x00)
        // TODO: In production, generate ICP Chain Fusion signature
        buffer.add(0); // None

        // 3. Timestamp (i64): 8 bytes, little-endian
        let timestamp_i64 = Int64.fromInt(timestamp);
        let timestamp_bytes = int64ToLittleEndian(timestamp_i64);
        for (byte in timestamp_bytes.vals()) {
            buffer.add(byte);
        };

        Buffer.toArray(buffer)
    };

    /**
     * Convert Int64 to little-endian bytes
     */
    private func int64ToLittleEndian(value: Int64): [Nat8] {
        let v = Int64.toNat64(value);
        [
            Nat8.fromNat(Nat64.toNat(v & 0xFF)),
            Nat8.fromNat(Nat64.toNat((v >> 8) & 0xFF)),
            Nat8.fromNat(Nat64.toNat((v >> 16) & 0xFF)),
            Nat8.fromNat(Nat64.toNat((v >> 24) & 0xFF)),
            Nat8.fromNat(Nat64.toNat((v >> 32) & 0xFF)),
            Nat8.fromNat(Nat64.toNat((v >> 40) & 0xFF)),
            Nat8.fromNat(Nat64.toNat((v >> 48) & 0xFF)),
            Nat8.fromNat(Nat64.toNat((v >> 56) & 0xFF))
        ]
    };

    /**
     * Build instruction data for process_trigger
     *
     * @param opcode - 0=payment, 1=notification
     * @param timestamp - Unix timestamp
     * @returns Complete instruction data (discriminator + args)
     */
    public func buildProcessTriggerInstructionData(opcode: Nat8, timestamp: Int): [Nat8] {
        let discriminator = getAnchorDiscriminator("global", "process_trigger");
        let args = serializeTriggerArgs(opcode, timestamp);
        Array.append(discriminator, args)
    };

    /**
     * Account metadata for Solana transaction
     */
    public type AccountMeta = {
        pubkey: SolanaAddress;
        is_signer: Bool;
        is_writable: Bool;
    };

    /**
     * Build all required accounts for process_trigger instruction
     *
     * @returns Array of account metadata in correct order
     */
    public func buildProcessTriggerAccounts(
        contract_address: SolanaAddress,
        subscription_id: Text,
        subscriber_address: SolanaAddress,
        merchant_address: SolanaAddress,
        icp_trigger_authority: SolanaAddress,
        usdc_mint: SolanaAddress
    ): ?[AccountMeta] {
        // Derive subscription PDA
        let subscription_pda = derivePDA([
            Text.encodeUtf8("subscription"),
            Text.encodeUtf8(subscription_id)
        ], contract_address);

        // Derive config PDA
        let config_pda = derivePDA([
            Text.encodeUtf8("config")
        ], contract_address);

        // Get token accounts
        let subscriber_token = getAssociatedTokenAccount(subscriber_address, usdc_mint);
        let merchant_token = getAssociatedTokenAccount(merchant_address, usdc_mint);
        let icp_fee_token = getAssociatedTokenAccount(icp_trigger_authority, usdc_mint);

        // Validate all derivations succeeded
        let ?sub_pda = subscription_pda else return null;
        let ?cfg_pda = config_pda else return null;
        let ?sub_token = subscriber_token else return null;
        let ?merch_token = merchant_token else return null;
        let ?icp_token = icp_fee_token else return null;

        // Build accounts array matching ProcessTrigger struct order
        ?[
            { pubkey = sub_pda; is_signer = false; is_writable = true },           // 0: subscription
            { pubkey = cfg_pda; is_signer = false; is_writable = false },          // 1: config
            { pubkey = icp_trigger_authority; is_signer = true; is_writable = true }, // 2: trigger_authority
            { pubkey = sub_token; is_signer = false; is_writable = true },         // 3: subscriber_token_account
            { pubkey = merch_token; is_signer = false; is_writable = true },       // 4: merchant_usdc_account
            { pubkey = icp_token; is_signer = false; is_writable = true },         // 5: icp_fee_usdc_account
            { pubkey = usdc_mint; is_signer = false; is_writable = false },        // 6: usdc_mint
            { pubkey = sub_pda; is_signer = false; is_writable = false },          // 7: subscription_pda
            { pubkey = subscriber_address; is_signer = false; is_writable = true }, // 8: subscriber
            { pubkey = TOKEN_PROGRAM_ID; is_signer = false; is_writable = false }, // 9: token_program
            { pubkey = SYSTEM_PROGRAM_ID; is_signer = false; is_writable = false }, // 10: system_program
            { pubkey = MEMO_PROGRAM_ID; is_signer = false; is_writable = false },  // 11: memo_program
            { pubkey = SYSVAR_INSTRUCTIONS; is_signer = false; is_writable = false } // 12: instructions_sysvar
        ]
    };
}
