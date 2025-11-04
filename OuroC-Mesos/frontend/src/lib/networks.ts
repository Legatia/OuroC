/**
 * Multi-Chain Network Configuration
 * Supports Solana and Arc (EVM) chains
 */

export type ChainType = 'solana' | 'arc';

export interface NetworkConfig {
  id: string;
  name: string;
  type: ChainType;
  chainId?: number; // EVM only
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    ouroCPrima: string;
    usdc: string;
  };
  enabled: boolean;
}

// Solana Network Configuration
export const SOLANA_DEVNET: NetworkConfig = {
  id: 'solana-devnet',
  name: 'Solana Devnet',
  type: 'solana',
  rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  explorerUrl: 'https://explorer.solana.com',
  nativeCurrency: {
    name: 'SOL',
    symbol: 'SOL',
    decimals: 9,
  },
  contracts: {
    ouroCPrima: import.meta.env.VITE_SOLANA_CONTRACT || '7c1tGePFVT3ztPEESfzG7gFqYiCJUDjFa7PCeyMSYtub',
    usdc: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  },
  enabled: true,
};

// Arc Network Configuration
export const ARC_TESTNET: NetworkConfig = {
  id: 'arc-testnet',
  name: 'Arc Testnet',
  type: 'arc',
  chainId: parseInt(import.meta.env.VITE_ARC_CHAIN_ID || '0'), // TODO: Update with actual Arc chain ID
  rpcUrl: import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network',
  explorerUrl: import.meta.env.VITE_ARC_EXPLORER_URL || 'https://explorer.testnet.arc.network',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6, // USDC is the native gas token on Arc!
  },
  contracts: {
    ouroCPrima: import.meta.env.VITE_ARC_CONTRACT || '',
    usdc: import.meta.env.VITE_ARC_USDC_ADDRESS || '',
  },
  enabled: !!import.meta.env.VITE_ARC_CONTRACT, // Only enable if contract is configured
};

// All supported networks
export const NETWORKS: Record<string, NetworkConfig> = {
  'solana-devnet': SOLANA_DEVNET,
  'arc-testnet': ARC_TESTNET,
};

// Get active networks (only those that are enabled)
export function getActiveNetworks(): NetworkConfig[] {
  return Object.values(NETWORKS).filter(n => n.enabled);
}

// Get network by ID
export function getNetworkById(id: string): NetworkConfig | undefined {
  return NETWORKS[id];
}

// Check if network is EVM-based
export function isEVMNetwork(networkId: string): boolean {
  const network = getNetworkById(networkId);
  return network?.type === 'arc';
}

// Check if network is Solana-based
export function isSolanaNetwork(networkId: string): boolean {
  const network = getNetworkById(networkId);
  return network?.type === 'solana';
}

// Get default network
export function getDefaultNetwork(): NetworkConfig {
  // Prefer Arc if configured, otherwise Solana
  return ARC_TESTNET.enabled ? ARC_TESTNET : SOLANA_DEVNET;
}
