import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Calendar } from "lucide-react";

interface RecurringPurchaseProps {
  title: string;
  type: "subscription" | "giftcard";
  interval: string;
  nextPayment: string;
  amount: number;
  onCancel: () => void;
}

const RecurringPurchase = ({
  title,
  type,
  interval,
  nextPayment,
  amount,
  onCancel
}: RecurringPurchaseProps) => {
  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCancel}
          className="hover:bg-destructive/20 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={type === "subscription" ? "default" : "secondary"}>
              {type === "subscription" ? "Subscription" : "Gift Card"}
            </Badge>
            <span className="text-sm text-muted-foreground">${amount} USDC</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Every {interval}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Next payment: {nextPayment}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurringPurchase;
