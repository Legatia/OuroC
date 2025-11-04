/**
 * Arc Wallet Context
 * Provides EVM wallet connection for Arc blockchain
 * Supports MetaMask, WalletConnect, and other EVM wallets
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { ARC_TESTNET } from '../lib/networks';

interface ArcWalletContextType {
  connected: boolean;
  address: string | null;
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToArc: () => Promise<void>;
}

const ArcWalletContext = createContext<ArcWalletContextType | undefined>(undefined);

interface ArcWalletProviderProps {
  children: ReactNode;
}

export function ArcWalletProvider({ children }: ArcWalletProviderProps) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();

          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const network = await provider.getNetwork();

            setProvider(provider);
            setSigner(signer);
            setAddress(address);
            setChainId(Number(network.chainId));
            setConnected(true);
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error);
        }
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        const newChainId = parseInt(chainIdHex, 16);
        setChainId(newChainId);
        // Reload provider on chain change
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request account access
      await provider.send('eth_requestAccounts', []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setChainId(Number(network.chainId));
      setConnected(true);

      // Automatically switch to Arc if not already on it
      if (Number(network.chainId) !== ARC_TESTNET.chainId) {
        await switchToArc();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const switchToArc = async () => {
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const chainIdHex = `0x${ARC_TESTNET.chainId?.toString(16)}`;

      // Try to switch to Arc network
      await provider.send('wallet_switchEthereumChain', [
        { chainId: chainIdHex },
      ]);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [
            {
              chainId: `0x${ARC_TESTNET.chainId?.toString(16)}`,
              chainName: ARC_TESTNET.name,
              rpcUrls: [ARC_TESTNET.rpcUrl],
              nativeCurrency: ARC_TESTNET.nativeCurrency,
              blockExplorerUrls: [ARC_TESTNET.explorerUrl],
            },
          ]);
        } catch (addError) {
          console.error('Failed to add Arc network:', addError);
          throw addError;
        }
      } else {
        console.error('Failed to switch to Arc network:', switchError);
        throw switchError;
      }
    }
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  };

  const value: ArcWalletContextType = {
    connected,
    address,
    provider,
    signer,
    chainId,
    connect,
    disconnect,
    switchToArc,
  };

  return (
    <ArcWalletContext.Provider value={value}>
      {children}
    </ArcWalletContext.Provider>
  );
}

export function useArcWallet() {
  const context = useContext(ArcWalletContext);
  if (!context) {
    throw new Error('useArcWallet must be used within ArcWalletProvider');
  }
  return context;
}

// Hook to check if user is on Arc network
export function useIsArcNetwork() {
  const { chainId } = useArcWallet();
  return chainId === ARC_TESTNET.chainId;
}
