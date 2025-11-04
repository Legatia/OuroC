import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import {
  Users,
  DollarSign,
  TrendingUp,
  Shield,
  Zap,
  ArrowLeft,
  Vote,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  amount: number;
  recipient: string;
  votesFor: number;
  votesAgainst: number;
  totalVotingPower: number;
  status: 'active' | 'passed' | 'rejected' | 'executed';
  deadline: string;
  createdAt: string;
}

interface Member {
  wallet: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  votingPower: number;
}

interface Transaction {
  id: string;
  type: 'subscription' | 'proposal_execution' | 'refund';
  amount: number;
  from: string;
  to: string;
  date: string;
  txHash: string;
}

const GuildDetail = () => {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock guild data (in production, fetch from backend using guildId)
  const guild = {
    id: guildId,
    name: 'Solana Builders Guild',
    description:
      'Collective of Solana developers building the future. Pool resources for hackathons, conferences, and open-source contributions.',
    category: 'Developer',
    subscriptionPrice: 50,
    interval: 'monthly' as const,
    memberCount: 127,
    treasuryBalance: 42500,
    governanceType: 'dao' as const,
    membershipType: 'approval-required' as const,
    logoEmoji: '🏗️',
    tags: ['Developers', 'Open Source', 'Hackathons'],
    votingThreshold: 60, // 60% approval needed
    createdAt: '2025-09-15',
  };

  // Mock member status (toggle this to test member vs non-member views)
  const isMember = false; // Set to true to test member view, false for non-member view
  const memberRole = 'member'; // 'admin', 'moderator', or 'member'

  // Mock proposals
  const proposals: Proposal[] = [
    {
      id: 'prop_1',
      title: 'Fund Solana Breakpoint Conference Sponsorship',
      description:
        'Sponsor Solana Breakpoint 2025 with $5,000 for booth space and promotional materials. This will increase guild visibility and attract new members.',
      proposer: '9BVTpkYk4FvZ...',
      amount: 5000,
      recipient: 'ConfOrgWallet...',
      votesFor: 85,
      votesAgainst: 25,
      totalVotingPower: 127,
      status: 'active',
      deadline: '2025-11-10T23:59:59Z',
      createdAt: '2025-11-01T10:00:00Z',
    },
    {
      id: 'prop_2',
      title: 'Grant for Open Source Rust Library',
      description:
        'Provide $2,000 grant to member working on open-source Solana Rust library for DeFi protocols.',
      proposer: '8xK5J2vN3m...',
      amount: 2000,
      recipient: 'DevWallet...',
      votesFor: 92,
      votesAgainst: 12,
      totalVotingPower: 127,
      status: 'passed',
      deadline: '2025-10-30T23:59:59Z',
      createdAt: '2025-10-20T14:00:00Z',
    },
    {
      id: 'prop_3',
      title: 'Purchase GitHub Team Subscription',
      description: 'Annual GitHub Team subscription for guild projects - $300/year',
      proposer: '7zM4N2xQ5p...',
      amount: 300,
      recipient: 'GitHubPayment...',
      votesFor: 105,
      votesAgainst: 8,
      totalVotingPower: 127,
      status: 'executed',
      deadline: '2025-10-25T23:59:59Z',
      createdAt: '2025-10-15T09:00:00Z',
    },
  ];

  // Mock members
  const members: Member[] = [
    {
      wallet: '9BVTpkYk4FvZ5dMPF6H4SXdxYnpZtvdCJqG7TYjjkzHQ',
      role: 'admin',
      joinedAt: '2025-09-15',
      votingPower: 1,
    },
    {
      wallet: '8xK5J2vN3mP9rT4qW6hL1sF7dA2cE5yU9oI3bV8nM7k',
      role: 'moderator',
      joinedAt: '2025-09-20',
      votingPower: 1,
    },
    {
      wallet: '7zM4N2xQ5pR8tY6wK9jH3sG1fD4cE7vU2oL5bN8mK3j',
      role: 'member',
      joinedAt: '2025-09-25',
      votingPower: 1,
    },
    // ... more members
  ];

  // Mock transactions
  const transactions: Transaction[] = [
    {
      id: 'tx_1',
      type: 'subscription',
      amount: 50,
      from: '9BVTpk...',
      to: 'GuildTreasury...',
      date: '2025-11-04T10:00:00Z',
      txHash: '5KJH9BVTpkYk4FvZ...',
    },
    {
      id: 'tx_2',
      type: 'proposal_execution',
      amount: 300,
      from: 'GuildTreasury...',
      to: 'GitHubPayment...',
      date: '2025-10-26T15:30:00Z',
      txHash: '3LMH8xK5J2vN3m...',
    },
    {
      id: 'tx_3',
      type: 'subscription',
      amount: 50,
      from: '8xK5J2...',
      to: 'GuildTreasury...',
      date: '2025-11-03T12:00:00Z',
      txHash: '2NKG7zM4N2xQ5p...',
    },
  ];

  const handleVote = (proposalId: string, vote: 'for' | 'against') => {
    if (!publicKey) {
      toast.error('Please connect your wallet to vote');
      return;
    }
    if (!isMember) {
      toast.error('You must be a guild member to vote');
      return;
    }
    // TODO: Implement voting
    toast.success(`Voted ${vote} on proposal - Coming soon!`);
  };

  const handleJoinGuild = () => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }
    // TODO: Implement join flow
    toast.info('Join guild flow - Coming soon!');
  };

  const handleCreateProposal = () => {
    navigate(`/guild/${guildId}/create-proposal`);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500">⏳ Active</Badge>;
      case 'passed':
        return <Badge className="bg-green-500">✅ Passed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">❌ Rejected</Badge>;
      case 'executed':
        return <Badge className="bg-purple-500">🎉 Executed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/guild')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Guilds
        </Button>

        {/* Guild Header */}
        <div className="mb-8">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Logo */}
                <div className="text-7xl">{guild.logoEmoji}</div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-4xl font-bold mb-2">{guild.name}</h1>
                      <p className="text-muted-foreground text-lg">{guild.description}</p>
                    </div>
                    {!isMember && (
                      <Button size="lg" onClick={handleJoinGuild}>
                        Join Guild - ${guild.subscriptionPrice}/{guild.interval}
                      </Button>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {guild.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                    <Badge>{guild.category}</Badge>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Users className="w-4 h-4" />
                        Members
                      </div>
                      <div className="text-2xl font-bold">{guild.memberCount}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <DollarSign className="w-4 h-4" />
                        Treasury
                      </div>
                      <div className="text-2xl font-bold">
                        ${(guild.treasuryBalance / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        {guild.governanceType === 'dao' ? (
                          <Zap className="w-4 h-4" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                        Governance
                      </div>
                      <div className="text-lg font-bold capitalize">{guild.governanceType}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Vote className="w-4 h-4" />
                        Threshold
                      </div>
                      <div className="text-lg font-bold">{guild.votingThreshold}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="proposals">Proposals ({proposals.length})</TabsTrigger>
            <TabsTrigger value="members">Members ({guild.memberCount})</TabsTrigger>
            <TabsTrigger value="treasury">Treasury</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Active Proposals */}
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Proposals</CardTitle>
                  {isMember && (
                    <Button onClick={handleCreateProposal} className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Create Proposal
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isMember ? (
                  // Members: Show full proposal details with voting
                  <div className="space-y-4">
                    {proposals
                      .filter((p) => p.status === 'active')
                      .map((proposal) => {
                        const approvalPercentage =
                          (proposal.votesFor / proposal.totalVotingPower) * 100;
                        return (
                          <div key={proposal.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1">{proposal.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {proposal.description}
                                </p>
                              </div>
                              {getStatusBadge(proposal.status)}
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Amount: ${proposal.amount.toLocaleString()}
                                </span>
                                <span className="text-muted-foreground">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Ends: {new Date(proposal.deadline).toLocaleDateString()}
                                </span>
                              </div>

                              {/* Vote Progress */}
                              <div>
                                <div className="flex justify-between text-sm mb-2">
                                  <span>
                                    For: {proposal.votesFor} ({approvalPercentage.toFixed(1)}%)
                                  </span>
                                  <span>Against: {proposal.votesAgainst}</span>
                                </div>
                                <Progress value={approvalPercentage} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {approvalPercentage >= guild.votingThreshold
                                    ? `✅ Passing (${guild.votingThreshold}% threshold met)`
                                    : `Need ${guild.votingThreshold}% to pass`}
                                </p>
                              </div>

                              {/* Vote Buttons */}
                              {proposal.status === 'active' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleVote(proposal.id, 'for')}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Vote For
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleVote(proposal.id, 'against')}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Vote Against
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {proposals.filter((p) => p.status === 'active').length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No active proposals
                      </p>
                    )}
                  </div>
                ) : (
                  // Non-members: Show join CTA
                  <div className="text-center py-12">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold mb-2">Members Only</h3>
                    <Badge className="mb-4">
                      {proposals.filter((p) => p.status === 'active').length} Active Proposals
                    </Badge>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Guild members are currently voting on important decisions. Join to see details
                      and participate in governance.
                    </p>
                    <Button size="lg" onClick={handleJoinGuild}>
                      Join Guild - ${guild.subscriptionPrice}/{guild.interval}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                {!isMember && (
                  <CardDescription>
                    Transaction summaries - join to see wallet addresses
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {tx.type === 'subscription' ? '💳' : '🎯'}
                        </div>
                        <div>
                          <p className="font-medium">
                            {tx.type === 'subscription' ? 'Subscription Payment' : 'Proposal Executed'}
                          </p>
                          {isMember ? (
                            <p className="text-xs text-muted-foreground">
                              {formatAddress(tx.from)} → {formatAddress(tx.to)}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${tx.amount}</p>
                        {isMember && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                {isMember ? 'All Proposals' : 'Executed Proposals'}
              </h2>
              {isMember && (
                <Button onClick={handleCreateProposal} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Create Proposal
                </Button>
              )}
            </div>

            {!isMember && proposals.filter((p) => p.status === 'active').length > 0 && (
              <Card className="glass border-2 border-primary/20 bg-primary/5">
                <CardContent className="p-8 text-center">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">
                    {proposals.filter((p) => p.status === 'active').length} Active Proposals
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Guild members are currently voting on these proposals. Join to see details and
                    participate in governance.
                  </p>
                  <Button size="lg" onClick={handleJoinGuild}>
                    Join Guild - ${guild.subscriptionPrice}/{guild.interval}
                  </Button>
                </CardContent>
              </Card>
            )}

            {proposals
              .filter((proposal) => isMember || proposal.status === 'executed')
              .map((proposal) => {
                const approvalPercentage = (proposal.votesFor / proposal.totalVotingPower) * 100;
                return (
                  <Card key={proposal.id} className="glass">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{proposal.title}</CardTitle>
                          {isMember && <CardDescription>{proposal.description}</CardDescription>}
                        </div>
                        {getStatusBadge(proposal.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <p className="font-semibold">${proposal.amount.toLocaleString()}</p>
                        </div>
                        {isMember && (
                          <div>
                            <span className="text-muted-foreground">Proposer:</span>
                            <p className="font-mono text-xs">{formatAddress(proposal.proposer)}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <p>{new Date(proposal.createdAt).toLocaleDateString()}</p>
                        </div>
                        {proposal.status === 'active' && (
                          <div>
                            <span className="text-muted-foreground">Deadline:</span>
                            <p>{new Date(proposal.deadline).toLocaleDateString()}</p>
                          </div>
                        )}
                        {proposal.status === 'executed' && proposal.executedAt && (
                          <div>
                            <span className="text-muted-foreground">Executed:</span>
                            <p>{new Date(proposal.executedAt).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>
                            For: {isMember || proposal.status === 'executed' ? proposal.votesFor : '•••'}
                            {(isMember || proposal.status === 'executed') && ` (${approvalPercentage.toFixed(1)}%)`}
                          </span>
                          <span>
                            Against: {isMember || proposal.status === 'executed' ? proposal.votesAgainst : '•••'}
                          </span>
                        </div>
                        <Progress value={approvalPercentage} className="h-2" />
                      </div>

                      {isMember && proposal.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleVote(proposal.id, 'for')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Vote For
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleVote(proposal.id, 'against')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Vote Against
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

            {!isMember && proposals.filter((p) => p.status === 'executed').length === 0 && (
              <Card className="text-center py-16">
                <CardContent>
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-2xl font-bold mb-2">No Executed Proposals Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    This guild hasn't executed any proposals yet. Join to participate in governance.
                  </p>
                  <Button size="lg" onClick={handleJoinGuild}>
                    Join Guild - ${guild.subscriptionPrice}/{guild.interval}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Guild Members ({guild.memberCount})</CardTitle>
                <CardDescription>Active members and their roles</CardDescription>
              </CardHeader>
              <CardContent>
                {isMember ? (
                  // Members: Show full member directory
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.wallet}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500" />
                          <div>
                            <p className="font-mono text-sm">{formatAddress(member.wallet)}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'admin' ? 'default' : 'outline'}>
                            {member.role === 'admin' && '👑 '}
                            {member.role === 'moderator' && '🛡️ '}
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {member.votingPower} vote{member.votingPower !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                    <p className="text-center text-muted-foreground text-sm py-4">
                      Showing 3 of {guild.memberCount} members
                    </p>
                  </div>
                ) : (
                  // Non-members: Show join CTA
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold mb-2">{guild.memberCount} Active Members</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Join this guild to see the member directory, connect with other members, and
                      collaborate together.
                    </p>
                    <Button size="lg" onClick={handleJoinGuild}>
                      Join Guild - ${guild.subscriptionPrice}/{guild.interval}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treasury Tab */}
          <TabsContent value="treasury" className="space-y-6">
            {/* Balance Card */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Treasury Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-5xl font-bold text-primary mb-2">
                    ${guild.treasuryBalance.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground">Available for proposals</p>
                </div>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                {!isMember && (
                  <CardDescription>
                    Join guild to see full transaction details including wallet addresses
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">
                          {tx.type === 'subscription' ? '💳' : tx.type === 'proposal_execution' ? '🎯' : '↩️'}
                        </div>
                        <div>
                          <p className="font-medium capitalize">
                            {tx.type.replace('_', ' ')}
                          </p>
                          {isMember ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                {formatAddress(tx.from)} → {formatAddress(tx.to)}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {formatAddress(tx.txHash)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Transaction details hidden
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          {tx.type === 'subscription' ? '+' : '-'}${tx.amount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {!isMember && (
                  <div className="mt-6 text-center">
                    <Button onClick={handleJoinGuild}>
                      Join Guild to See Full Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GuildDetail;
