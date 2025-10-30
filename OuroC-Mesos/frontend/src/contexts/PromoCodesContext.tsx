import { createContext, useContext, useState, ReactNode } from "react";

export interface PromoCode {
  id: string;
  productTitle: string;
  code: string;
  type: "subscription" | "giftcard";
  purchaseDate: Date;
  expiryDate?: Date;
}

interface PromoCodesContextType {
  promoCodes: PromoCode[];
  addPromoCode: (code: Omit<PromoCode, "id" | "purchaseDate">) => void;
}

const PromoCodesContext = createContext<PromoCodesContextType | undefined>(undefined);

export function PromoCodesProvider({ children }: { children: ReactNode }) {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  const addPromoCode = (code: Omit<PromoCode, "id" | "purchaseDate">) => {
    const newCode: PromoCode = {
      ...code,
      id: Date.now().toString(),
      purchaseDate: new Date(),
    };
    setPromoCodes((prev) => [newCode, ...prev]);
  };

  return (
    <PromoCodesContext.Provider value={{ promoCodes, addPromoCode }}>
      {children}
    </PromoCodesContext.Provider>
  );
}

export function usePromoCodes() {
  const context = useContext(PromoCodesContext);
  if (!context) {
    throw new Error("usePromoCodes must be used within PromoCodesProvider");
  }
  return context;
}
