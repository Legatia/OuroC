import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react";
import { createSubscription } from "@/lib/backend";
import { approveDelegation, calculateDelegationAmount, checkUSDCBalance } from "@/lib/solana";

// Mock OCR extraction function - replace with your backend API
const mockExtractInvoiceData = async (file: File): Promise<InvoiceData> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Mock extracted data - replace with real OCR/AI extraction
  return {
    amount: "500.00",
    currency: "USD",
    vendor: "ABC Electric Company",
    bankAccount: "DE89 3704 0044 0532 0130 00",
    reference: `Invoice #${Math.floor(Math.random() * 10000)}`,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "Monthly electricity service fee"
  };
};

interface InvoiceData {
  amount: string;
  currency: string;
  vendor: string;
  bankAccount: string;
  reference: string;
  dueDate: string;
  description: string;
}

type PaymentFrequency = "one-time" | "weekly" | "monthly" | "quarterly" | "yearly";

const Invoice = () => {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [step, setStep] = useState<"upload" | "confirm" | "payment">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!validTypes.includes(uploadedFile.type)) {
      toast.error("Please upload a PDF or image file (JPG, PNG)");
      return;
    }

    // Validate file size (max 10MB)
    if (uploadedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(uploadedFile);

    // Create preview for images
    if (uploadedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      setPreviewUrl(null);
    }

    toast.success("File uploaded successfully");
  };

  const handleExtractData = async () => {
    if (!file) return;

    setIsExtracting(true);
    try {
      // TODO: Replace with your backend OCR API endpoint
      const data = await mockExtractInvoiceData(file);
      setExtractedData(data);
      setStep("confirm");
      toast.success("Invoice data extracted successfully");
    } catch (error) {
      toast.error("Failed to extract invoice data. Please try again.");
      console.error(error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDataChange = (field: keyof InvoiceData, value: string) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
  };

  const handleProceedToPayment = () => {
    if (!extractedData) return;
    setStep("payment");
  };

  const handleCreatePayment = async () => {
    if (!extractedData || !publicKey || !sendTransaction) return;

    setIsProcessing(true);
    try {
      // Convert USD to USDC (assuming 1:1 for demo)
      const usdcAmount = parseFloat(extractedData.amount) * 1_000_000; // Convert to micro-USDC

      // Calculate interval in seconds
      const intervalSeconds = frequency === "one-time" ? -1 :
        frequency === "weekly" ? 7 * 24 * 60 * 60 :
        frequency === "monthly" ? 30 * 24 * 60 * 60 :
        frequency === "quarterly" ? 90 * 24 * 60 * 60 :
        365 * 24 * 60 * 60; // yearly

      // Step 1: Check USDC balance
      toast.info("Checking USDC balance...");
      const balanceCheck = await checkUSDCBalance(
        publicKey.toBase58(),
        usdcAmount,
        connection
      );

      if (!balanceCheck.sufficient) {
        toast.error(`Insufficient USDC balance. Need at least ${extractedData.amount} USDC`);
        setIsProcessing(false);
        return;
      }

      // Step 2: Approve delegation for recurring payments (or one-time amount)
      toast.info("Step 1/3: Approving token delegation...");
      const delegationAmount = calculateDelegationAmount(usdcAmount, intervalSeconds);

      const delegationResult = await approveDelegation(
        "", // Subscription ID will be generated by backend
        delegationAmount,
        { sendTransaction, publicKey },
        connection
      );

      if (!delegationResult.success) {
        toast.error("Failed to approve delegation: " + delegationResult.error);
        setIsProcessing(false);
        return;
      }

      toast.success("✓ Delegation approved");

      // Step 3: Create subscription on ICP backend
      toast.info("Step 2/3: Creating payment subscription...");

      const merchantAddress = import.meta.env.VITE_MERCHANT_ADDRESS || "MerchantPlaceholder";

      const result = await createSubscription(
        publicKey.toBase58(),      // Subscriber wallet
        merchantAddress,            // Merchant address (or vendor identifier)
        usdcAmount,                 // USDC amount in micro-units
        intervalSeconds,            // -1 for one-time, positive for recurring
        extractedData.vendor        // Merchant/vendor name
      );

      if (result.success) {
        toast.success(
          frequency === "one-time"
            ? "✓ One-time payment created successfully!"
            : `✓ Recurring payment scheduled (${frequency})`
        );

        toast.info("Step 3/3: Payment subscription active");

        // Show details
        setTimeout(() => {
          toast.info(
            frequency === "one-time"
              ? `Invoice payment for ${extractedData.vendor} is being processed`
              : `Automatic payments to ${extractedData.vendor} will occur ${frequency}`
          );
        }, 1000);

        // Reset form after success
        setTimeout(() => {
          setStep("upload");
          setFile(null);
          setPreviewUrl(null);
          setExtractedData(null);
          setFrequency("monthly");
        }, 3000);
      } else {
        toast.error("Failed to create payment subscription: " + result.error);
      }
    } catch (error) {
      toast.error("Failed to create payment. Please try again.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your Solana wallet to upload and pay invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Invoice Payment
          </h1>
          <p className="text-muted-foreground">
            Upload your invoice and automate payments with USDC
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step === "upload" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              1
            </div>
            <span className="hidden sm:inline">Upload</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className={`flex items-center gap-2 ${step === "confirm" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "confirm" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              2
            </div>
            <span className="hidden sm:inline">Confirm</span>
          </div>
          <div className="w-12 h-0.5 bg-muted" />
          <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "payment" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              3
            </div>
            <span className="hidden sm:inline">Pay</span>
          </div>
        </div>

        {/* Step 1: Upload Invoice */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Invoice</CardTitle>
              <CardDescription>
                Upload a PDF or image of your invoice. We'll extract the payment details automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="invoice-upload"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label htmlFor="invoice-upload" className="cursor-pointer">
                  {file ? (
                    <div className="space-y-4">
                      <FileText className="w-16 h-16 mx-auto text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Invoice preview"
                          className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                        />
                      )}
                      <Button variant="outline" size="sm" onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                        setPreviewUrl(null);
                      }}>
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-16 h-16 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">Drop your invoice here</p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse (PDF, JPG, PNG • Max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <Button
                onClick={handleExtractData}
                disabled={!file || isExtracting}
                className="w-full"
                size="lg"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting Data...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Extract Invoice Data
                  </>
                )}
              </Button>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">What we extract:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Amount and currency</li>
                  <li>Vendor/payee name</li>
                  <li>Bank account or payment reference</li>
                  <li>Due date and description</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Confirm Extracted Data */}
        {step === "confirm" && extractedData && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Invoice Details</CardTitle>
              <CardDescription>
                Review and edit the extracted information before proceeding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor Name</Label>
                  <Input
                    id="vendor"
                    value={extractedData.vendor}
                    onChange={(e) => handleDataChange("vendor", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference/Invoice Number</Label>
                  <Input
                    id="reference"
                    value={extractedData.reference}
                    onChange={(e) => handleDataChange("reference", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={extractedData.amount}
                    onChange={(e) => handleDataChange("amount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={extractedData.currency}
                    onChange={(e) => handleDataChange("currency", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bankAccount">Bank Account / Payment Address</Label>
                  <Input
                    id="bankAccount"
                    value={extractedData.bankAccount}
                    onChange={(e) => handleDataChange("bankAccount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={extractedData.dueDate}
                    onChange={(e) => handleDataChange("dueDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={extractedData.description}
                    onChange={(e) => handleDataChange("description", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("upload")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleProceedToPayment} className="flex-1">
                  Proceed to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment Configuration */}
        {step === "payment" && extractedData && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Payment</CardTitle>
              <CardDescription>
                Choose payment frequency and confirm the transaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{extractedData.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{extractedData.amount} {extractedData.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-medium">{extractedData.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">USDC Equivalent:</span>
                  <span className="font-medium text-primary">{extractedData.amount} USDC</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Payment Frequency</Label>
                <Select value={frequency} onValueChange={(value) => setFrequency(value as PaymentFrequency)}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-time">One-time Payment</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly (Default)</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {frequency === "one-time"
                    ? "Pay once immediately"
                    : `Automatically pay ${extractedData.amount} USDC ${frequency}`}
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">Note</p>
                <p className="text-muted-foreground">
                  This is a demo implementation. In production, you'll need to integrate with a fiat off-ramp
                  service to convert USDC to traditional bank transfers.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("confirm")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Create Payment</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Invoice;
