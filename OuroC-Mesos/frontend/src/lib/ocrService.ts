/**
 * OCR Service using Tesseract.js
 * Extracts text from images and PDFs for invoice processing
 */

import Tesseract from 'tesseract.js';

export interface InvoiceData {
  merchantName?: string;
  amount?: number;
  date?: string;
  items?: string[];
  rawText: string;
  confidence?: number;
}

/**
 * Process invoice/receipt image and extract data
 */
export async function processInvoiceImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<InvoiceData> {
  try {
    // Perform OCR
    const { data } = await Tesseract.recognize(
      file,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        },
      }
    );

    const text = data.text;
    const confidence = data.confidence;

    // Parse extracted text for invoice data
    const invoiceData = parseInvoiceText(text);

    return {
      ...invoiceData,
      rawText: text,
      confidence,
    };
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw new Error('Failed to process image. Please try again.');
  }
}

/**
 * Parse raw OCR text to extract invoice fields
 */
function parseInvoiceText(text: string): Partial<InvoiceData> {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  return {
    merchantName: extractMerchantName(lines),
    amount: extractAmount(text),
    date: extractDate(text),
    items: extractLineItems(lines),
  };
}

/**
 * Extract merchant name (usually first prominent text)
 */
function extractMerchantName(lines: string[]): string | undefined {
  // Look for lines with all caps or title case (common for merchant names)
  for (const line of lines.slice(0, 5)) { // Check first 5 lines
    if (line.length > 3 && line.length < 50) {
      // Skip if line looks like address, phone, or other metadata
      if (!/^\d+/.test(line) && !/phone|tel|address|street/i.test(line)) {
        return line;
      }
    }
  }
  return undefined;
}

/**
 * Extract monetary amount from text
 */
function extractAmount(text: string): number | undefined {
  // Look for patterns like: $15.99, 15.99, $1,599.00, Total: $50.00
  const patterns = [
    /total[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /amount[:\s]*\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /\$(\d{1,3}(?:,\d{3})*\.\d{2})\s*(?:total|amount)?/i,
    /(\d{1,3}(?:,\d{3})*\.\d{2})/g, // Fallback: any currency format
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
        return parsed;
      }
    }
  }

  return undefined;
}

/**
 * Extract date from text
 */
function extractDate(text: string): string | undefined {
  // Common date patterns
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,           // MM/DD/YYYY or DD/MM/YYYY
    /(\d{1,2}-\d{1,2}-\d{2,4})/,             // MM-DD-YYYY
    /(\d{4}-\d{2}-\d{2})/,                   // YYYY-MM-DD
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i, // Jan 15, 2024
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

/**
 * Extract line items from receipt
 */
function extractLineItems(lines: string[]): string[] {
  const items: string[] = [];

  // Look for lines with product names and prices
  for (const line of lines) {
    // Skip header/footer lines
    if (/total|subtotal|tax|date|phone|address/i.test(line)) {
      continue;
    }

    // Look for lines with prices (item descriptions usually have prices)
    if (/\$?\d+\.\d{2}/.test(line) && line.length > 5) {
      items.push(line);
    }
  }

  return items.slice(0, 10); // Limit to 10 items
}

/**
 * Validate if file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
  return validTypes.includes(file.type);
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Convert image file to data URL for preview
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
