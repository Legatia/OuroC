import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WalletContextProvider from "./contexts/WalletContextProvider";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Subscriptions from "./pages/Subscriptions";
import GiftCards from "./pages/GiftCards";
import Profile from "./pages/Profile";
import CheckoutSubscription from "./pages/CheckoutSubscription";
import CheckoutGiftCard from "./pages/CheckoutGiftCard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletContextProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/gift-cards" element={<GiftCards />} />
            <Route path="/checkout/subscription" element={<CheckoutSubscription />} />
            <Route path="/checkout/gift-card" element={<CheckoutGiftCard />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WalletContextProvider>
  </QueryClientProvider>
);

export default App;
