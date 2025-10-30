import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import RecurringPurchase from "@/components/RecurringPurchase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePromoCodes } from "@/contexts/PromoCodesContext";
import { Copy, Gift } from "lucide-react";
import { format } from "date-fns";
import { listSubscriptions, cancelSubscription, pauseSubscription, resumeSubscription } from "@/lib/backend";

const Profile = () => {
  const { connected, publicKey } = useWallet();
  const { promoCodes } = usePromoCodes();
  
  const [recurringPurchases, setRecurringPurchases] = useState<any[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  // Load subscriptions from ICP timer canister
  useEffect(() => {
    if (connected && publicKey) {
      loadSubscriptions();
    }
  }, [connected, publicKey]);

  const loadSubscriptions = async () => {
    if (!publicKey) return;

    setIsLoadingSubscriptions(true);
    try {
      const subs = await listSubscriptions(publicKey.toBase58());

      // Transform ICP subscriptions to UI format
      const transformed = subs.map((sub: any) => {
        // Determine status from variant
        let statusStr = "paused";
        if ('Active' in sub.status) statusStr = "active";
        else if ('Paused' in sub.status) statusStr = "paused";
        else if ('Cancelled' in sub.status) statusStr = "cancelled";
        else if ('Expired' in sub.status) statusStr = "expired";

        // Convert next_execution from nanoseconds timestamp to date string
        let nextPaymentDate = "Not scheduled";
        try {
          // ICP timestamps are in nanoseconds, JavaScript Date expects milliseconds
          const nextExecutionNanos = Number(sub.next_execution);

          if (!isNaN(nextExecutionNanos) && nextExecutionNanos > 0 && isFinite(nextExecutionNanos)) {
            const nextExecutionMillis = nextExecutionNanos / 1_000_000; // Convert nanoseconds to milliseconds
            nextPaymentDate = new Date(nextExecutionMillis).toISOString().split('T')[0];
          }
        } catch (dateError) {
          console.error("Error converting date:", dateError);
        }

        return {
          id: sub.id,
          title: `Subscription ${sub.id.slice(0, 8)}...`,
          type: "subscription" as const,
          interval: `${sub.interval_seconds} seconds`,
          nextPayment: nextPaymentDate,
          amount: 0, // Amount not stored in subscription, could fetch from creation request if needed
          status: statusStr,
        };
      });

      setRecurringPurchases(transformed);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

  const purchaseHistory = [
    {
      id: 1,
      title: "Netflix Premium",
      type: "subscription",
      date: "2025-10-24",
      amount: 15.99,
      status: "completed",
    },
    {
      id: 2,
      title: "Steam Gift Card",
      type: "giftcard",
      date: "2025-10-20",
      amount: 20,
      status: "completed",
    },
    {
      id: 3,
      title: "Spotify Premium",
      type: "subscription",
      date: "2025-10-15",
      amount: 9.99,
      status: "completed",
    },
    {
      id: 4,
      title: "Starbucks Gift Card",
      type: "giftcard",
      date: "2025-10-10",
      amount: 25,
      status: "completed",
    },
  ];

  const handleCancelRecurring = async (subscriptionId: string) => {
    try {
      // Call ICP timer canister to cancel subscription
      const result = await cancelSubscription(subscriptionId);

      if (result.success) {
        // Remove from local state
        setRecurringPurchases(prev => prev.filter(p => p.id !== subscriptionId));
        toast.success("Recurring purchase cancelled successfully!");

        // TODO: Also cancel on Solana contract (revoke delegation)
        console.log("🔴 Should also cancel Solana subscription:", subscriptionId);
      } else {
        toast.error("Failed to cancel: " + result.error);
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("An error occurred while cancelling");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Please connect your Phantom wallet to view your profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="glass mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Your Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-xl">
                👤
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connected Address</p>
                <p className="font-mono text-sm">
                  {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="codes" className="w-full">
          <TabsList className="glass w-full grid grid-cols-3">
            <TabsTrigger 
              value="codes"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              Promo Codes
            </TabsTrigger>
            <TabsTrigger 
              value="recurring"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              Active Recurring
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              Purchase History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="codes" className="mt-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Your Promo Codes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {promoCodes.length === 0 ? (
                  <div className="py-12 text-center">
                    <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">No promo codes yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your codes will appear here after purchase
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {promoCodes.map((promoCode) => (
                      <div
                        key={promoCode.id}
                        className="p-4 border border-border rounded-lg bg-card hover:bg-muted/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{promoCode.productTitle}</h3>
                              <Badge variant={promoCode.type === "subscription" ? "default" : "secondary"}>
                                {promoCode.type}
                              </Badge>
                            </div>
                            <div className="bg-muted/50 p-3 rounded border border-border mb-2">
                              <p className="font-mono text-lg font-bold text-primary">
                                {promoCode.code}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Purchased: {format(promoCode.purchaseDate, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyCode(promoCode.code)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recurring" className="mt-6 space-y-4">
            {recurringPurchases.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No active recurring purchases</p>
                </CardContent>
              </Card>
            ) : (
              recurringPurchases.map((purchase) => (
                <RecurringPurchase
                  key={purchase.id}
                  {...purchase}
                  onCancel={() => handleCancelRecurring(purchase.id)}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <Card className="glass">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {purchaseHistory.map((purchase) => (
                    <div key={purchase.id} className="p-4 hover:bg-muted/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{purchase.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant={purchase.type === "subscription" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {purchase.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{purchase.date}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${purchase.amount} USDC</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {purchase.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
