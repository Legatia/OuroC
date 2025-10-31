# Invoice Payment Backend Requirements

## Overview
The Invoice page requires a backend service to extract payment information from uploaded invoices (PDF/images) and optionally integrate with fiat off-ramp services.

---

## Backend API Endpoints Needed

### 1. Invoice OCR/Extraction Endpoint

**Endpoint**: `POST /api/invoice/extract`

**Request**:
```typescript
Content-Type: multipart/form-data

{
  file: File // PDF or image (JPEG, PNG)
}
```

**Response**:
```typescript
{
  success: boolean;
  data?: {
    amount: string;        // e.g., "500.00"
    currency: string;      // e.g., "USD"
    vendor: string;        // e.g., "ABC Electric Company"
    bankAccount: string;   // e.g., "DE89 3704 0044 0532 0130 00"
    reference: string;     // e.g., "Invoice #12345"
    dueDate: string;       // ISO date: "2025-11-30"
    description: string;   // e.g., "Monthly electricity service"
  };
  error?: string;
  confidence?: number;     // Optional: 0-1 extraction confidence score
}
```

---

## Recommended OCR/AI Services

### Option 1: OpenAI Vision API (Recommended)
**Pros**:
- Excellent accuracy for invoice extraction
- Handles complex layouts
- Can extract structured data with prompts

**Implementation**:
```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractInvoiceData(imageBase64: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract the following information from this invoice:
            - Amount (number only)
            - Currency (ISO code)
            - Vendor/payee name
            - Bank account or reference number
            - Due date (YYYY-MM-DD format)
            - Description/service

            Return as JSON only.`
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          }
        ]
      }
    ]
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Option 2: Google Cloud Vision API
**Pros**:
- Good for text extraction
- Document understanding
- Lower cost than OpenAI

**Setup**:
```bash
npm install @google-cloud/vision
```

**Implementation**:
```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient();

async function extractText(filePath: string) {
  const [result] = await client.documentTextDetection(filePath);
  const fullText = result.fullTextAnnotation?.text;

  // Parse text with regex or send to LLM for structured extraction
  return parseInvoiceText(fullText);
}
```

### Option 3: Tesseract.js (Client-Side, Free)
**Pros**:
- Free and open source
- No backend required
- Privacy-friendly (stays in browser)

**Setup**:
```bash
npm install tesseract.js
```

**Implementation** (can be added directly to Invoice.tsx):
```typescript
import Tesseract from 'tesseract.js';

async function extractTextFromImage(file: File) {
  const { data: { text } } = await Tesseract.recognize(file, 'eng');

  // Send text to backend for structured parsing
  // or use regex to extract fields
  return parseInvoiceText(text);
}
```

---

## Integration with Existing Subscription Flow

### Connect to ICP Timer Backend

The extracted invoice data should be integrated with your existing subscription creation:

```typescript
// In Invoice.tsx handleCreatePayment()
import { createSubscription } from "@/lib/backend";

const result = await createSubscription(
  walletAddress,                    // subscriber
  extractedData.vendor,              // merchant name (or placeholder)
  usdcAmount,                        // amount in micro-USDC
  intervalSeconds,                   // -1 for one-time, positive for recurring
  extractedData.vendor               // merchant name for notifications
);
```

### Update ICP Canister (if needed)

If you want to store invoice metadata on ICP:

```rust
// In subscription_manager.rs
pub struct Subscription {
    // ... existing fields
    pub invoice_reference: Option<String>,
    pub invoice_vendor: Option<String>,
    pub fiat_amount: Option<String>,
    pub fiat_currency: Option<String>,
}
```

---

## File Storage Options

### Option 1: IPFS (Decentralized)
```bash
npm install ipfs-http-client
```

```typescript
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'https://ipfs.infura.io:5001' });

async function uploadInvoice(file: File) {
  const added = await ipfs.add(file);
  return `ipfs://${added.path}`;
}
```

### Option 2: AWS S3
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

async function uploadToS3(file: File) {
  const s3 = new S3Client({ region: "us-east-1" });
  const key = `invoices/${Date.now()}-${file.name}`;

  await s3.send(new PutObjectCommand({
    Bucket: "ouroc-invoices",
    Key: key,
    Body: file,
  }));

  return `https://ouroc-invoices.s3.amazonaws.com/${key}`;
}
```

---

## Security Considerations

1. **File Validation**:
   - Validate file type (PDF, JPEG, PNG only)
   - Limit file size (10MB max)
   - Scan for malware

2. **Data Privacy**:
   - Encrypt stored invoices
   - Don't store bank account details on-chain
   - Implement auto-deletion after X days

3. **Rate Limiting**:
   - Limit API calls per user
   - Prevent abuse of OCR service

4. **Authentication**:
   - Require wallet signature for uploads
   - Validate user owns the wallet

---

## Currency Conversion

For USD → USDC conversion, use a price oracle:

```typescript
// Option 1: Pyth Network (on-chain)
import { PythHttpClient } from "@pythnetwork/client";

const pythClient = new PythHttpClient(connection, getPythProgramKeyForCluster('devnet'));
const data = await pythClient.getData();
const usdcPrice = data.productPrice.get('Crypto.USDC/USD')?.price;

// Option 2: CoinGecko API (off-chain)
const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd');
const { 'usd-coin': { usd: usdcPrice } } = await response.json();
```

---

## Future Enhancements

1. **Fiat Off-Ramp Integration**:
   - Partner with Stripe, Circle, or MoonPay
   - Convert USDC → bank transfer
   - Automate vendor payments

2. **Invoice Templates**:
   - Save recurring vendor info
   - Auto-fill common fields
   - Vendor directory

3. **Payment Tracking**:
   - Dashboard showing payment history
   - Email notifications
   - Export to accounting software

4. **Multi-Currency Support**:
   - EUR, GBP, JPY invoices
   - Auto-conversion to USDC
   - Currency risk management

---

## Quick Start (Minimum Viable Backend)

**Simple Express.js endpoint**:

```typescript
import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';

const app = express();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/invoice/extract', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Convert to base64
    const base64 = file.buffer.toString('base64');

    // Extract with OpenAI Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract: amount, currency, vendor, bankAccount, reference, dueDate, description. Return JSON only."
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}` }
          }
        ]
      }]
    });

    const data = JSON.parse(response.choices[0].message.content);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, () => console.log('Invoice API running on port 3001'));
```

---

## Testing

**Sample invoice data for testing**:

```json
{
  "amount": "500.00",
  "currency": "USD",
  "vendor": "ABC Electric Company",
  "bankAccount": "DE89 3704 0044 0532 0130 00",
  "reference": "Invoice #12345",
  "dueDate": "2025-11-30",
  "description": "Monthly electricity service fee"
}
```

**Frontend integration** (replace mock in Invoice.tsx):

```typescript
const mockExtractInvoiceData = async (file: File): Promise<InvoiceData> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://localhost:3001/api/invoice/extract', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data;
};
```

---

## Contact

For questions about backend implementation, reach out to the development team.
