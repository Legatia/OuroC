import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Eye, Star } from "lucide-react";
import { ContentMetadata } from "@/lib/alephSimple";

interface CreatorAnalyticsProps {
  content: ContentMetadata[];
  subscriptions: any[]; // From listSubscriptions
}

export function CreatorAnalytics({ content, subscriptions }: CreatorAnalyticsProps) {
  // Calculate analytics
  const totalSubscribers = subscriptions.filter(sub => 'Active' in sub.status).length;

  // Calculate total monthly revenue
  const monthlyRevenue = subscriptions
    .filter(sub => 'Active' in sub.status)
    .reduce((sum, sub) => {
      const amount = Number(sub.amount) / 1_000_000;
      const intervalDays = Number(sub.interval_seconds) / 86400;
      const monthlyAmount = (amount / intervalDays) * 30;
      return sum + monthlyAmount;
    }, 0);

  // Calculate total all-time revenue (estimated)
  const totalRevenue = subscriptions.reduce((sum, sub) => {
    const amount = Number(sub.amount) / 1_000_000;
    // Estimate based on how long subscription has been active
    // For simplicity, just count each subscription once
    return sum + amount;
  }, 0);

  // Average rating across all content
  const avgRating = 4.5; // TODO: Calculate from actual reviews

  // Content performance table data
  const contentPerformance = content.map(c => {
    const contentSubs = subscriptions.filter(
      sub => sub.merchant_address === c.creatorWallet
    );
    const activeContentSubs = contentSubs.filter(sub => 'Active' in sub.status);

    return {
      title: c.title,
      subscribers: activeContentSubs.length,
      price: c.price,
      interval: c.interval,
      revenue: activeContentSubs.length * c.price,
      rating: 4.5, // TODO: Get from actual reviews
    };
  });

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyRevenue.toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all content
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {contentPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Content
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Price
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Subscribers
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Revenue
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contentPerformance.map((item, index) => (
                    <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <p className="font-medium">{item.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">
                          ${item.price.toFixed(2)}/{item.interval}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{item.subscribers}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-green-600">
                          ${item.revenue.toFixed(2)}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No content data yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Growth Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Revenue chart coming soon</p>
              <p className="text-xs mt-2">Install recharts library for visualizations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
