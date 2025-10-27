import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Home = () => {
  const hotItems = [
    {
      id: 1,
      title: "Demo Gift Card",
      description: "Perfect for testing recurring payments - 10 second intervals",
      price: 1,
      category: "Demo",
      type: "giftcard" as const,
      isHot: true,
      isNew: true,
    },
    {
      id: 2,
      title: "Netflix Premium",
      description: "Stream unlimited movies and shows in 4K",
      price: 15.99,
      category: "Entertainment",
      type: "subscription" as const,
      isHot: true,
    },
    {
      id: 3,
      title: "Amazon Gift Card",
      description: "Shop millions of products on Amazon",
      price: 50,
      category: "Shopping",
      type: "giftcard" as const,
      isNew: true,
    },
    {
      id: 4,
      title: "Spotify Premium",
      description: "Ad-free music streaming with offline downloads",
      price: 9.99,
      category: "Music",
      type: "subscription" as const,
      isHot: true,
    },
    {
      id: 5,
      title: "Steam Gift Card",
      description: "Purchase games and in-game content",
      price: 20,
      category: "Gaming",
      type: "giftcard" as const,
      isNew: true,
    },
    {
      id: 6,
      title: "Adobe Creative Cloud",
      description: "Complete creative suite for professionals",
      price: 54.99,
      category: "Software",
      type: "subscription" as const,
      isHot: true,
    },
    {
      id: 7,
      title: "Starbucks Gift Card",
      description: "Enjoy your favorite coffee and treats",
      price: 25,
      category: "Food & Drink",
      type: "giftcard" as const,
      isNew: true,
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
              Pay with USDC on Solana
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Subscribe to your favorite services and buy gift cards using cryptocurrency.
              Fast, secure, and decentralized.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/subscriptions">
                <Button size="lg" className="gradient-primary border-0 text-white">
                  Browse Subscriptions
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/gift-cards">
                <Button size="lg" variant="outline">
                  View Gift Cards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Hot & New</h2>
              <p className="text-muted-foreground">Popular subscriptions and gift cards</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotItems.map((item) => (
              <ProductCard key={item.id} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 glass my-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">Instant payments powered by Solana blockchain</p>
            </div>
            <div>
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">Your wallet, your keys, your control</p>
            </div>
            <div>
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold mb-2">Auto-Recurring</h3>
              <p className="text-muted-foreground">Set it and forget it with custom intervals</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
