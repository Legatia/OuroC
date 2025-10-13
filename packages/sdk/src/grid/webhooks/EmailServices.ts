/**
 * Email Service Implementations
 *
 * Provides multiple email service options for sending notifications to Grid users
 */

import { EmailService } from './GridWebhookListener';

/**
 * SendGrid Email Service
 * Docs: https://sendgrid.com/docs/API_Reference/api_v3.html
 */
export class SendGridEmailService implements EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: params.to }],
        }],
        from: { email: this.fromEmail },
        subject: params.subject,
        content: [
          { type: 'text/plain', value: params.text },
          { type: 'text/html', value: params.html },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid error: ${error}`);
    }
  }
}

/**
 * Resend Email Service
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */
export class ResendEmailService implements EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend error: ${error}`);
    }
  }
}

/**
 * AWS SES Email Service
 * Docs: https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html
 */
export class AWSEmailService implements EmailService {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private fromEmail: string;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    fromEmail: string;
  }) {
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region;
    this.fromEmail = config.fromEmail;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // Implementation requires AWS SDK
    // For production, use @aws-sdk/client-ses package
    throw new Error('AWS SES implementation requires @aws-sdk/client-ses package');

    // Example implementation:
    /*
    const ses = new SESClient({
      region: this.region,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });

    await ses.send(new SendEmailCommand({
      Source: this.fromEmail,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject },
        Body: {
          Text: { Data: params.text },
          Html: { Data: params.html },
        },
      },
    }));
    */
  }
}

/**
 * Mailgun Email Service
 * Docs: https://documentation.mailgun.com/en/latest/api-sending.html
 */
export class MailgunEmailService implements EmailService {
  private apiKey: string;
  private domain: string;
  private fromEmail: string;

  constructor(apiKey: string, domain: string, fromEmail: string) {
    this.apiKey = apiKey;
    this.domain = domain;
    this.fromEmail = fromEmail;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const formData = new FormData();
    formData.append('from', this.fromEmail);
    formData.append('to', params.to);
    formData.append('subject', params.subject);
    formData.append('text', params.text);
    formData.append('html', params.html);

    const response = await fetch(
      `https://api.mailgun.net/v3/${this.domain}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mailgun error: ${error}`);
    }
  }
}

/**
 * Console Email Service (Development/Testing)
 * Logs emails to console instead of sending
 */
export class ConsoleEmailService implements EmailService {
  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    console.log('\n=== EMAIL NOTIFICATION ===');
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log('---');
    console.log(params.text);
    console.log('=========================\n');
  }
}

/**
 * Custom Email Service
 * Implement your own email logic
 */
export class CustomEmailService implements EmailService {
  private sendFunction: (params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<void>;

  constructor(
    sendFunction: (params: {
      to: string;
      subject: string;
      html: string;
      text: string;
    }) => Promise<void>
  ) {
    this.sendFunction = sendFunction;
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    await this.sendFunction(params);
  }
}
