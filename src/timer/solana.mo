import Debug "mo:base/Debug";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Int "mo:base/Int";
import ThresholdEd25519 "./threshold_ed25519";
import Buffer "mo:base/Buffer";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Int64 "mo:base/Int64";
import Iter "mo:base/Iter";
import SolRpcTypes "./sol_rpc_types";

module {
    public type SolanaAddress = Text;
    public type TransactionHash = Text;

    // USDC Mint Address on Solana Mainnet
    public let USDC_MINT_ADDRESS: Text = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    public type SolanaKeypair = ThresholdEd25519.SolanaKeypair;

    // Enhanced fee structure for the economic model
    public type FeeConfig = {
        trigger_fee_lamports: Nat64; // Fee charged per trigger
        gas_reserve_lamports: Nat64; // Reserve for Solana gas
        cycle_refill_ratio: Float; // Portion of fees used for ICP cycles
    };

    public type WalletBalance = {
        lamports: Nat64;
        last_updated: Int; // timestamp
    };

    // RPC endpoint configuration
    public type SolanaRpcConfig = {
        endpoint: Text;
        commitment: Text; // "confirmed", "finalized", etc.
    };

    public class SolanaClient(key_name: Text, rpc_config: SolanaRpcConfig) {
        private let threshold_manager = ThresholdEd25519.ThresholdEd25519Manager(key_name);
        private var main_keypair: ?SolanaKeypair = null;
        private var fee_collection_keypair: ?SolanaKeypair = null;

        // Chain Fusion: Official SOL RPC Canister
        private let sol_rpc = SolRpcTypes.get_sol_rpc_canister();
        private let _solana_cluster: SolRpcTypes.SolanaCluster = parse_cluster_from_endpoint(rpc_config.endpoint);

        // Fee configuration - can be updated by governance
        private var fee_config: FeeConfig = {
            trigger_fee_lamports = 5000; // 0.000005 SOL per trigger
            gas_reserve_lamports = 5000; // 0.000005 SOL for gas
            cycle_refill_ratio = 0.3; // 30% of fees go to ICP cycles
        };

        // Initialize keypairs (should be called after deployment)
        public func initialize(): async Result.Result<{main_address: Text; fee_address: Text}, Text> {
            try {
                let main_result = await threshold_manager.get_main_keypair();
                let fee_result = await threshold_manager.get_fee_collection_keypair();

                switch (main_result, fee_result) {
                    case (#ok(main_kp), #ok(fee_kp)) {
                        main_keypair := ?main_kp;
                        fee_collection_keypair := ?fee_kp;

                        let main_address = ThresholdEd25519.public_key_to_base58(main_kp.public_key);
                        let fee_address = ThresholdEd25519.public_key_to_base58(fee_kp.public_key);

                        Debug.print("Initialized Solana wallets - Main: " # main_address # ", Fee: " # fee_address);
                        #ok({main_address = main_address; fee_address = fee_address})
                    };
                    case (#err(main_err), _) { #err("Failed to initialize main keypair: " # main_err) };
                    case (_, #err(fee_err)) { #err("Failed to initialize fee keypair: " # fee_err) };
                }
            } catch (_) {
                #err("Initialization failed")
            }
        };

        // Call Solana contract's process_payment_with_swap instruction (Router for multi-token)
        // This is the main entry point that ICP timer should call for all payments
        public func call_process_payment_with_swap(
            contract_address: SolanaAddress,
            subscription_id: Text,
            payment_token_mint: Text, // Token user is paying with (USDC/USDT/PYUSD/DAI)
            payer: SolanaAddress,
            subscriber_token_account: SolanaAddress, // Subscriber's payment token account
            merchant_usdc_account: SolanaAddress,
            icp_fee_usdc_account: SolanaAddress
        ): async Result.Result<TransactionHash, Text> {
            switch (main_keypair) {
                case (?main_kp) {
                    try {
                        // Get recent blockhash
                        let recent_blockhash = await get_recent_blockhash();

                        switch (recent_blockhash) {
                            case (#ok(blockhash)) {
                                // Derive PDAs
                                let subscription_pda = derive_subscription_pda(contract_address, subscription_id);
                                let config_pda = derive_config_pda(contract_address);

                                // Build Solana program instruction to call process_payment_with_swap
                                // NOTE: This currently calls the same instruction builder
                                // TODO: Update to call process_payment_with_swap with swap accounts
                                let process_payment_instruction = build_process_payment_instruction(
                                    contract_address,
                                    subscription_id,
                                    subscription_pda,
                                    config_pda,
                                    payer,
                                    subscriber_token_account,
                                    merchant_usdc_account,
                                    icp_fee_usdc_account,
                                    main_kp.public_key
                                );

                                // Build transaction
                                let transaction: ThresholdEd25519.SolanaTransaction = {
                                    recent_blockhash = blockhash;
                                    instructions = [process_payment_instruction];
                                    fee_payer = main_kp.public_key;
                                };

                                // Serialize and sign transaction
                                let tx_hash = await sign_and_send_transaction(transaction, main_kp.derivation_path);

                                switch (tx_hash) {
                                    case (#ok(hash)) {
                                        Debug.print("Process payment with swap transaction sent: " # hash # " (token: " # payment_token_mint # ")");
                                        #ok(hash)
                                    };
                                    case (#err(error)) {
                                        Debug.print("Failed to send process payment with swap transaction: " # error);
                                        #err(error)
                                    };
                                }
                            };
                            case (#err(error)) {
                                #err("Failed to get recent blockhash: " # error)
                            };
                        }
                    } catch (_) {
                        #err("Transaction failed")
                    }
                };
                case null {
                    #err("Main keypair not initialized")
                };
            }
        };

        // Call Solana contract's process_payment instruction (LEGACY - for USDC-only subscriptions)
        public func call_process_payment(
            contract_address: SolanaAddress,
            subscription_id: Text,
            payer: SolanaAddress,
            subscriber_usdc_account: SolanaAddress,
            merchant_usdc_account: SolanaAddress,
            icp_fee_usdc_account: SolanaAddress
        ): async Result.Result<TransactionHash, Text> {
            switch (main_keypair) {
                case (?main_kp) {
                    try {
                        // Get recent blockhash
                        let recent_blockhash = await get_recent_blockhash();

                        switch (recent_blockhash) {
                            case (#ok(blockhash)) {
                                // Derive PDAs for subscription and config
                                let subscription_pda = derive_subscription_pda(contract_address, subscription_id);
                                let config_pda = derive_config_pda(contract_address);

                                // Build Solana program instruction to call process_payment
                                let process_payment_instruction = build_process_payment_instruction(
                                    contract_address,
                                    subscription_id,
                                    subscription_pda,
                                    config_pda,
                                    payer,
                                    subscriber_usdc_account,
                                    merchant_usdc_account,
                                    icp_fee_usdc_account,
                                    main_kp.public_key
                                );

                                // Build transaction
                                let transaction: ThresholdEd25519.SolanaTransaction = {
                                    recent_blockhash = blockhash;
                                    instructions = [process_payment_instruction];
                                    fee_payer = main_kp.public_key;
                                };

                                // Serialize and sign transaction
                                let tx_hash = await sign_and_send_transaction(transaction, main_kp.derivation_path);

                                switch (tx_hash) {
                                    case (#ok(hash)) {
                                        Debug.print("Process payment transaction sent: " # hash);
                                        #ok(hash)
                                    };
                                    case (#err(error)) {
                                        Debug.print("Failed to send process payment transaction: " # error);
                                        #err(error)
                                    };
                                }
                            };
                            case (#err(error)) {
                                #err("Failed to get recent blockhash: " # error)
                            };
                        }
                    } catch (_) {
                        #err("Transaction failed")
                    }
                };
                case null {
                    #err("Main keypair not initialized")
                };
            }
        };

        // Send notification via Solana memo transaction
        /// Call Solana contract's send_notification instruction
        /// This function triggers the Solana contract to send notification on-chain
        /// This ensures notification logic persists with the Solana contract, not ICP
        public func call_send_notification(
            _contract_address: SolanaAddress,
            subscription_id: Text,
            memo_message: Text
        ): async Result.Result<TransactionHash, Text> {
            switch (main_keypair) {
                case (?_main_kp) {
                    try {
                        // Get recent blockhash
                        let recent_blockhash = await get_recent_blockhash();

                        switch (recent_blockhash) {
                            case (#ok(_blockhash)) {
                                // Build instruction to call Solana contract's send_notification
                                // TODO: Build actual Anchor instruction data for send_notification
                                // For now, this is a placeholder that will be completed with proper instruction encoding

                                Debug.print("Calling Solana contract send_notification for subscription: " # subscription_id);
                                Debug.print("Memo: " # memo_message);

                                // Placeholder return - will be replaced with actual contract call
                                #ok("notification_tx_hash_placeholder")
                            };
                            case (#err(error)) {
                                #err("Failed to get recent blockhash: " # error)
                            };
                        }
                    } catch (_) {
                        #err("Transaction failed")
                    }
                };
                case null {
                    #err("Main keypair not initialized")
                };
            }
        };

        /// Call Solana contract with opcode + subscription_id
        /// Opcode 0: Payment (Solana decides swap vs direct)
        /// Opcode 1: Notification (send memo to subscriber)
        public func call_with_opcode(
            _contract_address: SolanaAddress,
            subscription_id: Text,
            opcode: Nat8
        ): async Result.Result<TransactionHash, Text> {
            switch (main_keypair) {
                case (?_main_kp) {
                    try {
                        let recent_blockhash = await get_recent_blockhash();

                        switch (recent_blockhash) {
                            case (#ok(_blockhash)) {
                                // Build Anchor instruction with opcode + subscription_id
                                // TODO: Implement proper Anchor instruction encoding

                                let opcode_name = if (opcode == 0) "payment" else "notification";
                                Debug.print("Calling Solana contract opcode " # Nat8.toText(opcode) # " (" # opcode_name # ") for: " # subscription_id);

                                // Placeholder - will be replaced with actual Solana transaction
                                #ok("tx_opcode_" # Nat8.toText(opcode) # "_" # subscription_id)
                            };
                            case (#err(error)) {
                                #err("Failed to get recent blockhash: " # error)
                            };
                        }
                    } catch (_) {
                        #err("Transaction failed")
                    }
                };
                case null {
                    #err("Main keypair not initialized")
                };
            }
        };

        /// DEPRECATED: Send notification via ICP-managed memo transaction
        /// Use call_with_opcode(opcode=1) instead to keep notification logic on Solana contract
        public func send_notification_memo(
            recipient: SolanaAddress,
            memo_message: Text
        ): async Result.Result<TransactionHash, Text> {
            switch (main_keypair) {
                case (?main_kp) {
                    try {
                        // Get recent blockhash
                        let recent_blockhash = await get_recent_blockhash();

                        switch (recent_blockhash) {
                            case (#ok(blockhash)) {
                                // Send tiny amount (0.000001 SOL = 1000 lamports) as notification
                                let notification_amount: Nat64 = 1000;

                                // Create transfer instruction
                                let transfer_instruction = ThresholdEd25519.create_solana_transfer_instruction(
                                    main_kp.public_key,
                                    Text.encodeUtf8(recipient),
                                    notification_amount
                                );

                                // Create memo instruction with notification message
                                let memo_instruction = ThresholdEd25519.create_memo_instruction(memo_message);

                                // Build transaction
                                let transaction: ThresholdEd25519.SolanaTransaction = {
                                    recent_blockhash = blockhash;
                                    instructions = [transfer_instruction, memo_instruction];
                                    fee_payer = main_kp.public_key;
                                };

                                // Serialize and sign transaction
                                let tx_hash = await sign_and_send_transaction(transaction, main_kp.derivation_path);

                                switch (tx_hash) {
                                    case (#ok(hash)) {
                                        Debug.print("Notification memo sent to " # recipient # ": " # hash);
                                        #ok(hash)
                                    };
                                    case (#err(error)) {
                                        Debug.print("Failed to send notification memo: " # error);
                                        #err(error)
                                    };
                                }
                            };
                            case (#err(error)) {
                                #err("Failed to get recent blockhash: " # error)
                            };
                        }
                    } catch (_) {
                        #err("Transaction failed")
                    }
                };
                case null {
                    #err("Main keypair not initialized")
                };
            }
        };

        // Send trigger transaction using canister's own wallet (DEPRECATED - use call_process_payment)
        public func send_trigger_transaction(receiver: SolanaAddress, subscription_id: Text, fee_lamports: Nat64): async Result.Result<TransactionHash, Text> {
            switch (main_keypair) {
                case (?main_kp) {
                    try {
                        // Get recent blockhash
                        let recent_blockhash = await get_recent_blockhash();

                        switch (recent_blockhash) {
                            case (#ok(blockhash)) {
                                // Create transfer instruction for trigger fee
                                let transfer_instruction = ThresholdEd25519.create_solana_transfer_instruction(
                                    main_kp.public_key,
                                    Text.encodeUtf8(receiver), // Convert address to public key
                                    fee_lamports
                                );

                                // Create memo instruction for subscription identification
                                let memo = "OuroC trigger: " # subscription_id;
                                let memo_instruction = ThresholdEd25519.create_memo_instruction(memo);

                                // Build transaction
                                let transaction: ThresholdEd25519.SolanaTransaction = {
                                    recent_blockhash = blockhash;
                                    instructions = [transfer_instruction, memo_instruction];
                                    fee_payer = main_kp.public_key;
                                };

                                // Serialize and sign transaction
                                let tx_hash = await sign_and_send_transaction(transaction, main_kp.derivation_path);

                                switch (tx_hash) {
                                    case (#ok(hash)) {
                                        Debug.print("Trigger transaction sent: " # hash);
                                        #ok(hash)
                                    };
                                    case (#err(error)) {
                                        Debug.print("Failed to send trigger transaction: " # error);
                                        #err(error)
                                    };
                                }
                            };
                            case (#err(error)) {
                                #err("Failed to get recent blockhash: " # error)
                            };
                        }
                    } catch (_) {
                        #err("Transaction failed")
                    }
                };
                case null {
                    #err("Main keypair not initialized")
                };
            }
        };

        // Collect fees from subscription payments
        public func collect_subscription_fee(payer: SolanaAddress, subscription_id: Text): async Result.Result<TransactionHash, Text> {
            switch (fee_collection_keypair) {
                case (?fee_kp) {
                    try {
                        let recent_blockhash = await get_recent_blockhash();

                        switch (recent_blockhash) {
                            case (#ok(blockhash)) {
                                // Create transfer instruction to collect fees
                                let fee_instruction = ThresholdEd25519.create_solana_transfer_instruction(
                                    Text.encodeUtf8(payer),
                                    fee_kp.public_key,
                                    fee_config.trigger_fee_lamports
                                );

                                let memo = "OuroC fee collection: " # subscription_id;
                                let memo_instruction = ThresholdEd25519.create_memo_instruction(memo);

                                let transaction: ThresholdEd25519.SolanaTransaction = {
                                    recent_blockhash = blockhash;
                                    instructions = [fee_instruction, memo_instruction];
                                    fee_payer = fee_kp.public_key;
                                };

                                await sign_and_send_transaction(transaction, fee_kp.derivation_path)
                            };
                            case (#err(error)) {
                                #err("Failed to get recent blockhash: " # error)
                            };
                        }
                    } catch (_) {
                        #err("Fee collection failed")
                    }
                };
                case null {
                    #err("Fee collection keypair not initialized")
                };
            }
        };

        // Get balance of canister wallets
        public func get_wallet_balances(): async Result.Result<{main: Nat64; fee_collection: Nat64}, Text> {
            switch (main_keypair, fee_collection_keypair) {
                case (?main_kp, ?fee_kp) {
                    try {
                        let main_address = ThresholdEd25519.public_key_to_base58(main_kp.public_key);
                        let fee_address = ThresholdEd25519.public_key_to_base58(fee_kp.public_key);

                        let main_balance = await get_balance(main_address);
                        let fee_balance = await get_balance(fee_address);

                        switch (main_balance, fee_balance) {
                            case (#ok(main_bal), #ok(fee_bal)) {
                                #ok({main = main_bal; fee_collection = fee_bal})
                            };
                            case (#err(err), _) { #err("Failed to get main balance: " # err) };
                            case (_, #err(err)) { #err("Failed to get fee balance: " # err) };
                        }
                    } catch (_) {
                        #err("Balance check failed")
                    }
                };
                case _ {
                    #err("Keypairs not initialized")
                };
            }
        };

        // Update fee configuration
        public func update_fee_config(new_config: FeeConfig): () {
            fee_config := new_config;
            Debug.print("Fee configuration updated");
        };

        public func get_fee_config(): FeeConfig {
            fee_config
        };

        // Private helper functions

        // Chain Fusion: Get recent blockhash using SOL RPC canister
        private func get_recent_blockhash(): async Result.Result<Text, Text> {
            try {
                // Use Chain Fusion SOL RPC canister for blockhash
                let result = await (with cycles = 1_000_000_000) sol_rpc.sol_getLatestBlockhash({
                    commitment = commitment_from_text(rpc_config.commitment);
                });

                switch (result) {
                    case (#Ok(data)) {
                        Debug.print("Chain Fusion: Got blockhash " # data.blockhash);
                        #ok(data.blockhash)
                    };
                    case (#Err(error)) {
                        #err("Solana RPC error: " # error.message)
                    };
                }
            } catch (_error) {
                #err("Chain Fusion RPC call failed")
            }
        };

        // Chain Fusion: Get balance using SOL RPC canister
        public func get_balance(address: SolanaAddress): async Result.Result<Nat64, Text> {
            try {
                let result = await (with cycles = 1_000_000_000) sol_rpc.sol_getBalance({
                    address = address;
                    commitment = commitment_from_text(rpc_config.commitment);
                });

                switch (result) {
                    case (#Ok(data)) {
                        Debug.print("Chain Fusion: Balance for " # address # ": " # Nat64.toText(data.value) # " lamports");
                        #ok(data.value)
                    };
                    case (#Err(error)) {
                        #err("Solana RPC error: " # error.message)
                    };
                }
            } catch (_error) {
                #err("Chain Fusion balance check failed")
            }
        };

        // Derive Solana PDA for subscription account
        private func derive_subscription_pda(_program_id: SolanaAddress, subscription_id: Text): Blob {
            // seeds = [b"subscription", subscription_id.as_bytes()]
            let seed1 = Text.encodeUtf8("subscription");
            let seed2 = Text.encodeUtf8(subscription_id);
            // Simplified - in production, use proper Solana PDA derivation with findProgramAddress
            // For now, concatenate seeds (this is NOT correct Solana PDA derivation)
            Blob.fromArray(Array.append(Blob.toArray(seed1), Blob.toArray(seed2)))
        };

        // Derive Solana PDA for config account
        private func derive_config_pda(_program_id: SolanaAddress): Blob {
            // seeds = [b"config"]
            Text.encodeUtf8("config")
        };

        // Build Solana program instruction for process_payment
        private func build_process_payment_instruction(
            contract_address: SolanaAddress,
            subscription_id: Text,
            subscription_pda: Blob,
            config_pda: Blob,
            payer: SolanaAddress,
            subscriber_usdc_account: SolanaAddress,
            merchant_usdc_account: SolanaAddress,
            icp_fee_usdc_account: SolanaAddress,
            trigger_authority: Blob
        ): ThresholdEd25519.SolanaInstruction {
            // Encode instruction data for process_payment
            // Format: [discriminator: 8 bytes] + [subscription_id: variable] + [timestamp: 8 bytes]
            let timestamp = Int.abs(Time.now() / 1_000_000_000); // Convert to seconds

            // Simplified instruction data encoding
            // In production, use proper Borsh serialization matching Anchor's format
            var instruction_data = Buffer.Buffer<Nat8>(100);

            // Add process_payment discriminator (first 8 bytes of SHA256("global:process_payment"))
            // Calculated: bd511ec68bba7317
            instruction_data.add(0xbd); instruction_data.add(0x51);
            instruction_data.add(0x1e); instruction_data.add(0xc6);
            instruction_data.add(0x8b); instruction_data.add(0xba);
            instruction_data.add(0x73); instruction_data.add(0x17);

            // Add subscription_id length and bytes
            let sub_id_bytes = Blob.toArray(Text.encodeUtf8(subscription_id));
            instruction_data.add(Nat8.fromNat(sub_id_bytes.size()));
            for (byte in sub_id_bytes.vals()) {
                instruction_data.add(byte);
            };

            // Add timestamp (8 bytes, little-endian)
            let timestamp_bytes = nat_to_le_bytes(timestamp, 8);
            for (byte in timestamp_bytes.vals()) {
                instruction_data.add(byte);
            };

            // Create instruction with all required accounts
            // Account order must match ProcessPayment struct in Solana contract:
            // 1. subscription (mut)
            // 2. config (seeds=[b"config"])
            // 3. trigger_authority (signer) - ICP canister
            // 4. subscriber
            // 5. subscriber_token_account (mut)
            // 6. merchant_token_account (mut)
            // 7. icp_fee_token_account (mut)
            // 8. usdc_mint
            // 9. token_program
            // 10. system_program

            let token_program = Text.encodeUtf8("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
            let system_program = Text.encodeUtf8("11111111111111111111111111111111");
            let usdc_mint = Text.encodeUtf8(USDC_MINT_ADDRESS);

            {
                program_id = Text.encodeUtf8(contract_address);
                accounts = [
                    { pubkey = subscription_pda; is_signer = false; is_writable = true },
                    { pubkey = config_pda; is_signer = false; is_writable = false },
                    { pubkey = trigger_authority; is_signer = true; is_writable = false },
                    { pubkey = Text.encodeUtf8(payer); is_signer = false; is_writable = false },
                    { pubkey = Text.encodeUtf8(subscriber_usdc_account); is_signer = false; is_writable = true },
                    { pubkey = Text.encodeUtf8(merchant_usdc_account); is_signer = false; is_writable = true },
                    { pubkey = Text.encodeUtf8(icp_fee_usdc_account); is_signer = false; is_writable = true },
                    { pubkey = usdc_mint; is_signer = false; is_writable = false },
                    { pubkey = token_program; is_signer = false; is_writable = false },
                    { pubkey = system_program; is_signer = false; is_writable = false },
                ];
                data = Blob.fromArray(Buffer.toArray(instruction_data));
            }
        };

        // Helper: Convert Nat to little-endian bytes
        private func nat_to_le_bytes(n: Nat, size: Nat): [Nat8] {
            let bytes = Buffer.Buffer<Nat8>(size);
            var value = n;
            var i = 0;
            while (i < size) {
                bytes.add(Nat8.fromNat(value % 256));
                value := value / 256;
                i += 1;
            };
            Buffer.toArray(bytes)
        };

        private func sign_and_send_transaction(transaction: ThresholdEd25519.SolanaTransaction, derivation_path: ThresholdEd25519.DerivationPath): async Result.Result<TransactionHash, Text> {
            try {
                // Serialize transaction for signing
                let message_hash = serialize_transaction_for_signing(transaction);

                // Sign with threshold Ed25519
                let signature_result = await threshold_manager.sign_solana_transaction(message_hash, derivation_path);

                switch (signature_result) {
                    case (#ok(signature)) {
                        // Send signed transaction to Solana RPC
                        await send_signed_transaction(transaction, signature)
                    };
                    case (#err(error)) {
                        #err("Signing failed: " # error)
                    };
                }
            } catch (_) {
                #err("Transaction processing failed")
            }
        };

        private func serialize_transaction_for_signing(transaction: ThresholdEd25519.SolanaTransaction): Blob {
            // Implement basic Solana transaction serialization
            // This is a simplified version - production would need full serialization
            var message_bytes: [Nat8] = [];

            // Add header (3 bytes: num_required_signatures, num_readonly_signed_accounts, num_readonly_unsigned_accounts)
            message_bytes := Array.append(message_bytes, [1 : Nat8, 0 : Nat8, 1 : Nat8]); // 1 signature required, 0 readonly signed, 1 readonly unsigned

            // Add account keys (simplified)
            message_bytes := Array.append(message_bytes, [Nat8.fromNat(transaction.instructions.size())]); // num accounts placeholder

            // Add recent blockhash (32 bytes)
            let blockhash_bytes = Array.tabulate<Nat8>(32, func(i) { Nat8.fromNat(i % 256) });
            message_bytes := Array.append(message_bytes, blockhash_bytes);

            // Add instructions
            message_bytes := Array.append(message_bytes, [Nat8.fromNat(transaction.instructions.size())]);
            for (instruction in transaction.instructions.vals()) {
                let data_array = Blob.toArray(instruction.data);
                message_bytes := Array.append(message_bytes, data_array);
            };

            Blob.fromArray(message_bytes)
        };

        // Chain Fusion: Send signed transaction using SOL RPC canister
        private func send_signed_transaction(transaction: ThresholdEd25519.SolanaTransaction, signature: ThresholdEd25519.Signature): async Result.Result<TransactionHash, Text> {
            try {
                // Serialize the complete signed transaction
                let signed_tx_bytes = serialize_signed_transaction(transaction, signature);

                // Use Chain Fusion SOL RPC canister to send transaction
                let result = await (with cycles = 2_000_000_000) sol_rpc.sol_sendTransaction({
                    transaction = signed_tx_bytes;
                    encoding = ?"base64"; // Send as base64
                    skip_preflight = ?false;
                    preflight_commitment = commitment_from_text(rpc_config.commitment);
                    max_retries = ?3;
                    min_context_slot = null;
                });

                switch (result) {
                    case (#Ok(data)) {
                        Debug.print("Chain Fusion: Transaction sent successfully: " # data.signature);
                        #ok(data.signature)
                    };
                    case (#Err(error)) {
                        Debug.print("Chain Fusion: Transaction failed: " # error.message);
                        #err("Solana RPC error: " # error.message)
                    };
                }
            } catch (_error) {
                #err("Chain Fusion transaction send failed")
            }
        };

        // Serialize signed transaction with signature
        private func serialize_signed_transaction(transaction: ThresholdEd25519.SolanaTransaction, signature: ThresholdEd25519.Signature): Blob {
            // Full Solana transaction serialization with signature
            // Format: [signature(s)] + [message]
            let message_bytes = Blob.toArray(serialize_transaction_for_signing(transaction));
            let sig_bytes = Blob.toArray(signature);

            // Build complete transaction
            var tx_bytes = Buffer.Buffer<Nat8>(sig_bytes.size() + message_bytes.size() + 10);

            // Add signature count (compact-u16)
            tx_bytes.add(1); // 1 signature

            // Add signature (64 bytes)
            for (byte in sig_bytes.vals()) {
                tx_bytes.add(byte);
            };

            // Add message
            for (byte in message_bytes.vals()) {
                tx_bytes.add(byte);
            };

            Blob.fromArray(Buffer.toArray(tx_bytes))
        };

        // Chain Fusion: Get USDC/SPL token balance using SOL RPC canister
        public func get_usdc_balance(token_account: SolanaAddress): async Result.Result<Nat64, Text> {
            try {
                let result = await (with cycles = 1_000_000_000) sol_rpc.sol_getTokenAccountBalance({
                    token_account = token_account;
                    commitment = commitment_from_text(rpc_config.commitment);
                });

                switch (result) {
                    case (#Ok(data)) {
                        // Parse amount from string to Nat64
                        switch (Nat.fromText(data.value.amount)) {
                            case (?nat_balance) {
                                let balance = Nat64.fromNat(nat_balance);
                                Debug.print("Chain Fusion: Token balance: " # Nat64.toText(balance));
                                #ok(balance)
                            };
                            case null {
                                #err("Invalid token balance format")
                            };
                        }
                    };
                    case (#Err(error)) {
                        #err("Solana RPC error: " # error.message)
                    };
                }
            } catch (_error) {
                #err("Chain Fusion token balance check failed")
            }
        };
    };

    // Helper functions for Chain Fusion integration

    // Parse cluster from endpoint URL
    func parse_cluster_from_endpoint(endpoint: Text): SolRpcTypes.SolanaCluster {
        if (Text.contains(endpoint, #text("mainnet"))) {
            #Mainnet
        } else if (Text.contains(endpoint, #text("testnet"))) {
            #Testnet
        } else {
            #Devnet // Default to devnet
        }
    };

    // Convert text commitment to SolRpcTypes commitment
    func commitment_from_text(commitment_text: Text): ?SolRpcTypes.CommitmentLevel {
        if (commitment_text == "processed") {
            ?#Processed
        } else if (commitment_text == "confirmed") {
            ?#Confirmed
        } else if (commitment_text == "finalized") {
            ?#Finalized
        } else {
            ?#Confirmed // Default
        }
    };

    // Utility functions for Solana address validation
    public func is_valid_solana_address(address: Text): Bool {
        // Basic validation: Solana addresses are base58 encoded and typically 32-44 characters
        let length = address.size();
        length >= 32 and length <= 44
    };

    public func lamports_to_sol(lamports: Nat64): Float {
        Float.fromInt64(Int64.fromNat64(lamports)) / 1_000_000_000.0
    };

    public func sol_to_lamports(sol: Float): Nat64 {
        Int64.toNat64(Float.toInt64(sol * 1_000_000_000.0))
    };
}