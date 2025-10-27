import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GiftCards = () => {
  const categories = ["All", "Shopping", "Gaming", "Food & Drink", "Entertainment", "Travel"];
  
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
      description: "Rides and Uber Eats delivery",
      price: 30,
      category: "Travel",
      type: "giftcard" as const,
      isHot: true,
    },
    {
      id: 7,
      title: "Target Gift Card",
      description: "Everything you need at Target stores",
      price: 25,
      category: "Shopping",
      type: "giftcard" as const,
    },
    {
      id: 8,
      title: "PlayStation Store Gift Card",
      description: "Games, add-ons, and subscriptions",
      price: 50,
      category: "Gaming",
      type: "giftcard" as const,
      isNew: true,
    },
    {
      id: 9,
      title: "DoorDash Gift Card",
      description: "Food delivery from your favorite restaurants",
      price: 40,
      category: "Food & Drink",
      type: "giftcard" as const,
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const filteredGiftCards = selectedCategory === "All" 
    ? giftCards 
    : giftCards.filter(card => card.category === selectedCategory);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3 text-foreground">
            Gift Cards
          </h1>
          <p className="text-muted-foreground text-lg">
            Buy gift cards with USDC - One-time or recurring purchases
          </p>
        </div>

        <Tabs defaultValue="All" className="mb-8" onValueChange={setSelectedCategory}>
          <TabsList className="glass w-full justify-start overflow-x-auto flex-wrap h-auto">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGiftCards.map((giftCard) => (
            <ProductCard key={giftCard.id} {...giftCard} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GiftCards;
