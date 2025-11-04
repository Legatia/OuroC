# Arc Integration Guide for OuroC-Mesos

This guide explains how to integrate the Arc smart contract with your existing OuroC-Mesos infrastructure.

## Overview

You now have **three deployment options** for OuroC-Mesos:

1. **Solana** (Current - Production Ready)
2. **Arc** (New - Testnet Ready)
3. **Multi-Chain** (Recommended - Support both)

## Architecture Changes

### Before (Solana Only)
```
Frontend → ICP Timer → Solana Contract → SPL Token (USDC)
```

### After (Multi-Chain)
```
                    ┌──→ Solana Contract → SPL Token (USDC)
Frontend → ICP Timer ┤
                    └──→ Arc Contract → Native USDC
```

## Step 1: ICP Timer Modifications

The ICP Timer Canister needs updates to support Arc (EVM) transactions.

### 1.1: Add Arc Configuration

File: `/OuroC-Mesos/src/timer_rust/src/lib.rs`

```rust
// Add Arc constants
const ARC_TESTNET_RPC: &str = "https://rpc.testnet.arc.network";
const ARC_TESTNET_CHAIN_ID: u64 = 0; // TODO: Get from Arc docs
const ARC_CONTRACT_ADDRESS: &str = "0x..."; // Deployed contract address

// Add to NetworkType enum
#[derive(CandidSerialize, CandidDeserialize, Clone, Debug, PartialEq)]
pub enum NetworkType {
    Solana,
    Arc,
}
```

### 1.2: Implement ECDSA Signing

Arc uses ECDSA (Ethereum standard), not Ed25519 (Solana standard).

File: `/OuroC-Mesos/src/timer_rust/src/threshold_ecdsa.rs` (new file)

```rust
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, SignWithEcdsaArgument,
};
use sha3::{Digest, Keccak256};

/// Sign message for Arc (ECDSA secp256k1)
pub async fn sign_arc_message(
    message: &[u8],
    key_name: String,
) -> Result<Vec<u8>, String> {
    // Hash message with keccak256 (Ethereum standard)
    let mut hasher = Keccak256::new();
    hasher.update(message);
    let message_hash = hasher.finalize();

    // Sign with ECDSA
    let request = SignWithEcdsaArgument {
        message_hash: message_hash.to_vec(),
        derivation_path: vec![],
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: key_name,
        },
    };

    match sign_with_ecdsa(request).await {
        Ok((response,)) => Ok(response.signature),
        Err(e) => Err(format!("ECDSA signing failed: {:?}", e)),
    }
}

/// Get ECDSA public key (for deriving Ethereum address)
pub async fn get_arc_public_key(key_name: String) -> Result<Vec<u8>, String> {
    let request = EcdsaKeyId {
        curve: EcdsaCurve::Secp256k1,
        name: key_name,
    };

    match ecdsa_public_key(request, vec![]).await {
        Ok((response,)) => Ok(response.public_key),
        Err(e) => Err(format!("Failed to get ECDSA public key: {:?}", e)),
    }
}

/// Derive Ethereum address from ECDSA public key
pub fn derive_ethereum_address(public_key: &[u8]) -> String {
    // Skip first byte (0x04 prefix for uncompressed key)
    let key = &public_key[1..];

    // Hash with Keccak256
    let mut hasher = Keccak256::new();
    hasher.update(key);
    let hash = hasher.finalize();

    // Take last 20 bytes
    let address = &hash[hash.len() - 20..];

    format!("0x{}", hex::encode(address))
}
```

### 1.3: Build Arc Transactions

File: `/OuroC-Mesos/src/timer_rust/src/arc_client.rs` (new file)

```rust
use ethers::{
    abi::{encode, Token},
    types::{TransactionRequest, U256},
    utils::keccak256,
};
use rlp::RlpStream;

pub struct ArcTransaction {
    pub nonce: U256,
    pub gas_price: U256,
    pub gas_limit: U256,
    pub to: String,
    pub value: U256,
    pub data: Vec<u8>,
    pub chain_id: u64,
}

impl ArcTransaction {
    /// Build RLP-encoded transaction
    pub fn encode(&self) -> Vec<u8> {
        let mut stream = RlpStream::new();
        stream.begin_list(9);
        stream.append(&self.nonce);
        stream.append(&self.gas_price);
        stream.append(&self.gas_limit);
        stream.append(&hex::decode(&self.to[2..]).unwrap());
        stream.append(&self.value);
        stream.append(&self.data);
        stream.append(&self.chain_id);
        stream.append(&0u8); // r (placeholder)
        stream.append(&0u8); // s (placeholder)
        stream.out().to_vec()
    }

    /// Get transaction hash for signing
    pub fn hash(&self) -> Vec<u8> {
        keccak256(&self.encode()).to_vec()
    }
}

/// Build processTrigger transaction
pub async fn build_process_trigger_tx(
    subscription_id: &[u8; 32],
    signature: &[u8],
    nonce_param: &[u8; 32],
    contract_address: &str,
    sender_nonce: U256,
) -> Result<Vec<u8>, String> {
    // Encode function call: processTrigger(bytes32, bytes, bytes32)
    let function_selector = &keccak256(b"processTrigger(bytes32,bytes,bytes32)")[..4];

    let encoded = encode(&[
        Token::FixedBytes(subscription_id.to_vec()),
        Token::Bytes(signature.to_vec()),
        Token::FixedBytes(nonce_param.to_vec()),
    ]);

    let data = [function_selector, &encoded].concat();

    let tx = ArcTransaction {
        nonce: sender_nonce,
        gas_price: U256::zero(), // Arc calculates USDC gas
        gas_limit: U256::from(200000),
        to: contract_address.to_string(),
        value: U256::zero(),
        data,
        chain_id: ARC_TESTNET_CHAIN_ID,
    };

    Ok(tx.encode())
}
```

### 1.4: HTTP Outcalls to Arc RPC

File: `/OuroC-Mesos/src/timer_rust/src/arc_rpc.rs` (new file)

```rust
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse,
};

/// Send transaction to Arc network
pub async fn send_arc_transaction(
    signed_tx: &[u8],
    rpc_url: &str,
) -> Result<String, String> {
    let request_body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_sendRawTransaction",
        "params": [format!("0x{}", hex::encode(signed_tx))],
        "id": 1
    });

    let request = CanisterHttpRequestArgument {
        url: rpc_url.to_string(),
        method: HttpMethod::POST,
        body: Some(request_body.to_string().into_bytes()),
        max_response_bytes: Some(2048),
        transform: None,
        headers: vec![
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request).await {
        Ok((response,)) => {
            let body = String::from_utf8(response.body)
                .map_err(|e| format!("Invalid UTF-8: {}", e))?;

            let json: serde_json::Value = serde_json::from_str(&body)
                .map_err(|e| format!("Invalid JSON: {}", e))?;

            if let Some(result) = json["result"].as_str() {
                Ok(result.to_string()) // Transaction hash
            } else if let Some(error) = json["error"].as_object() {
                Err(format!("RPC error: {:?}", error))
            } else {
                Err("Unexpected response format".to_string())
            }
        }
        Err(e) => Err(format!("HTTP outcall failed: {:?}", e)),
    }
}

/// Get transaction count (for nonce)
pub async fn get_transaction_count(
    address: &str,
    rpc_url: &str,
) -> Result<u64, String> {
    let request_body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getTransactionCount",
        "params": [address, "latest"],
        "id": 1
    });

    let request = CanisterHttpRequestArgument {
        url: rpc_url.to_string(),
        method: HttpMethod::POST,
        body: Some(request_body.to_string().into_bytes()),
        max_response_bytes: Some(1024),
        transform: None,
        headers: vec![
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
        ],
    };

    match http_request(request).await {
        Ok((response,)) => {
            let body = String::from_utf8(response.body)
                .map_err(|e| format!("Invalid UTF-8: {}", e))?;

            let json: serde_json::Value = serde_json::from_str(&body)
                .map_err(|e| format!("Invalid JSON: {}", e))?;

            if let Some(result) = json["result"].as_str() {
                let nonce = u64::from_str_radix(&result[2..], 16)
                    .map_err(|e| format!("Invalid nonce: {}", e))?;
                Ok(nonce)
            } else {
                Err("Failed to get transaction count".to_string())
            }
        }
        Err(e) => Err(format!("HTTP outcall failed: {:?}", e)),
    }
}
```

### 1.5: Update Main Timer Logic

File: `/OuroC-Mesos/src/timer_rust/src/subscription_manager.rs`

```rust
// Add to process_subscription function

pub async fn process_subscription(subscription_id: &str) -> Result<(), String> {
    let sub = get_subscription(subscription_id)?;

    match sub.network {
        NetworkType::Solana => {
            // Existing Solana logic
            process_solana_payment(subscription_id).await
        }
        NetworkType::Arc => {
            // New Arc logic
            process_arc_payment(subscription_id).await
        }
    }
}

async fn process_arc_payment(subscription_id: &str) -> Result<(), String> {
    let sub = get_subscription(subscription_id)?;

    // Generate unique nonce
    let nonce = generate_nonce();

    // Build message to sign
    let message = format!(
        "PROCESS_PAYMENT{}{}{}{}",
        subscription_id,
        sub.next_payment_time,
        sub.amount,
        hex::encode(&nonce)
    );

    // Sign with ECDSA
    let signature = sign_arc_message(message.as_bytes(), "key_1".to_string()).await?;

    // Get transaction count for nonce
    let tx_nonce = get_transaction_count(
        &get_arc_signer_address(),
        ARC_TESTNET_RPC
    ).await?;

    // Build transaction
    let tx = build_process_trigger_tx(
        subscription_id.as_bytes().try_into().unwrap(),
        &signature,
        &nonce,
        ARC_CONTRACT_ADDRESS,
        U256::from(tx_nonce),
    ).await?;

    // Sign transaction
    let tx_hash_for_signing = keccak256(&tx);
    let tx_signature = sign_arc_message(&tx_hash_for_signing, "key_1".to_string()).await?;

    // Combine signature with transaction (RLP encoding)
    let signed_tx = combine_tx_and_signature(&tx, &tx_signature);

    // Send to Arc network
    let result = send_arc_transaction(&signed_tx, ARC_TESTNET_RPC).await?;

    ic_cdk::println!("Arc payment processed: {}", result);
    Ok(())
}
```

## Step 2: Frontend Updates

### 2.1: Add Arc Network Configuration

File: `/OuroC-Mesos/frontend/src/lib/networks.ts` (new file)

```typescript
export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    ouroCPrima: string;
    usdc: string;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  solana: {
    id: "solana",
    name: "Solana Devnet",
    chainId: 0, // N/A for Solana
    rpcUrl: "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com",
    nativeCurrency: {
      name: "SOL",
      symbol: "SOL",
      decimals: 9,
    },
    contracts: {
      ouroCPrima: "7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub",
      usdc: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    },
  },
  arc: {
    id: "arc",
    name: "Arc Testnet",
    chainId: 0, // TODO: Get from Arc docs
    rpcUrl: import.meta.env.VITE_ARC_TESTNET_RPC || "https://rpc.testnet.arc.network",
    explorerUrl: "https://explorer.testnet.arc.network",
    nativeCurrency: {
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
    },
    contracts: {
      ouroCPrima: import.meta.env.VITE_ARC_CONTRACT_ADDRESS || "",
      usdc: import.meta.env.VITE_ARC_USDC_ADDRESS || "",
    },
  },
};
```

### 2.2: Add Arc Wallet Adapter

File: `/OuroC-Mesos/frontend/src/contexts/ArcWalletContext.tsx` (new file)

```typescript
import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

interface ArcWalletContextType {
  connected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const ArcWalletContext = createContext<ArcWalletContextType | undefined>(undefined);

export function ArcWalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  const connect = async () => {
    if (typeof window.ethereum === "undefined") {
      alert("Please install MetaMask or another Web3 wallet");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      // Switch to Arc network
      const arcChainId = `0x${NETWORKS.arc.chainId.toString(16)}`;
      try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: arcChainId }]);
      } catch (switchError: any) {
        // Chain not added, add it
        if (switchError.code === 4902) {
          await provider.send("wallet_addEthereumChain", [
            {
              chainId: arcChainId,
              chainName: NETWORKS.arc.name,
              rpcUrls: [NETWORKS.arc.rpcUrl],
              nativeCurrency: NETWORKS.arc.nativeCurrency,
              blockExplorerUrls: [NETWORKS.arc.explorerUrl],
            },
          ]);
        }
      }

      setProvider(provider);
      setAddress(accounts[0]);
      setConnected(true);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
    setProvider(null);
  };

  return (
    <ArcWalletContext.Provider value={{ connected, address, provider, connect, disconnect }}>
      {children}
    </ArcWalletContext.Provider>
  );
}

export const useArcWallet = () => {
  const context = useContext(ArcWalletContext);
  if (!context) throw new Error("useArcWallet must be used within ArcWalletProvider");
  return context;
};
```

### 2.3: Create Arc Contract Interface

File: `/OuroC-Mesos/frontend/src/lib/arcContract.ts` (new file)

```typescript
import { ethers } from "ethers";
import OuroCPrimaArcABI from "../../../arc-contract/artifacts/contracts/OuroCPrimaArc.sol/OuroCPrimaArc.json";
import { NETWORKS } from "./networks";

export async function createArcSubscription(
  provider: ethers.BrowserProvider,
  params: {
    subscriptionId: string;
    merchant: string;
    merchantName: string;
    amount: number; // In USDC (e.g., 15.99)
    intervalSeconds: number;
    reminderDays: number;
  }
) {
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(
    NETWORKS.arc.contracts.ouroCPrima,
    OuroCPrimaArcABI.abi,
    signer
  );

  // Convert amount to 6 decimals
  const amountWei = ethers.parseUnits(params.amount.toString(), 6);

  // Generate subscription ID
  const subscriptionId = ethers.id(params.subscriptionId);

  // Get ICP signature
  const nonce = ethers.randomBytes(32);
  const icpSignature = await getICPSignatureForArc({
    action: "CREATE_SUBSCRIPTION",
    subscriptionId,
    subscriber: await signer.getAddress(),
    merchant: params.merchant,
    amount: amountWei,
    intervalSeconds: params.intervalSeconds,
    nonce,
  });

  // Approve USDC spending
  const usdc = new ethers.Contract(
    NETWORKS.arc.contracts.usdc,
    ["function approve(address spender, uint256 amount) returns (bool)"],
    signer
  );

  const approvalAmount = amountWei * 100n; // Approve for 100 payments
  await usdc.approve(NETWORKS.arc.contracts.ouroCPrima, approvalAmount);

  // Create subscription
  const tx = await contract.createSubscription(
    subscriptionId,
    params.merchant,
    params.merchantName,
    amountWei,
    params.intervalSeconds,
    params.reminderDays,
    icpSignature,
    nonce
  );

  return await tx.wait();
}

async function getICPSignatureForArc(params: any): Promise<string> {
  // Call your ICP canister to get ECDSA signature
  const response = await fetch(`${import.meta.env.VITE_ICP_CANISTER_URL}/generate_arc_signature`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const { signature } = await response.json();
  return signature;
}
```

## Step 3: Testing

### 3.1: Test Arc Contract Locally

```bash
cd arc-contract

# Run tests
npm test

# Deploy to local Hardhat network
npx hardhat node
npm run deploy:local
```

### 3.2: Test ICP Timer with Arc

```bash
cd OuroC-Mesos

# Build ICP canister with Arc support
dfx build timer_rust

# Deploy locally
dfx deploy timer_rust

# Test Arc signing
dfx canister call timer_rust test_arc_signature '("test_message")'
```

### 3.3: Integration Test

1. Deploy Arc contract to testnet
2. Update ICP canister with contract address
3. Create test subscription from frontend
4. Wait for timer to trigger
5. Verify payment on Arc explorer

## Step 4: Deployment Checklist

### ICP Canister
- [ ] Add ECDSA key derivation path
- [ ] Test ECDSA signing on mainnet
- [ ] Update Arc RPC endpoints
- [ ] Set Arc contract address
- [ ] Test HTTP outcalls to Arc

### Arc Contract
- [ ] Deploy to Arc testnet
- [ ] Verify on Arc explorer
- [ ] Set ICP signer address
- [ ] Test subscription creation
- [ ] Test payment processing

### Frontend
- [ ] Add Arc wallet adapter
- [ ] Add network switcher UI
- [ ] Test Arc subscription flow
- [ ] Update documentation

## Troubleshooting

### ECDSA Signature Issues

**Problem**: ICP canister fails to generate ECDSA signature

**Solution**:
```rust
// Ensure you're using the correct key ID
let key_id = EcdsaKeyId {
    curve: EcdsaCurve::Secp256k1,
    name: "key_1".to_string(), // Use "test_key_1" for testnet
};
```

### Transaction Nonce Errors

**Problem**: Arc RPC rejects transaction with "nonce too low"

**Solution**:
```rust
// Always get fresh nonce before sending transaction
let nonce = get_transaction_count(&signer_address, rpc_url).await?;
```

### Gas Estimation

**Problem**: Transaction runs out of gas

**Solution**:
```solidity
// Increase gas limit in transaction builder
gas_limit: U256::from(300000), // Increased from 200000
```

## Next Steps

1. ✅ Arc contract deployed
2. ⏳ Update ICP timer for Arc
3. ⏳ Test end-to-end flow
4. ⏳ Update frontend UI
5. ⏳ Add CCTP V2 cross-chain
6. ⏳ Security audit
7. ⏳ Mainnet deployment

## Resources

- [Arc Documentation](https://arc.network/docs)
- [ICP ECDSA](https://internetcomputer.org/docs/current/developer-docs/integrations/t-ecdsa/)
- [Ethers.js Docs](https://docs.ethers.org/v6/)
- [Hardhat Docs](https://hardhat.org/docs)

---

**Need Help?** Check the Arc contract README or open an issue on GitHub.
