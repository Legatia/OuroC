import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  listSubscriptions,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from "@/lib/backend";
import {
  Calendar,
  DollarSign,
  Pause,
  Play,
  X,
  ArrowLeft,
  Clock,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface Subscription {
  subscription_id: string;
  merchant_address: string;
  amount: bigint;
  interval_seconds: bigint;
  status: { Active?: null; Paused?: null; Cancelled?: null; Expired?: null };
  next_execution: bigint;
  merchant_name?: string;
}

const Subscriptions = () => {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "paused" | "history">("active");

  useEffect(() => {
    if (connected && publicKey) {
      loadSubscriptions();
    }
  }, [connected, publicKey]);

  const loadSubscriptions = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    try {
      const subs = await listSubscriptions(publicKey.toBase58());
      setSubscriptions(subs);
      console.log(`✅ Loaded ${subs.length} subscriptions`);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async (subscriptionId: string) => {
    if (!publicKey) return;

    try {
      await pauseSubscription(subscriptionId, publicKey.toBase58());
      toast.success("Subscription paused");
      await loadSubscriptions();
    } catch (error) {
      console.error("Failed to pause subscription:", error);
      toast.error("Failed to pause subscription");
    }
  };

  const handleResume = async (subscriptionId: string) => {
    if (!publicKey) return;

    try {
      await resumeSubscription(subscriptionId, publicKey.toBase58());
      toast.success("Subscription resumed");
      await loadSubscriptions();
    } catch (error) {
      console.error("Failed to resume subscription:", error);
      toast.error("Failed to resume subscription");
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!window.confirm("Are you sure you want to cancel this subscription? This action cannot be undone.")) {
      return;
    }

    if (!publicKey) return;

    try {
      await cancelSubscription(subscriptionId, publicKey.toBase58());
      toast.success("Subscription cancelled");
      await loadSubscriptions();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription");
    }
  };

  const getStatusBadge = (sub: Subscription) => {
    if ("Active" in sub.status) {
      return <Badge className="bg-green-600">Active</Badge>;
    } else if ("Paused" in sub.status) {
      return <Badge className="bg-yellow-600">Paused</Badge>;
    } else if ("Cancelled" in sub.status) {
      return <Badge variant="destructive">Cancelled</Badge>;
    } else if ("Expired" in sub.status) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const formatNextPayment = (nextExecutionNanos: bigint): string => {
    try {
      const nextExecutionMillis = Number(nextExecutionNanos) / 1_000_000;
      if (!isFinite(nextExecutionMillis) || nextExecutionMillis <= 0) {
        return "Not scheduled";
      }
      return format(new Date(nextExecutionMillis), "MMM d, yyyy");
    } catch (error) {
      return "Not scheduled";
    }
  };

  const formatInterval = (intervalSeconds: bigint): string => {
    const seconds = Number(intervalSeconds);
    const days = Math.floor(seconds / 86400);

    if (days === 7) return "Weekly";
    if (days === 30 || days === 31) return "Monthly";
    if (days >= 90 && days <= 92) return "Quarterly";

    return `Every ${days} days`;
  };

  const formatAmount = (amount: bigint): string => {
    return `$${(Number(amount) / 1_000_000).toFixed(2)}`;
  };

  const filterSubscriptions = (status: "active" | "paused" | "history") => {
    return subscriptions.filter((sub) => {
      if (status === "active") return "Active" in sub.status;
      if (status === "paused") return "Paused" in sub.status;
      if (status === "history") return "Cancelled" in sub.status || "Expired" in sub.status;
      return false;
    });
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-8">
            Please connect your wallet to view your subscriptions.
          </p>
        </div>
      </div>
    );
  }

  const activeSubscriptions = filterSubscriptions("active");
  const pausedSubscriptions = filterSubscriptions("paused");
  const historySubscriptions = filterSubscriptions("history");

  // Calculate total monthly spending
  const totalMonthlySpending = activeSubscriptions.reduce((sum, sub) => {
    const amount = Number(sub.amount) / 1_000_000;
    const intervalDays = Number(sub.interval_seconds) / 86400;
    const monthlyAmount = (amount / intervalDays) * 30;
    return sum + monthlyAmount;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Subscriptions</h1>
              <p className="text-muted-foreground">
                Manage your recurring subscriptions and payment history
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Paused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pausedSubscriptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Monthly Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMonthlySpending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                estimated per month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                all subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subscriptions Tabs */}
        <Card className="glass">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">
                  Active ({activeSubscriptions.length})
                </TabsTrigger>
                <TabsTrigger value="paused">
                  Paused ({pausedSubscriptions.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  History ({historySubscriptions.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading subscriptions...</p>
              </div>
            ) : (
              <Tabs value={activeTab}>
                {/* Active Tab */}
                <TabsContent value="active">
                  {activeSubscriptions.length > 0 ? (
                    <div className="space-y-4">
                      {activeSubscriptions.map((sub) => (
                        <div
                          key={sub.subscription_id}
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">
                                  {sub.merchant_name || `${sub.merchant_address.slice(0, 8)}...${sub.merchant_address.slice(-6)}`}
                                </h4>
                                {getStatusBadge(sub)}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  <span>{formatAmount(sub.amount)} • {formatInterval(sub.interval_seconds)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Next payment: {formatNextPayment(sub.next_execution)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePause(sub.subscription_id)}
                              >
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(sub.subscription_id)}
                                className="text-red-600 hover:text-red-700 hover:border-red-600"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No active subscriptions</p>
                      <p className="text-sm mb-4">Browse the Community Hub to find great content</p>
                      <Button onClick={() => navigate('/community-hub')}>
                        Browse Community Hub
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Paused Tab */}
                <TabsContent value="paused">
                  {pausedSubscriptions.length > 0 ? (
                    <div className="space-y-4">
                      {pausedSubscriptions.map((sub) => (
                        <div
                          key={sub.subscription_id}
                          className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">
                                  {sub.merchant_name || `${sub.merchant_address.slice(0, 8)}...${sub.merchant_address.slice(-6)}`}
                                </h4>
                                {getStatusBadge(sub)}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  <span>{formatAmount(sub.amount)} • {formatInterval(sub.interval_seconds)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Subscription paused</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResume(sub.subscription_id)}
                                className="text-green-600 hover:text-green-700 hover:border-green-600"
                              >
                                <Play className="w-4 h-4 mr-1" />
                                Resume
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(sub.subscription_id)}
                                className="text-red-600 hover:text-red-700 hover:border-red-600"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No paused subscriptions</p>
                    </div>
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                  {historySubscriptions.length > 0 ? (
                    <div className="space-y-4">
                      {historySubscriptions.map((sub) => (
                        <div
                          key={sub.subscription_id}
                          className="p-4 border rounded-lg opacity-75"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold">
                                  {sub.merchant_name || `${sub.merchant_address.slice(0, 8)}...${sub.merchant_address.slice(-6)}`}
                                </h4>
                                {getStatusBadge(sub)}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4" />
                                  <span>{formatAmount(sub.amount)} • {formatInterval(sub.interval_seconds)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>No subscription history</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscriptions;
