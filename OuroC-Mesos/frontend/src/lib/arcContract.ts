/**
 * Arc Smart Contract Integration
 * Handles interaction with the OuroC-Prima Arc (EVM) subscription contract
 */

import { ethers, BrowserProvider } from 'ethers';
import OuroCPrimaArcABI from '../abi/OuroCPrimaArc.json';
import { ARC_TESTNET } from './networks';

// ERC20 ABI (for USDC operations)
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/**
 * Subscription status enum (matches Solidity contract)
 */
export enum SubscriptionStatus {
  Active = 0,
  Paused = 1,
  Cancelled = 2,
}

/**
 * Arc subscription structure
 */
export interface ArcSubscription {
  id: string;
  subscriber: string;
  merchant: string;
  merchantName: string;
  amount: bigint;
  intervalSeconds: bigint;
  nextPaymentTime: bigint;
  status: SubscriptionStatus;
  createdAt: bigint;
  lastPaymentTime: bigint;
  paymentsMade: bigint;
  totalPaid: bigint;
  reminderDaysBeforePayment: number;
  consecutiveFailures: bigint;
}

/**
 * Get Arc contract instance
 */
export function getArcContract(
  providerOrSigner: BrowserProvider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(
    ARC_TESTNET.contracts.ouroCPrima,
    OuroCPrimaArcABI,
    providerOrSigner
  );
}

/**
 * Get USDC contract instance on Arc
 */
export function getUSDCContract(
  providerOrSigner: BrowserProvider | ethers.Signer
): ethers.Contract {
  return new ethers.Contract(
    ARC_TESTNET.contracts.usdc,
    ERC20_ABI,
    providerOrSigner
  );
}

/**
 * Get ICP signature for Arc contract interaction
 * Calls ICP canister to get ECDSA signature
 */
export async function getICPSignature(params: {
  action: string;
  subscriptionId: string;
  subscriber: string;
  merchant: string;
  amount: bigint;
  intervalSeconds: bigint;
  nonce: string;
}): Promise<string> {
  // TODO: Replace with actual ICP canister call
  const canisterUrl = import.meta.env.VITE_ICP_CANISTER_URL;

  if (!canisterUrl) {
    throw new Error('ICP canister URL not configured');
  }

  try {
    const response = await fetch(`${canisterUrl}/generate_arc_signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: params.action,
        subscriptionId: params.subscriptionId,
        subscriber: params.subscriber,
        merchant: params.merchant,
        amount: params.amount.toString(),
        intervalSeconds: params.intervalSeconds.toString(),
        nonce: params.nonce,
      }),
    });

    if (!response.ok) {
      throw new Error(`ICP canister error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.signature;
  } catch (error) {
    console.error('Failed to get ICP signature:', error);
    throw new Error('Failed to get ICP signature from canister');
  }
}

/**
 * Create a new recurring subscription on Arc
 */
export async function createArcSubscription(
  signer: ethers.Signer,
  params: {
    subscriptionId: string; // Human-readable ID
    merchant: string;
    merchantName: string;
    amount: number; // In USDC (e.g., 15.99)
    intervalSeconds: number;
    reminderDays: number;
  }
): Promise<ethers.ContractTransactionResponse> {
  const contract = getArcContract(signer);
  const usdc = getUSDCContract(signer);
  const userAddress = await signer.getAddress();

  // Convert subscription ID to bytes32
  const subscriptionIdBytes32 = ethers.id(params.subscriptionId);

  // Convert amount to Wei (6 decimals for USDC)
  const amountWei = ethers.parseUnits(params.amount.toString(), 6);

  // Generate random nonce
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  // Get ICP signature
  const icpSignature = await getICPSignature({
    action: 'CREATE_SUBSCRIPTION',
    subscriptionId: subscriptionIdBytes32,
    subscriber: userAddress,
    merchant: params.merchant,
    amount: amountWei,
    intervalSeconds: BigInt(params.intervalSeconds),
    nonce,
  });

  // Check and approve USDC if needed
  const allowance = await usdc.allowance(userAddress, ARC_TESTNET.contracts.ouroCPrima);
  const requiredAllowance = amountWei * 100n; // Approve for 100 payments

  if (allowance < amountWei) {
    console.log('Approving USDC spending...');
    const approveTx = await usdc.approve(
      ARC_TESTNET.contracts.ouroCPrima,
      requiredAllowance
    );
    await approveTx.wait();
    console.log('USDC approved');
  }

  // Create subscription
  console.log('Creating subscription on Arc...');
  const tx = await contract.createSubscription(
    subscriptionIdBytes32,
    params.merchant,
    params.merchantName,
    amountWei,
    params.intervalSeconds,
    params.reminderDays,
    icpSignature,
    nonce
  );

  return tx;
}

/**
 * Get subscription details from Arc contract
 */
export async function getArcSubscription(
  provider: BrowserProvider,
  subscriptionId: string
): Promise<ArcSubscription> {
  const contract = getArcContract(provider);
  const subscriptionIdBytes32 = ethers.id(subscriptionId);

  const sub = await contract.getSubscription(subscriptionIdBytes32);

  return {
    id: subscriptionId,
    subscriber: sub.subscriber,
    merchant: sub.merchant,
    merchantName: sub.merchantName,
    amount: sub.amount,
    intervalSeconds: sub.intervalSeconds,
    nextPaymentTime: sub.nextPaymentTime,
    status: sub.status,
    createdAt: sub.createdAt,
    lastPaymentTime: sub.lastPaymentTime,
    paymentsMade: sub.paymentsMade,
    totalPaid: sub.totalPaid,
    reminderDaysBeforePayment: sub.reminderDaysBeforePayment,
    consecutiveFailures: sub.consecutiveFailures,
  };
}

/**
 * Get all subscription IDs for a subscriber
 */
export async function getSubscriberSubscriptions(
  provider: BrowserProvider,
  subscriberAddress: string
): Promise<string[]> {
  const contract = getArcContract(provider);
  const subscriptionIds = await contract.getSubscriberSubscriptions(subscriberAddress);

  // Convert bytes32 array to readable strings
  return subscriptionIds.map((id: string) => id);
}

/**
 * Pause a subscription
 */
export async function pauseArcSubscription(
  signer: ethers.Signer,
  subscriptionId: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getArcContract(signer);
  const subscriptionIdBytes32 = ethers.id(subscriptionId);

  const tx = await contract.pauseSubscription(subscriptionIdBytes32);
  return tx;
}

/**
 * Resume a paused subscription
 */
export async function resumeArcSubscription(
  signer: ethers.Signer,
  subscriptionId: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getArcContract(signer);
  const subscriptionIdBytes32 = ethers.id(subscriptionId);

  const tx = await contract.resumeSubscription(subscriptionIdBytes32);
  return tx;
}

/**
 * Cancel a subscription permanently
 */
export async function cancelArcSubscription(
  signer: ethers.Signer,
  subscriptionId: string
): Promise<ethers.ContractTransactionResponse> {
  const contract = getArcContract(signer);
  const subscriptionIdBytes32 = ethers.id(subscriptionId);

  const tx = await contract.cancelSubscription(subscriptionIdBytes32);
  return tx;
}

/**
 * Check if a subscription can be processed
 */
export async function canProcessSubscription(
  provider: BrowserProvider,
  subscriptionId: string
): Promise<boolean> {
  const contract = getArcContract(provider);
  const subscriptionIdBytes32 = ethers.id(subscriptionId);

  return await contract.canProcessSubscription(subscriptionIdBytes32);
}

/**
 * Get USDC balance for an address
 */
export async function getUSDCBalance(
  provider: BrowserProvider,
  address: string
): Promise<bigint> {
  const usdc = getUSDCContract(provider);
  return await usdc.balanceOf(address);
}

/**
 * Get USDC allowance
 */
export async function getUSDCAllowance(
  provider: BrowserProvider,
  owner: string,
  spender: string
): Promise<bigint> {
  const usdc = getUSDCContract(provider);
  return await usdc.allowance(owner, spender);
}

/**
 * Approve USDC spending
 */
export async function approveUSDC(
  signer: ethers.Signer,
  amount: bigint
): Promise<ethers.ContractTransactionResponse> {
  const usdc = getUSDCContract(signer);
  const tx = await usdc.approve(ARC_TESTNET.contracts.ouroCPrima, amount);
  return tx;
}

/**
 * Get contract statistics
 */
export async function getContractStats(provider: BrowserProvider): Promise<{
  totalSubscriptions: bigint;
  feePercentage: number;
  minFee: bigint;
}> {
  const contract = getArcContract(provider);

  const totalSubscriptions = await contract.totalSubscriptions();
  const feeConfig = await contract.feeConfig();

  return {
    totalSubscriptions,
    feePercentage: Number(feeConfig.feePercentageBasisPoints) / 100, // Convert basis points to percentage
    minFee: feeConfig.minFeeAmount,
  };
}

/**
 * Format USDC amount from Wei to human-readable
 */
export function formatUSDC(amount: bigint): string {
  return ethers.formatUnits(amount, 6);
}

/**
 * Parse USDC amount from human-readable to Wei
 */
export function parseUSDC(amount: string): bigint {
  return ethers.parseUnits(amount, 6);
}
