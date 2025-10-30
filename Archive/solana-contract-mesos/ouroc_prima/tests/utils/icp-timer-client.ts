/**
 * ICP Timer Canister Client
 *
 * Interfaces with the ICP timer canister for subscription scheduling
 */

import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { PublicKey } from "@solana/web3.js";

// ICP Timer Canister IDL
const icpTimerIDL = ({ IDL }: any) => {
  const SubscriptionId = IDL.Text;
  const SolanaAddress = IDL.Text;
  const Timestamp = IDL.Int;

  const SubscriptionStatus = IDL.Variant({
    'Active': IDL.Null,
    'Paused': IDL.Null,
    'Cancelled': IDL.Null,
    'Expired': IDL.Null,
  });

  const NetworkEnvironment = IDL.Variant({
    'Mainnet': IDL.Null,
    'Devnet': IDL.Null,
    'Testnet': IDL.Null,
  });

  const CreateSubscriptionRequest = IDL.Record({
    'subscription_id': IDL.Text,
    'solana_contract_address': SolanaAddress,
    'payment_token_mint': IDL.Text,
    'amount': IDL.Nat64,
    'subscriber_address': SolanaAddress,
    'merchant_address': SolanaAddress,
    'reminder_days_before_payment': IDL.Nat,
    'interval_seconds': IDL.Nat64,
    'start_time': IDL.Opt(Timestamp),
  });

  const Subscription = IDL.Record({
    'id': SubscriptionId,
    'solana_contract_address': SolanaAddress,
    'payment_token_mint': IDL.Text,
    'reminder_days_before_payment': IDL.Nat,
    'interval_seconds': IDL.Nat64,
    'next_execution': Timestamp,
    'status': SubscriptionStatus,
    'created_at': Timestamp,
    'last_triggered': IDL.Opt(Timestamp),
    'trigger_count': IDL.Nat,
    'failed_payment_count': IDL.Nat,
    'last_failure_time': IDL.Opt(Timestamp),
    'last_error': IDL.Opt(IDL.Text),
  });

  const Result = IDL.Variant({
    'Ok': Subscription,
    'Err': IDL.Text,
  });

  return IDL.Service({
    'init_canister': IDL.Func([NetworkEnvironment], [IDL.Text], []),
    'create_subscription': IDL.Func([CreateSubscriptionRequest], [Result], []),
    'pause_subscription': IDL.Func([SubscriptionId], [Result], []),
    'resume_subscription': IDL.Func([SubscriptionId], [Result], []),
    'cancel_subscription': IDL.Func([SubscriptionId], [Result], []),
    'get_subscription': IDL.Func([SubscriptionId], [IDL.Opt(Subscription)], ['query']),
    'get_all_subscriptions': IDL.Func([], [IDL.Vec(Subscription)], ['query']),
    'get_active_subscription_count': IDL.Func([], [IDL.Nat], ['query']),
  });
};

export interface CreateSubscriptionParams {
  subscriptionId: string;
  solanaContractAddress: string;
  paymentTokenMint: string;
  amount: bigint;
  subscriberAddress: string;
  merchantAddress: string;
  reminderDaysBeforePayment: number;
  intervalSeconds: bigint;
  startTime?: bigint;
}

export interface ICPSubscription {
  id: string;
  solana_contract_address: string;
  payment_token_mint: string;
  reminder_days_before_payment: number;
  interval_seconds: bigint;
  next_execution: bigint;
  status: { Active?: null; Paused?: null; Cancelled?: null; Expired?: null };
  created_at: bigint;
  last_triggered?: bigint;
  trigger_count: number;
  failed_payment_count: number;
  last_failure_time?: bigint;
  last_error?: string;
}

export class ICPTimerClient {
  private agent: HttpAgent;
  private actor: any;
  private canisterId: Principal;

  constructor(
    canisterId: string,
    host: string = "https://ic0.app"
  ) {
    this.canisterId = Principal.fromText(canisterId);
    this.agent = new HttpAgent({ host });

    // For local development, disable certificate verification
    if (host.includes("localhost")) {
      this.agent.fetchRootKey();
    }

    this.actor = Actor.createActor(icpTimerIDL, {
      agent: this.agent,
      canisterId: this.canisterId,
    });
  }

  /**
   * Initialize the canister with network environment
   */
  async initialize(network: "Mainnet" | "Devnet" | "Testnet" = "Devnet"): Promise<string> {
    try {
      const result = await this.actor.init_canister({ [network]: null });
      console.log(`✅ ICP Timer canister initialized for ${network}`);
      return result;
    } catch (error) {
      console.error("❌ Failed to initialize ICP Timer canister:", error);
      throw error;
    }
  }

  /**
   * Create a new subscription timer
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<ICPSubscription> {
    try {
      const request = {
        subscription_id: params.subscriptionId,
        solana_contract_address: params.solanaContractAddress,
        payment_token_mint: params.paymentTokenMint,
        amount: params.amount,
        subscriber_address: params.subscriberAddress,
        merchant_address: params.merchantAddress,
        reminder_days_before_payment: params.reminderDaysBeforePayment,
        interval_seconds: params.intervalSeconds,
        start_time: params.startTime ? [params.startTime] : [],
      };

      const result = await this.actor.create_subscription(request);

      if ('Err' in result) {
        throw new Error(`ICP Timer error: ${result.Err}`);
      }

      console.log(`✅ ICP Timer subscription created: ${params.subscriptionId}`);
      return result.Ok;
    } catch (error) {
      console.error("❌ Failed to create ICP Timer subscription:", error);
      throw error;
    }
  }

  /**
   * Pause a subscription timer
   */
  async pauseSubscription(subscriptionId: string): Promise<ICPSubscription> {
    try {
      const result = await this.actor.pause_subscription(subscriptionId);

      if ('Err' in result) {
        throw new Error(`ICP Timer error: ${result.Err}`);
      }

      console.log(`⏸️  ICP Timer subscription paused: ${subscriptionId}`);
      return result.Ok;
    } catch (error) {
      console.error("❌ Failed to pause ICP Timer subscription:", error);
      throw error;
    }
  }

  /**
   * Resume a paused subscription timer
   */
  async resumeSubscription(subscriptionId: string): Promise<ICPSubscription> {
    try {
      const result = await this.actor.resume_subscription(subscriptionId);

      if ('Err' in result) {
        throw new Error(`ICP Timer error: ${result.Err}`);
      }

      console.log(`▶️  ICP Timer subscription resumed: ${subscriptionId}`);
      return result.Ok;
    } catch (error) {
      console.error("❌ Failed to resume ICP Timer subscription:", error);
      throw error;
    }
  }

  /**
   * Cancel a subscription timer
   */
  async cancelSubscription(subscriptionId: string): Promise<ICPSubscription> {
    try {
      const result = await this.actor.cancel_subscription(subscriptionId);

      if ('Err' in result) {
        throw new Error(`ICP Timer error: ${result.Err}`);
      }

      console.log(`🚫 ICP Timer subscription cancelled: ${subscriptionId}`);
      return result.Ok;
    } catch (error) {
      console.error("❌ Failed to cancel ICP Timer subscription:", error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<ICPSubscription | null> {
    try {
      const result = await this.actor.get_subscription(subscriptionId);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error("❌ Failed to get ICP Timer subscription:", error);
      throw error;
    }
  }

  /**
   * Get all subscriptions
   */
  async getAllSubscriptions(): Promise<ICPSubscription[]> {
    try {
      return await this.actor.get_all_subscriptions();
    } catch (error) {
      console.error("❌ Failed to get all ICP Timer subscriptions:", error);
      throw error;
    }
  }

  /**
   * Get active subscription count
   */
  async getActiveSubscriptionCount(): Promise<number> {
    try {
      return await this.actor.get_active_subscription_count();
    } catch (error) {
      console.error("❌ Failed to get active subscription count:", error);
      throw error;
    }
  }

  /**
   * Helper: Convert Solana PublicKey to string for ICP
   */
  static solanaAddressToString(pubkey: PublicKey): string {
    return pubkey.toString();
  }

  /**
   * Helper: Create full end-to-end subscription (Solana + ICP)
   */
  async createFullSubscription(
    solanaSubscriptionId: string,
    solanaProgramId: PublicKey,
    subscriber: PublicKey,
    merchant: PublicKey,
    tokenMint: PublicKey,
    amount: bigint,
    intervalSeconds: bigint,
    reminderDays: number = 7
  ): Promise<ICPSubscription> {
    return this.createSubscription({
      subscriptionId: solanaSubscriptionId,
      solanaContractAddress: ICPTimerClient.solanaAddressToString(solanaProgramId),
      paymentTokenMint: ICPTimerClient.solanaAddressToString(tokenMint),
      amount,
      subscriberAddress: ICPTimerClient.solanaAddressToString(subscriber),
      merchantAddress: ICPTimerClient.solanaAddressToString(merchant),
      reminderDaysBeforePayment: reminderDays,
      intervalSeconds,
    });
  }
}

/**
 * Mock ICP Timer Client for testing without deployed canister
 */
export class MockICPTimerClient extends ICPTimerClient {
  private mockSubscriptions: Map<string, ICPSubscription> = new Map();

  constructor() {
    super("aaaaa-aa", "http://localhost:4943"); // Dummy values
  }

  async initialize(network: "Mainnet" | "Devnet" | "Testnet" = "Devnet"): Promise<string> {
    console.log(`🔧 [MOCK] ICP Timer initialized for ${network}`);
    return `Mock canister initialized for ${network}`;
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<ICPSubscription> {
    console.log(`🔧 [MOCK] Creating ICP Timer subscription: ${params.subscriptionId}`);

    const subscription: ICPSubscription = {
      id: params.subscriptionId,
      solana_contract_address: params.solanaContractAddress,
      payment_token_mint: params.paymentTokenMint,
      reminder_days_before_payment: params.reminderDaysBeforePayment,
      interval_seconds: params.intervalSeconds,
      next_execution: params.startTime || BigInt(Date.now() / 1000) + params.intervalSeconds,
      status: { Active: null },
      created_at: BigInt(Date.now() / 1000),
      trigger_count: 0,
      failed_payment_count: 0,
    };

    this.mockSubscriptions.set(params.subscriptionId, subscription);
    return subscription;
  }

  async pauseSubscription(subscriptionId: string): Promise<ICPSubscription> {
    console.log(`🔧 [MOCK] Pausing subscription: ${subscriptionId}`);
    const sub = this.mockSubscriptions.get(subscriptionId);
    if (!sub) throw new Error("Subscription not found");
    sub.status = { Paused: null };
    return sub;
  }

  async resumeSubscription(subscriptionId: string): Promise<ICPSubscription> {
    console.log(`🔧 [MOCK] Resuming subscription: ${subscriptionId}`);
    const sub = this.mockSubscriptions.get(subscriptionId);
    if (!sub) throw new Error("Subscription not found");
    sub.status = { Active: null };
    return sub;
  }

  async cancelSubscription(subscriptionId: string): Promise<ICPSubscription> {
    console.log(`🔧 [MOCK] Cancelling subscription: ${subscriptionId}`);
    const sub = this.mockSubscriptions.get(subscriptionId);
    if (!sub) throw new Error("Subscription not found");
    sub.status = { Cancelled: null };
    return sub;
  }

  async getSubscription(subscriptionId: string): Promise<ICPSubscription | null> {
    return this.mockSubscriptions.get(subscriptionId) || null;
  }

  async getAllSubscriptions(): Promise<ICPSubscription[]> {
    return Array.from(this.mockSubscriptions.values());
  }

  async getActiveSubscriptionCount(): Promise<number> {
    return Array.from(this.mockSubscriptions.values())
      .filter(sub => 'Active' in sub.status)
      .length;
  }
}
