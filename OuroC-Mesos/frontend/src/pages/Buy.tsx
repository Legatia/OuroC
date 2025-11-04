import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Buy = () => {
  // Subscription categories and data
  const subscriptionCategories = ["All", "Entertainment", "Music", "Software", "Productivity", "Gaming"];

  const subscriptions = [
    {
      id: 1,
      title: "Netflix Premium",
      description: "Stream unlimited movies and shows in 4K",
      price: 15.99,
      category: "Entertainment",
      type: "subscription" as const,
      isHot: true,
    },
    {
      id: 2,
      title: "Spotify Premium",
      description: "Ad-free music streaming with offline downloads",
      price: 9.99,
      category: "Music",
      type: "subscription" as const,
      isHot: true,
    },
    {
      id: 3,
      title: "Adobe Creative Cloud",
      description: "Complete creative suite for professionals",
      price: 54.99,
      category: "Software",
      type: "subscription" as const,
      isNew: true,
    },
    {
      id: 4,
      title: "YouTube Premium",
      description: "Ad-free videos with background play and downloads",
      price: 11.99,
      category: "Entertainment",
      type: "subscription" as const,
    },
    {
      id: 5,
      title: "Apple Music",
      description: "Access to 100 million songs and lossless audio",
      price: 10.99,
      category: "Music",
      type: "subscription" as const,
    },
    {
      id: 6,
      title: "Notion Plus",
      description: "Unlimited blocks and file uploads",
      price: 8.00,
      category: "Productivity",
      type: "subscription" as const,
    },
    {
      id: 7,
      title: "Disney+",
      description: "Stream Disney, Pixar, Marvel, Star Wars & more",
      price: 7.99,
      category: "Entertainment",
      type: "subscription" as const,
      isNew: true,
    },
    {
      id: 8,
      title: "Xbox Game Pass",
      description: "Access to hundreds of high-quality games",
      price: 16.99,
      category: "Gaming",
      type: "subscription" as const,
      isHot: true,
    },
  ];

  // Gift card categories and data
  const giftCardCategories = ["All", "Shopping", "Gaming", "Food & Drink", "Entertainment", "Travel"];

  const giftCards = [
    {
      id: 1,
      title: "Amazon Gift Card",
      description: "Shop millions of products on Amazon",
      price: 50,
      category: "Shopping",
      type: "giftcard" as const,
      isNew: true,
    },
    {
      id: 2,
      title: "Steam Gift Card",
      description: "Purchase games and in-game content",
      price: 20,
      category: "Gaming",
      type: "giftcard" as const,
      isHot: true,
    },
    {
      id: 3,
      title: "Starbucks Gift Card",
      description: "Enjoy your favorite coffee and treats",
      price: 25,
      category: "Food & Drink",
      type: "giftcard" as const,
      isNew: true,
    },
    {
      id: 4,
      title: "iTunes Gift Card",
      description: "Apps, games, music, movies, and more",
      price: 15,
      category: "Entertainment",
      type: "giftcard" as const,
    },
    {
      id: 5,
      title: "Google Play Gift Card",
      description: "Apps, games, books, and entertainment",
      price: 10,
      category: "Entertainment",
      type: "giftcard" as const,
    },
    {
      id: 6,
      title: "Uber Gift Card",
      description: "Rides and Uber Eats deliveries",
      price: 30,
      category: "Travel",
      type: "giftcard" as const,
    },
    {
      id: 7,
      title: "Target Gift Card",
      description: "Shop at Target stores and online",
      price: 100,
      category: "Shopping",
      type: "giftcard" as const,
    },
    {
      id: 8,
      title: "PlayStation Store Gift Card",
      description: "Games, add-ons, and PS Plus subscriptions",
      price: 25,
      category: "Gaming",
      type: "giftcard" as const,
      isHot: true,
    },
  ];

  const [subscriptionCategory, setSubscriptionCategory] = useState("All");
  const [giftCardCategory, setGiftCardCategory] = useState("All");

  const filteredSubscriptions = subscriptionCategory === "All"
    ? subscriptions
    : subscriptions.filter(sub => sub.category === subscriptionCategory);

  const filteredGiftCards = giftCardCategory === "All"
    ? giftCards
    : giftCards.filter(card => card.category === giftCardCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 gradient-text">Buy Services</h1>
          <p className="text-muted-foreground text-lg">
            Purchase subscriptions and gift cards with crypto payments
          </p>
        </div>

        {/* Main Tabs: Subscription and Gift Card */}
        <Tabs defaultValue="subscription" className="w-full">
          <TabsList className="glass grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="subscription">Subscriptions</TabsTrigger>
            <TabsTrigger value="giftcard">Gift Cards</TabsTrigger>
          </TabsList>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Tabs
              value={subscriptionCategory}
              onValueChange={setSubscriptionCategory}
              className="w-full"
            >
              <TabsList className="glass w-full max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-6 mb-8">
                {subscriptionCategories.map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="text-xs md:text-sm">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={subscriptionCategory}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSubscriptions.map((subscription) => (
                    <ProductCard key={subscription.id} product={subscription} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Gift Card Tab */}
          <TabsContent value="giftcard">
            <Tabs
              value={giftCardCategory}
              onValueChange={setGiftCardCategory}
              className="w-full"
            >
              <TabsList className="glass w-full max-w-4xl mx-auto grid grid-cols-3 md:grid-cols-6 mb-8">
                {giftCardCategories.map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="text-xs md:text-sm">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={giftCardCategory}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredGiftCards.map((giftCard) => (
                    <ProductCard key={giftCard.id} product={giftCard} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Buy;
