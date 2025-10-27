import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Subscriptions = () => {
  const categories = ["All", "Entertainment", "Music", "Software", "Productivity", "Gaming"];
  
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
      title: "Microsoft 365",
      description: "Office apps, cloud storage, and premium features",
      price: 6.99,
      category: "Productivity",
      type: "subscription" as const,
      isNew: true,
    },
    {
      id: 7,
      title: "Disney+",
      description: "Stream Disney, Pixar, Marvel, Star Wars & more",
      price: 7.99,
      category: "Entertainment",
      type: "subscription" as const,
    },
    {
      id: 8,
      title: "Xbox Game Pass Ultimate",
      description: "100+ games, online multiplayer, and EA Play",
      price: 16.99,
      category: "Gaming",
      type: "subscription" as const,
      isHot: true,
    },
    {
      id: 9,
      title: "Notion Premium",
      description: "Unlimited blocks, file uploads, and version history",
      price: 8.00,
      category: "Productivity",
      type: "subscription" as const,
    },
  ];

  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const filteredSubscriptions = selectedCategory === "All" 
    ? subscriptions 
    : subscriptions.filter(sub => sub.category === selectedCategory);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-3 text-foreground">
            Subscriptions
          </h1>
          <p className="text-muted-foreground text-lg">
            Pay for your favorite services with USDC on Solana
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
          {filteredSubscriptions.map((subscription) => (
            <ProductCard key={subscription.id} {...subscription} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
