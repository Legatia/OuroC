/**
 * Grid Webhook Listener
 *
 * Monitors on-chain SPL Memo transactions and forwards notifications to Grid email users
 *
 * Architecture:
 * 1. Subscribe to Solana account changes for Grid-managed wallets
 * 2. Detect SPL Memo transactions (notification transactions)
 * 3. Parse memo message (merchant_name, amount, days)
 * 4. Send email to Grid user's registered email
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { GridClient } from '../api/GridClient';

export interface WebhookConfig {
  connection: Connection;
  gridClient: GridClient;
  emailService: EmailService;
  spl_memo_program_id?: string;
}

export interface EmailService {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void>;
}

export interface NotificationData {
  merchantName: string;
  amount: string;
  token: string;
  daysUntilPayment: number;
  timestamp: number;
}

const SPL_MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

export class GridWebhookListener {
  private connection: Connection;
  private gridClient: GridClient;
  private emailService: EmailService;
  private subscriptions: Map<string, number> = new Map();
  private spl_memo_program_id: string;

  constructor(config: WebhookConfig) {
    this.connection = config.connection;
    this.gridClient = config.gridClient;
    this.emailService = config.emailService;
    this.spl_memo_program_id = config.spl_memo_program_id || SPL_MEMO_PROGRAM_ID;
  }

  /**
   * Start monitoring a Grid account for notification transactions
   */
  async monitorGridAccount(gridAccountId: string): Promise<void> {
    console.log(`[GridWebhook] Starting monitor for Grid account: ${gridAccountId}`);

    // Get Grid account details
    const gridAccount = await this.gridClient.getAccount(gridAccountId);
    const publicKey = new PublicKey(gridAccount.public_key);
    const userEmail = gridAccount.email;

    // Subscribe to account changes
    const subscriptionId = this.connection.onAccountChange(
      publicKey,
      async (accountInfo, context) => {
        console.log(`[GridWebhook] Account change detected for ${gridAccountId}`);

        // Fetch recent transactions
        const signatures = await this.connection.getSignaturesForAddress(
          publicKey,
          { limit: 1 }
        );

        if (signatures.length === 0) return;

        // Get transaction details
        const tx = await this.connection.getParsedTransaction(
          signatures[0].signature,
          { maxSupportedTransactionVersion: 0 }
        );

        if (!tx) return;

        // Check if this is a notification transaction (has SPL Memo)
        const notificationData = this.parseNotificationTransaction(tx);

        if (notificationData) {
          console.log(`[GridWebhook] Notification detected:`, notificationData);

          // Send email to Grid user
          await this.sendNotificationEmail(userEmail, notificationData);
        }
      },
      'confirmed'
    );

    this.subscriptions.set(gridAccountId, subscriptionId);
    console.log(`[GridWebhook] ✅ Monitoring active for ${gridAccountId}`);
  }

  /**
   * Stop monitoring a Grid account
   */
  async stopMonitoring(gridAccountId: string): Promise<void> {
    const subscriptionId = this.subscriptions.get(gridAccountId);

    if (subscriptionId !== undefined) {
      await this.connection.removeAccountChangeListener(subscriptionId);
      this.subscriptions.delete(gridAccountId);
      console.log(`[GridWebhook] Stopped monitoring ${gridAccountId}`);
    }
  }

  /**
   * Parse notification transaction to extract memo data
   */
  private parseNotificationTransaction(
    tx: ParsedTransactionWithMeta
  ): NotificationData | null {
    if (!tx.meta || !tx.transaction) return null;

    // Check if transaction includes SPL Memo Program
    const accountKeys = tx.transaction.message.accountKeys;
    const hasMemoProgram = accountKeys.some(
      key => key.pubkey.toString() === this.spl_memo_program_id
    );

    if (!hasMemoProgram) return null;

    // Extract memo from instructions
    const instructions = tx.transaction.message.instructions;

    for (const instruction of instructions) {
      if ('parsed' in instruction) continue; // Skip parsed instructions

      // Check if this is the memo program
      const programId = accountKeys[instruction.programIdIndex].pubkey.toString();

      if (programId === this.spl_memo_program_id) {
        // Decode memo data
        const memoData = Buffer.from(instruction.data, 'base64').toString('utf-8');

        // Parse memo format: "MerchantName: Payment due in X days. Amount: Y TOKEN"
        const match = memoData.match(/^(.+): Payment due in (\d+) days?\. Amount: ([\d.]+) (.+)$/);

        if (match) {
          return {
            merchantName: match[1],
            daysUntilPayment: parseInt(match[2]),
            amount: match[3],
            token: match[4],
            timestamp: tx.blockTime || Date.now() / 1000,
          };
        }
      }
    }

    return null;
  }

  /**
   * Send notification email to Grid user
   */
  private async sendNotificationEmail(
    userEmail: string,
    data: NotificationData
  ): Promise<void> {
    const subject = `${data.merchantName} - Payment Reminder`;

    const html = this.generateEmailHTML(data);
    const text = this.generateEmailText(data);

    try {
      await this.emailService.sendEmail({
        to: userEmail,
        subject,
        html,
        text,
      });

      console.log(`[GridWebhook] ✅ Email sent to ${userEmail}`);
    } catch (error) {
      console.error(`[GridWebhook] ❌ Failed to send email to ${userEmail}:`, error);
    }
  }

  /**
   * Generate HTML email template
   */
  private generateEmailHTML(data: NotificationData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">💰 Payment Reminder</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #1f2937; font-size: 20px;">${data.merchantName}</h2>
      <p style="font-size: 16px; color: #4b5563; margin: 10px 0;">
        Your subscription payment is due in <strong style="color: #667eea; font-size: 18px;">${data.daysUntilPayment} day${data.daysUntilPayment === 1 ? '' : 's'}</strong>
      </p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Amount:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 16px; color: #1f2937;">${this.formatAmount(data.amount)} ${this.getTokenSymbol(data.token)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Merchant:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 16px; color: #1f2937;">${data.merchantName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Due in:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 16px; color: #ef4444;">${data.daysUntilPayment} day${data.daysUntilPayment === 1 ? '' : 's'}</td>
        </tr>
      </table>
    </div>

    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>⚠️ Action Required:</strong> Please ensure you have sufficient balance in your account to avoid payment failure.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://your-app.com/subscriptions" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Subscription</a>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p>This is an automated notification from OuroC Subscriptions</p>
      <p>Powered by Solana blockchain</p>
    </div>

  </div>

</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email (fallback)
   */
  private generateEmailText(data: NotificationData): string {
    return `
Payment Reminder - ${data.merchantName}

Your subscription payment is due in ${data.daysUntilPayment} day${data.daysUntilPayment === 1 ? '' : 's'}.

Details:
- Amount: ${this.formatAmount(data.amount)} ${this.getTokenSymbol(data.token)}
- Merchant: ${data.merchantName}
- Due in: ${data.daysUntilPayment} day${data.daysUntilPayment === 1 ? '' : 's'}

⚠️ Action Required: Please ensure you have sufficient balance in your account to avoid payment failure.

View your subscription: https://your-app.com/subscriptions

---
This is an automated notification from OuroC Subscriptions
Powered by Solana blockchain
    `.trim();
  }

  /**
   * Format amount for display (handle micro-units)
   */
  private formatAmount(amount: string): string {
    const numAmount = parseFloat(amount);

    // If amount is in micro-units (> 1000), convert to readable format
    if (numAmount >= 1000000) {
      return (numAmount / 1000000).toFixed(2);
    }

    return numAmount.toFixed(2);
  }

  /**
   * Extract token symbol from mint address
   */
  private getTokenSymbol(tokenMint: string): string {
    // Common stablecoin addresses
    const knownTokens: { [key: string]: string } = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo': 'PYUSD',
      'EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o': 'DAI',
    };

    return knownTokens[tokenMint] || 'USDC';
  }

  /**
   * Stop all monitoring subscriptions
   */
  async stopAll(): Promise<void> {
    const gridAccountIds = Array.from(this.subscriptions.keys());

    for (const gridAccountId of gridAccountIds) {
      await this.stopMonitoring(gridAccountId);
    }

    console.log(`[GridWebhook] All monitoring stopped`);
  }
}
