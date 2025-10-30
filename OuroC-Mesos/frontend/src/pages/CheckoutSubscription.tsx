import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationsContext";
import { usePromoCodes } from "@/contexts/PromoCodesContext";
import { createSubscription } from "@/lib/backend";

const CheckoutSubscription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { connected, publicKey } = useWallet();
  const { addNotification } = useNotifications();
  const { addPromoCode } = usePromoCodes();
  const [isProcessing, setIsProcessing] = useState(false);

  const product = location.state?.product || {
    title: "Product",
    description: "Description",
    price: 0,
    category: "Category",
  };

  const handlePurchase = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsProcessing(true);
    
    // Simulate USDC payment processing on Solana
    setTimeout(() => {
      setIsProcessing(false);
      
      const promoCode = `SUB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      addPromoCode({
        productTitle: product.title,
        code: promoCode,
        type: "subscription",
      });
      
      toast.success("Subscription activated successfully!");
      
      addNotification({
        type: "success",
        title: "Promo Code Received",
        message: `Your ${product.title} promo code: ${promoCode}`,
      });
      
      // Add upcoming payment reminder
      setTimeout(() => {
        addNotification({
          type: "info",
          title: "Upcoming Payment",
          message: `Payment for ${product.title} is due in 1 day`,
        });
      }, 1000);
      
      navigate("/profile");
    }, 2000);
  };

  if (!location.state?.product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">No product selected</p>
            <Button onClick={() => navigate("/subscriptions")}>
              Browse Subscriptions
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
                  <span>Subscription Price</span>
                  <span className="font-medium">${product.price} USDC</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Billing Interval</span>
                  <span>Monthly</span>
                </div>
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
                  Your subscription will auto-renew monthly
                </p>
              </div>
              <div className="flex gap-2 mb-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm">
                  Cancel anytime from your profile
                </p>
              </div>
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

export default CheckoutSubscription;
