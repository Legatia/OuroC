import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, DollarSign, TrendingUp, Shield, Sparkles, Crown, Zap } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  description: string;
  category: string;
  subscriptionPrice: number;
  interval: 'monthly' | 'quarterly' | 'yearly';
  memberCount: number;
  treasuryBalance: number;
  governanceType: 'multisig' | 'dao';
  membershipType: 'open' | 'approval-required' | 'invite-only';
  logoEmoji: string;
  tags: string[];
  isNew?: boolean;
  isHot?: boolean;
}

const Guild = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { value: 'all', label: 'All Guilds', icon: '🌐' },
    { value: 'Investment', label: 'Investment', icon: '💰' },
    { value: 'Gaming', label: 'Gaming', icon: '🎮' },
    { value: 'Developer', label: 'Developer', icon: '💻' },
    { value: 'Social Impact', label: 'Social Impact', icon: '🌱' },
    { value: 'Creative', label: 'Creative', icon: '🎨' },
    { value: 'Professional', label: 'Professional', icon: '💼' },
  ];

  // Mock guild data
  const allGuilds: Guild[] = [
    {
      id: 'guild_1',
      name: 'Solana Builders Guild',
      description: 'Collective of Solana developers building the future. Pool resources for hackathons, conferences, and open-source contributions.',
      category: 'Developer',
      subscriptionPrice: 50,
      interval: 'monthly',
      memberCount: 127,
      treasuryBalance: 42500,
      governanceType: 'dao',
      membershipType: 'approval-required',
      logoEmoji: '🏗️',
      tags: ['Developers', 'Open Source', 'Hackathons'],
      isHot: true,
    },
    {
      id: 'guild_2',
      name: 'DeFi Alpha Club',
      description: 'Exclusive trading signals, market analysis, and investment opportunities. Members vote on fund allocation for collective investments.',
      category: 'Investment',
      subscriptionPrice: 200,
      interval: 'monthly',
      memberCount: 89,
      treasuryBalance: 125000,
      governanceType: 'multisig',
      membershipType: 'invite-only',
      logoEmoji: '📈',
      tags: ['Trading', 'Alpha', 'DeFi'],
      isHot: true,
    },
    {
      id: 'guild_3',
      name: 'NFT Collectors DAO',
      description: 'Invest in blue-chip NFTs together. Members propose and vote on NFT purchases. Profits shared proportionally.',
      category: 'Investment',
      subscriptionPrice: 100,
      interval: 'monthly',
      memberCount: 156,
      treasuryBalance: 89000,
      governanceType: 'dao',
      membershipType: 'open',
      logoEmoji: '🖼️',
      tags: ['NFTs', 'Collectibles', 'Art'],
      isNew: true,
    },
    {
      id: 'guild_4',
      name: 'Axie Scholars Guild',
      description: 'Gaming guild providing scholarships for play-to-earn games. Members share in guild earnings and vote on asset purchases.',
      category: 'Gaming',
      subscriptionPrice: 20,
      interval: 'monthly',
      memberCount: 342,
      treasuryBalance: 28000,
      governanceType: 'multisig',
      membershipType: 'open',
      logoEmoji: '🎮',
      tags: ['P2E', 'Scholarships', 'Gaming'],
      isHot: true,
    },
    {
      id: 'guild_5',
      name: 'Climate Action Collective',
      description: 'Pool funds to support environmental projects. Vote on which NGOs and initiatives to fund. Track impact transparently.',
      category: 'Social Impact',
      subscriptionPrice: 15,
      interval: 'monthly',
      memberCount: 203,
      treasuryBalance: 15600,
      governanceType: 'dao',
      membershipType: 'open',
      logoEmoji: '🌍',
      tags: ['Environment', 'Impact', 'NGO'],
      isNew: true,
    },
    {
      id: 'guild_6',
      name: 'Indie Game Devs Co-op',
      description: 'Cooperative for independent game developers. Share resources, collaborate on projects, and vote on funding allocation.',
      category: 'Creative',
      subscriptionPrice: 30,
      interval: 'monthly',
      memberCount: 78,
      treasuryBalance: 12400,
      governanceType: 'dao',
      membershipType: 'approval-required',
      logoEmoji: '🕹️',
      tags: ['Indie Games', 'Collaboration', 'Funding'],
    },
    {
      id: 'guild_7',
      name: 'Blockchain Lawyers Network',
      description: 'Professional network of lawyers specializing in blockchain. Share resources, discuss cases, fund legal research.',
      category: 'Professional',
      subscriptionPrice: 150,
      interval: 'quarterly',
      memberCount: 45,
      treasuryBalance: 32000,
      governanceType: 'multisig',
      membershipType: 'approval-required',
      logoEmoji: '⚖️',
      tags: ['Legal', 'Professional', 'Blockchain'],
    },
    {
      id: 'guild_8',
      name: 'Web3 Writers Collective',
      description: 'Guild for crypto content creators. Pool funds for tools, courses, and promotional campaigns. Vote on collaborative projects.',
      category: 'Creative',
      subscriptionPrice: 25,
      interval: 'monthly',
      memberCount: 112,
      treasuryBalance: 8900,
      governanceType: 'dao',
      membershipType: 'open',
      logoEmoji: '✍️',
      tags: ['Writing', 'Content', 'Marketing'],
    },
  ];

  const filteredGuilds = allGuilds.filter((guild) => {
    const matchesCategory = selectedCategory === 'all' || guild.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      guild.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guild.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guild.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleJoinGuild = (guildId: string) => {
    if (!publicKey) {
      alert('Please connect your wallet to join a guild');
      return;
    }
    // TODO: Implement join guild flow
    alert(`Join guild flow for ${guildId} - Coming soon!`);
  };

  const totalMembers = allGuilds.reduce((sum, g) => sum + g.memberCount, 0);
  const totalTreasury = allGuilds.reduce((sum, g) => sum + g.treasuryBalance, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-5xl font-bold mb-4">⚔️ Guilds & DAOs</h1>
          <p className="text-xl mb-8 opacity-95">
            Join communities, pool resources, vote on governance
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Explore Guilds
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => navigate('/guild/create')}
            >
              Create Your Guild
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="container mx-auto max-w-6xl px-4 -mt-8 relative z-10">
        <div className="glass rounded-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{allGuilds.length}</div>
            <div className="text-sm text-muted-foreground">Active Guilds</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{totalMembers.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Guild Members</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">${(totalTreasury / 1000).toFixed(0)}K</div>
            <div className="text-sm text-muted-foreground">Total Treasury</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="container mx-auto max-w-6xl px-4 mt-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            placeholder="Search guilds by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-6 text-lg"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="glass w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-8">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-xs md:text-sm">
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {filteredGuilds.length} {filteredGuilds.length === 1 ? 'Guild' : 'Guilds'}
                {searchQuery && ` matching "${searchQuery}"`}
              </h2>
            </div>

            {filteredGuilds.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-bold mb-2">No guilds found</h3>
                  <p className="text-muted-foreground mb-6">
                    Try adjusting your search or filter
                  </p>
                  <Button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGuilds.map((guild) => (
                  <Card key={guild.id} className="glass overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-5xl">{guild.logoEmoji}</div>
                        <div className="flex flex-col gap-1">
                          {guild.isHot && <Badge className="bg-red-500">🔥 Hot</Badge>}
                          {guild.isNew && <Badge className="bg-green-500">⭐ New</Badge>}
                        </div>
                      </div>
                      <CardTitle className="line-clamp-1">{guild.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {guild.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {guild.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            Members
                          </span>
                          <span className="font-semibold">{guild.memberCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <DollarSign className="w-4 h-4" />
                            Treasury
                          </span>
                          <span className="font-semibold">
                            ${(guild.treasuryBalance / 1000).toFixed(1)}K
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            {guild.governanceType === 'dao' ? (
                              <Zap className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                            Governance
                          </span>
                          <span className="font-semibold capitalize">{guild.governanceType}</span>
                        </div>
                      </div>

                      {/* Membership Type Badge */}
                      <div className="mt-4">
                        {guild.membershipType === 'open' && (
                          <Badge variant="outline" className="w-full justify-center">
                            ✅ Open to Join
                          </Badge>
                        )}
                        {guild.membershipType === 'approval-required' && (
                          <Badge variant="outline" className="w-full justify-center">
                            📝 Approval Required
                          </Badge>
                        )}
                        {guild.membershipType === 'invite-only' && (
                          <Badge variant="outline" className="w-full justify-center">
                            🔒 Invite Only
                          </Badge>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="flex justify-between items-center">
                      <div>
                        <span className="text-2xl font-bold text-primary">
                          ${guild.subscriptionPrice}
                        </span>
                        <span className="text-sm text-muted-foreground">/{guild.interval}</span>
                      </div>
                      <Button
                        onClick={() => navigate(`/guild/${guild.id}`)}
                      >
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <Card className="glass bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <Crown className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-3xl font-bold mb-4">Create Your Own Guild</h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Start a community, pool resources, and govern collectively. Perfect for investment
              clubs, gaming guilds, professional networks, and more.
            </p>
            <Button size="lg" className="gap-2" onClick={() => navigate('/guild/create')}>
              <Sparkles className="w-5 h-5" />
              Launch a Guild
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Guild;
