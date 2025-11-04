/**
 * Network Switcher Component
 * Allows users to switch between Solana and Arc networks
 */

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getActiveNetworks, type NetworkConfig } from '@/lib/networks';
import { useArcWallet } from '@/contexts/ArcWalletContext';

interface NetworkSwitcherProps {
  selectedNetwork: string;
  onNetworkChange: (networkId: string) => void;
}

export function NetworkSwitcher({
  selectedNetwork,
  onNetworkChange,
}: NetworkSwitcherProps) {
  const networks = getActiveNetworks();
  const { switchToArc, connected: arcConnected } = useArcWallet();

  const currentNetwork = networks.find((n) => n.id === selectedNetwork);

  const handleNetworkSelect = async (network: NetworkConfig) => {
    onNetworkChange(network.id);

    // If switching to Arc and wallet is connected, switch chain
    if (network.type === 'arc' && arcConnected) {
      try {
        await switchToArc();
      } catch (error) {
        console.error('Failed to switch to Arc network:', error);
      }
    }
  };

  if (networks.length <= 1) {
    // Don't show switcher if only one network is available
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                currentNetwork?.type === 'solana' ? 'bg-purple-500' : 'bg-blue-500'
              }`}
            />
            <span>{currentNetwork?.name || 'Select Network'}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {networks.map((network) => (
          <DropdownMenuItem
            key={network.id}
            onClick={() => handleNetworkSelect(network)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  network.type === 'solana' ? 'bg-purple-500' : 'bg-blue-500'
                }`}
              />
              <div className="flex flex-col">
                <span className="font-medium">{network.name}</span>
                <span className="text-xs text-muted-foreground">
                  {network.nativeCurrency.symbol}
                </span>
              </div>
            </div>
            {network.id === selectedNetwork && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
