import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface ProductCardProps {
  title: string;
  description: string;
  price: number;
  category: string;
  isNew?: boolean;
  isHot?: boolean;
  image?: string;
  type: "subscription" | "giftcard";
}

const ProductCard = ({ 
  title, 
  description, 
  price, 
  category, 
  isNew, 
  isHot,
  image,
  type 
}: ProductCardProps) => {
  const navigate = useNavigate();

  const handlePurchase = () => {
    const checkoutPath = type === "subscription" ? "/checkout/subscription" : "/checkout/gift-card";
    navigate(checkoutPath, { 
      state: { 
        product: { title, description, price, category, type } 
      } 
    });
  };

  return (
    <Card className="glass overflow-hidden hover:border-primary/50 transition-all duration-300 group">
      <CardHeader className="p-0">
        <div className="relative h-48 overflow-hidden">
          <div className="absolute inset-0 gradient-card" />
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20 group-hover:opacity-30 transition-opacity">
            {type === "subscription" ? "🔄" : "🎁"}
          </div>
          {(isNew || isHot) && (
            <div className="absolute top-3 right-3">
              {isNew && <Badge variant="secondary" className="bg-secondary/90">New</Badge>}
              {isHot && <Badge variant="default" className="bg-accent/90 ml-2">Hot</Badge>}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Badge variant="outline" className="mb-2">{category}</Badge>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary">
            ${price}
          </span>
          <span className="text-muted-foreground text-sm">USDC</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button onClick={handlePurchase} className="w-full gradient-primary border-0 text-white">
          Purchase
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
