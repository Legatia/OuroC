/**
 * Shared types for backend API
 */

export interface ContentMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  interval: 'weekly' | 'monthly' | 'quarterly';
  creatorWallet: string;
  creatorName: string;
  thumbnailUrl: string;
  tags?: string[];
  createdAt: number;
}

export interface GuildMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  treasuryAddress: string;
  subscriptionPrice: number;
  interval: 'weekly' | 'monthly' | 'quarterly';
  threshold: number;
  members: string[];
  logoEmoji?: string;
  tags?: string[];
  createdAt: number;
}

export interface ProposalMetadata {
  id: string;
  guildId: string;
  title: string;
  description: string;
  recipient: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  votesFor: number;
  votesAgainst: number;
  createdAt: number;
  executedAt?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  hash?: string; // Aleph message hash
}
