import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationsContext";
import { usePromoCodes } from "@/contexts/PromoCodesContext";
import { createSubscription } from "@/lib/backend";
import { approveDelegation, createSolanaSubscription, calculateDelegationAmount, checkUSDCBalance } from "@/lib/solana";
import { parseIntervalToSeconds, isIntervalLongerThanOneDay, validateInterval, formatSecondsToHumanReadable } from "@/lib/timeUtils";
import { useConnection } from "@solana/wallet-adapter-react";

const CheckoutGiftCard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, publicKey, sendTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { addNotification } = useNotifications();
  const { addPromoCode } = usePromoCodes();
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseType, setPurchaseType] = useState<"once" | "recurring">("once");
  const [recurringInterval, setRecurringInterval] = useState("00:00:00:00:00:10"); // Default: 10 seconds for demo

  const product = location.state?.product || {
    title: "Product",
    description: "Description",
    price: 0,
    category: "Category",
  };

  const handlePurchase = async () => {
    if (!connected || !publicKey || !anchorWallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    // For one-time purchases, call Solana contract directly
    if (purchaseType === "once") {
      setIsProcessing(true);

      try {
        const amountMicroUsdc = Math.floor(product.price * 1_000_000);

        // Generate unique subscription ID hash (includes timestamp for uniqueness)
        const timestamp = Date.now();
        const randomNonce = Math.random().toString(36).substring(2, 10);
        const hashInput = `onetime_${publicKey.toBase58()}_${timestamp}_${randomNonce}`;

        // Hash the subscription ID to get a deterministic, unique identifier
        const msgBuffer = new TextEncoder().encode(hashInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const subscriptionId = hashHex.substring(0, 32); // Use first 32 chars of hash

        console.log('🎫 Generated Subscription ID:', subscriptionId);
        console.log('  Hash input:', hashInput);

        // Process direct payment (no subscription contract needed for one-time)
        toast.info("Processing payment...");

        const { processDirectOneTimePayment } = await import("../lib/solana");

        const result = await processDirectOneTimePayment(
          amountMicroUsdc,
          import.meta.env.VITE_MERCHANT_ADDRESS || "HBvV7YqSRSPW4YEBsDvpvF2PrUWFubqVbTNYafkddTsy",
          { sendTransaction, publicKey },
          connection
        );

        if (result.success) {
          console.log(`✅ Payment completed - ID: ${subscriptionId}`);
          console.log(`📝 Transaction signature: ${result.signature}`);

          // Generate and store gift code
          const giftCode = `GIFT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

          addPromoCode({
            productTitle: product.title,
            code: giftCode,
            type: "giftcard",
          });

          toast.success("Gift card purchased successfully!");

          addNotification({
            type: "success",
            title: "Promo Code Received",
            message: `Your ${product.title} promo code: ${giftCode}`,
          });

          navigate("/profile");
        } else {
          const errorMsg = result.error || "Failed to create subscription";
          console.error("❌ Subscription creation failed:", errorMsg);
          toast.error(errorMsg);
        }
      } catch (error) {
        console.error("❌ One-time purchase error:", error);

        // Check if it's a duplicate transaction error
        if (error instanceof Error && error.message.includes("already been processed")) {
          toast.error("This transaction was already processed. Please try again with a new purchase.");
        } else {
          toast.error("An error occurred during purchase. Please try again.");
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // For recurring purchases, validate and create subscription
    const validationError = validateInterval(recurringInterval);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const intervalSeconds = parseIntervalToSeconds(recurringInterval);
    if (intervalSeconds === null) {
      toast.error("Invalid interval format");
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Check USDC balance
      const amountMicroUsdc = Math.floor(product.price * 1_000_000);
      const balanceCheck = await checkUSDCBalance(
        publicKey.toBase58(),
        amountMicroUsdc,
        connection
      );

      if (!balanceCheck.sufficient) {
        toast.error(`Insufficient USDC balance. Need at least ${product.price} USDC`);
        setIsProcessing(false);
        return;
      }

      // Step 2: Approve delegation for recurring payments
      toast.info("Step 1/3: Approving token delegation...");
      const delegationAmount = calculateDelegationAmount(amountMicroUsdc, intervalSeconds);

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

      // Step 3: Create subscription on ICP backend (generates subscription ID)
      toast.info("Step 2/3: Creating ICP timer...");

      const result = await createSubscription(
        publicKey.toBase58(), // Solana wallet address
        import.meta.env.VITE_MERCHANT_ADDRESS || "MerchantPlaceholder", // Merchant address
        product.price, // USDC amount
        intervalSeconds, // Interval in seconds (> 0 for recurring)
        product.title // Merchant name (sent to Solana only)
      );

      if (result.success) {
        // First gift code delivered immediately
        const giftCode = `GIFT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        addPromoCode({
          productTitle: product.title,
          code: giftCode,
          type: "giftcard",
        });

        toast.success("Recurring gift card activated!");

        addNotification({
          type: "success",
          title: "First Gift Card Delivered",
          message: `Your ${product.title} promo code: ${giftCode}`,
        });

        // Show notification about recurring schedule
        const intervalText = formatSecondsToHumanReadable(intervalSeconds);
        const hasNotifications = intervalSeconds > 86400;

        addNotification({
          type: "info",
          title: "Auto-Purchase Activated",
          message: `New ${product.title} gift card every ${intervalText}${hasNotifications ? ' (with reminders)' : ''}`,
        });

        // Only show payment reminder info for intervals > 1 day
        if (hasNotifications) {
          setTimeout(() => {
            addNotification({
              type: "info",
              title: "Reminders Enabled",
              message: `You'll be notified 1 day before each ${product.title} purchase`,
            });
          }, 1000);
        } else {
          setTimeout(() => {
            addNotification({
              type: "info",
              title: "Instant Recurring",
              message: `No reminders for intervals under 1 day - watch your profile for new codes!`,
            });
          }, 1000);
        }

        navigate("/profile");
      } else {
        toast.error(result.error || "Failed to create subscription");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("An error occurred during purchase");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!location.state?.product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">No product selected</p>
            <Button onClick={() => navigate("/gift-cards")}>
              Browse Gift Cards
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-2xl">Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-muted-foreground">Product Details</Label>
              <div className="mt-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.description}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {product.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground mb-3 block">Purchase Type</Label>
              <RadioGroup value={purchaseType} onValueChange={(value) => setPurchaseType(value as "once" | "recurring")}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors cursor-pointer">
                    <RadioGroupItem value="once" id="once" />
                    <Label htmlFor="once" className="flex-1 cursor-pointer">
                      <div className="font-medium">One-time Purchase</div>
                      <div className="text-sm text-muted-foreground">
                        Buy gift card once
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-4 border border-border rounded-lg bg-card hover:bg-muted/20 transition-colors cursor-pointer">
                    <RadioGroupItem value="recurring" id="recurring" />
                    <Label htmlFor="recurring" className="flex-1 cursor-pointer">
                      <div className="font-medium">Recurring Purchase</div>
                      <div className="text-sm text-muted-foreground">
                        Auto-purchase at custom intervals
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {purchaseType === "recurring" && (
                <div className="mt-4 space-y-3">
                  <Label htmlFor="interval">Recurring Interval</Label>
                  <Input
                    id="interval"
                    value={recurringInterval}
                    onChange={(e) => setRecurringInterval(e.target.value)}
                    placeholder="YY:MM:DD:hh:mm:ss"
                    className="font-mono"
                  />
                  <div className="flex gap-2 p-3 bg-muted/20 rounded-lg border border-border">
                    <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Format: YY:MM:DD:hh:mm:ss</p>
                      <p>Examples:</p>
                      <p>• <span className="font-mono">00:00:00:00:00:10</span> = Every 10 seconds (demo)</p>
                      <p>• <span className="font-mono">00:00:07:00:00:00</span> = Every week</p>
                      <p>• <span className="font-mono">00:01:00:00:00:00</span> = Every month</p>
                      <p>• <span className="font-mono">00:03:00:00:00:00</span> = Every 3 months</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground">Payment Method</Label>
              <div className="mt-3 p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                    💰
                  </div>
                  <div>
                    <p className="font-medium">USDC on Solana</p>
                    <p className="text-sm text-muted-foreground">
                      Fast and secure payment
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground">Billing Details</Label>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <span>Gift Card Value</span>
                  <span className="font-medium">${product.price} USDC</span>
                </div>
                {purchaseType === "recurring" && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Billing Type</span>
                    <span>Recurring</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${product.price} USDC</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/20 p-4 rounded-lg border border-border">
              <div className="flex gap-2 mb-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm">
                  Receive promo code instantly after payment
                </p>
              </div>
              <div className="flex gap-2 mb-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm">
                  {purchaseType === "once" 
                    ? "Use your code at the merchant's website" 
                    : "Auto-purchase at your specified interval"}
                </p>
              </div>
              {purchaseType === "recurring" && (
                <div className="flex gap-2 mb-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm">
                    Cancel anytime from your profile
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm">
                  Secure payment via Solana blockchain
                </p>
              </div>
            </div>

            {connected ? (
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    Connected Wallet
                  </p>
                  <p className="font-mono text-sm">
                    {publicKey?.toBase58().slice(0, 8)}...
                    {publicKey?.toBase58().slice(-8)}
                  </p>
                </div>
                <Button
                  onClick={handlePurchase}
                  disabled={isProcessing}
                  className="w-full gradient-primary border-0 text-white h-12 text-base"
                >
                  {isProcessing ? "Processing..." : `Pay ${product.price} USDC`}
                </Button>
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-border rounded-lg">
                <div className="text-4xl mb-3">🔒</div>
                <p className="text-muted-foreground mb-4">
                  Connect your wallet to complete purchase
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the "Connect Wallet" button in the top right
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutGiftCard;
