import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
// IC management canister interface will be defined inline

module {
    public type PublicKey = Blob;
    public type Signature = Blob;
    public type MessageHash = Blob;
    public type DerivationPath = [Blob];

    // Threshold Ed25519 types for IC management canister
    public type EcdsaKeyId = {
        curve: {#ed25519};
        name: Text;
    };

    public type EcdsaPublicKeyArgument = {
        canister_id: ?Principal;
        derivation_path: DerivationPath;
        key_id: EcdsaKeyId;
    };

    public type EcdsaPublicKeyResult = {
        public_key: Blob;
        chain_code: Blob;
    };

    public type SignWithEcdsaArgument = {
        message_hash: Blob;
        derivation_path: DerivationPath;
        key_id: EcdsaKeyId;
    };

    public type SignWithEcdsaResult = {
        signature: Blob;
    };

    // Solana specific types
    public type SolanaKeypair = {
        public_key: PublicKey;
        derivation_path: DerivationPath;
    };

    public type SolanaTransaction = {
        recent_blockhash: Text;
        instructions: [SolanaInstruction];
        fee_payer: PublicKey;
    };

    public type SolanaInstruction = {
        program_id: PublicKey;
        accounts: [SolanaAccountMeta];
        data: Blob;
    };

    public type SolanaAccountMeta = {
        pubkey: PublicKey;
        is_signer: Bool;
        is_writable: Bool;
    };

    // IC management canister interface
    type IC = actor {
        ecdsa_public_key: (EcdsaPublicKeyArgument) -> async EcdsaPublicKeyResult;
        sign_with_ecdsa: (SignWithEcdsaArgument) -> async SignWithEcdsaResult;
    };

    public class ThresholdEd25519Manager(key_name: Text) {
        private let ic: IC = actor("aaaaa-aa");
        private let key_id: EcdsaKeyId = {
            curve = #ed25519;
            name = key_name;
        };

        // Derive a Solana public key for this canister
        public func derive_solana_keypair(derivation_path: DerivationPath): async Result.Result<SolanaKeypair, Text> {
            try {
                let public_key_arg: EcdsaPublicKeyArgument = {
                    canister_id = null; // Use calling canister's ID
                    derivation_path = derivation_path;
                    key_id = key_id;
                };

                let public_key_result = await (with cycles = 10_000_000_000) ic.ecdsa_public_key(public_key_arg);

                let keypair: SolanaKeypair = {
                    public_key = public_key_result.public_key;
                    derivation_path = derivation_path;
                };

                Debug.print("Derived Solana keypair with public key: " # debug_show(public_key_result.public_key));
                #ok(keypair)
            } catch (_) {
                Debug.print("Failed to derive Solana keypair");
                #err("Key derivation failed")
            }
        };

        // Sign a Solana transaction
        public func sign_solana_transaction(message_hash: MessageHash, derivation_path: DerivationPath): async Result.Result<Signature, Text> {
            try {
                let sign_arg: SignWithEcdsaArgument = {
                    message_hash = message_hash;
                    derivation_path = derivation_path;
                    key_id = key_id;
                };

                let sign_result = await (with cycles = 25_000_000_000) ic.sign_with_ecdsa(sign_arg);

                Debug.print("Transaction signed successfully");
                #ok(sign_result.signature)
            } catch (_) {
                Debug.print("Failed to sign transaction");
                #err("Signing failed")
            }
        };

        // Get the main canister keypair (using empty derivation path)
        public func get_main_keypair(): async Result.Result<SolanaKeypair, Text> {
            await derive_solana_keypair([])
        };

        // Get a subscription-specific keypair
        public func get_subscription_keypair(subscription_id: Text): async Result.Result<SolanaKeypair, Text> {
            let derivation_path = [Text.encodeUtf8("subscription"), Text.encodeUtf8(subscription_id)];
            await derive_solana_keypair(derivation_path)
        };

        // Get a fee collection keypair
        public func get_fee_collection_keypair(): async Result.Result<SolanaKeypair, Text> {
            let derivation_path = [Text.encodeUtf8("fee_collection")];
            await derive_solana_keypair(derivation_path)
        };
    };

    // Utility functions for Solana address conversion
    public func public_key_to_base58(public_key: PublicKey): Text {
        // Convert public key to base58 format for Solana
        let bytes = Blob.toArray(public_key);
        base58_encode(bytes)
    };

    // Base58 encoding implementation for Solana addresses
    private func base58_encode(input: [Nat8]): Text {
        let _alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

        if (input.size() == 0) { return "" };

        // Count leading zeros
        var leading_zeros = 0;
        label counting_loop for (byte in input.vals()) {
            if (byte == 0) { leading_zeros += 1 } else { break counting_loop }
        };

        // Convert bytes to big integer
        var num: Nat = 0;
        for (byte in input.vals()) {
            num := num * 256 + Nat8.toNat(byte);
        };

        // Convert to base58
        var result = "";
        while (num > 0) {
            let remainder = num % 58;
            let char_index = remainder;
            let char = switch (char_index) {
                case 0 { '1' }; case 1 { '2' }; case 2 { '3' }; case 3 { '4' }; case 4 { '5' };
                case 5 { '6' }; case 6 { '7' }; case 7 { '8' }; case 8 { '9' }; case 9 { 'A' };
                case 10 { 'B' }; case 11 { 'C' }; case 12 { 'D' }; case 13 { 'E' }; case 14 { 'F' };
                case 15 { 'G' }; case 16 { 'H' }; case 17 { 'J' }; case 18 { 'K' }; case 19 { 'L' };
                case 20 { 'M' }; case 21 { 'N' }; case 22 { 'P' }; case 23 { 'Q' }; case 24 { 'R' };
                case 25 { 'S' }; case 26 { 'T' }; case 27 { 'U' }; case 28 { 'V' }; case 29 { 'W' };
                case 30 { 'X' }; case 31 { 'Y' }; case 32 { 'Z' }; case 33 { 'a' }; case 34 { 'b' };
                case 35 { 'c' }; case 36 { 'd' }; case 37 { 'e' }; case 38 { 'f' }; case 39 { 'g' };
                case 40 { 'h' }; case 41 { 'i' }; case 42 { 'j' }; case 43 { 'k' }; case 44 { 'm' };
                case 45 { 'n' }; case 46 { 'o' }; case 47 { 'p' }; case 48 { 'q' }; case 49 { 'r' };
                case 50 { 's' }; case 51 { 't' }; case 52 { 'u' }; case 53 { 'v' }; case 54 { 'w' };
                case 55 { 'x' }; case 56 { 'y' }; case 57 { 'z' };
                case _ { '1' }; // fallback
            };
            result := Text.fromChar(char) # result;
            num := num / 58;
        };

        // Add leading '1's for leading zeros
        var prefix = "";
        for (i in Iter.range(0, leading_zeros - 1)) {
            prefix := prefix # "1";
        };

        prefix # result
    };

    // Create SOL transfer instruction (System Program)
    public func create_solana_transfer_instruction(
        from: PublicKey,
        to: PublicKey,
        lamports: Nat64
    ): SolanaInstruction {
        // System Program ID (11111111111111111111111111111111)
        let system_program_id = Blob.fromArray([
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ]);

        // System Program Transfer instruction
        // Format: [u32 instruction_index (2)] [u64 lamports (little-endian)]
        let instruction_data = Array.tabulate<Nat8>(12, func(i) {
            if (i < 4) {
                // Instruction index: 2 (Transfer) as little-endian u32
                if (i == 0) { 2 } else { 0 }
            } else {
                // Lamports amount as little-endian u64
                let byte_index: Nat = Nat.sub(i, 4);
                let shift: Nat = Nat.mul(byte_index, 8);
                Nat8.fromNat((Nat64.toNat(lamports) / (2 ** shift)) % 256)
            }
        });

        {
            program_id = system_program_id;
            accounts = [
                { pubkey = from; is_signer = true; is_writable = true },  // From (must sign)
                { pubkey = to; is_signer = false; is_writable = true }    // To
            ];
            data = Blob.fromArray(instruction_data);
        }
    };

    public func create_usdc_transfer_instruction(
        from_token_account: PublicKey,
        to_token_account: PublicKey,
        authority: PublicKey,
        amount: Nat64
    ): SolanaInstruction {
        // SPL Token Program ID (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
        let token_program_id = Blob.fromArray([
            6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70, 206, 235, 121, 172,
            28, 180, 133, 237, 95, 91, 55, 145, 58, 140, 245, 133, 126, 255, 0, 169
        ]);

        // SPL Token Transfer instruction (3) with amount in little-endian format
        let instruction_data = Array.tabulate<Nat8>(9, func(i) {
            if (i == 0) { 3 } // Transfer instruction
            else {
                // Convert amount to little-endian bytes
                let byte_index: Nat = Nat.sub(i, 1);
                let shift: Nat = Nat.mul(byte_index, 8);
                Nat8.fromNat((Nat64.toNat(amount) / (2 ** shift)) % 256)
            }
        });

        {
            program_id = token_program_id;
            accounts = [
                { pubkey = from_token_account; is_signer = false; is_writable = true }, // Source token account
                { pubkey = to_token_account; is_signer = false; is_writable = true },   // Destination token account
                { pubkey = authority; is_signer = true; is_writable = false }           // Authority (owner/delegate)
            ];
            data = Blob.fromArray(instruction_data);
        }
    };

    // Create a memo instruction for subscription identification
    public func create_memo_instruction(memo: Text): SolanaInstruction {
        // Memo Program ID (MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr)
        let memo_program_id = Blob.fromArray([
            5, 78, 193, 174, 4, 69, 79, 136, 82, 14, 81, 17, 135, 15, 133, 51,
            179, 71, 239, 117, 54, 85, 249, 206, 246, 74, 138, 145, 180, 8, 213, 18
        ]);

        {
            program_id = memo_program_id;
            accounts = [];
            data = Text.encodeUtf8(memo);
        }
    };
}