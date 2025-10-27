import { Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";
import { NotificationsDropdown } from "./NotificationsDropdown";

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="glass sticky top-0 z-50 border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <Wallet className="w-6 h-6 text-primary" />
            OuroC-Mesos
          </Link>
          
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={`transition-colors ${isActive('/') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Home
            </Link>
            <Link 
              to="/subscriptions" 
              className={`transition-colors ${isActive('/subscriptions') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Subscriptions
            </Link>
            <Link 
              to="/gift-cards" 
              className={`transition-colors ${isActive('/gift-cards') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Gift Cards
            </Link>
            <Link 
              to="/profile" 
              className={`transition-colors ${isActive('/profile') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Profile
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationsDropdown />
            <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-lg !h-10" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
