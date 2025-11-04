import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { useArcWallet } from "@/contexts/ArcWalletContext";
import { getDefaultNetwork } from "@/lib/networks";

const Navbar = () => {
  const location = useLocation();
  const { connected: arcConnected, address: arcAddress, connect: connectArc, disconnect: disconnectArc } = useArcWallet();
  const [selectedNetwork, setSelectedNetwork] = useState(getDefaultNetwork().id);

  const isActive = (path: string) => location.pathname === path;
  const isArcNetwork = selectedNetwork === 'arc-testnet';

  // Store selected network in localStorage
  useEffect(() => {
    localStorage.setItem('selectedNetwork', selectedNetwork);
  }, [selectedNetwork]);

  // Load selected network from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedNetwork');
    if (saved) {
      setSelectedNetwork(saved);
    }
  }, []);

  const handleArcConnect = async () => {
    try {
      await connectArc();
    } catch (error) {
      console.error('Failed to connect Arc wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
              to="/buy"
              className={`transition-colors ${isActive('/buy') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Buy
            </Link>
            <Link
              to="/community-hub"
              className={`transition-colors ${isActive('/community-hub') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Community Hub
            </Link>
            <Link
              to="/guild"
              className={`transition-colors ${isActive('/guild') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Guild
            </Link>
            <Link
              to="/pay"
              className={`transition-colors ${isActive('/pay') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pay
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

            {/* Network Switcher */}
            <NetworkSwitcher
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
            />

            {/* Wallet Connection - Show appropriate button based on selected network */}
            {isArcNetwork ? (
              // Arc Wallet Button
              arcConnected ? (
                <Button
                  variant="default"
                  className="!bg-primary hover:!bg-primary/90 !rounded-lg !h-10"
                  onClick={disconnectArc}
                >
                  {arcAddress && formatAddress(arcAddress)}
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="!bg-primary hover:!bg-primary/90 !rounded-lg !h-10"
                  onClick={handleArcConnect}
                >
                  Connect Arc Wallet
                </Button>
              )
            ) : (
              // Solana Wallet Button
              <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !rounded-lg !h-10" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
