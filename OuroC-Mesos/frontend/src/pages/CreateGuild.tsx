import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Shield, Zap, Lock, Users, Key } from 'lucide-react';

interface GuildFormData {
  name: string;
  description: string;
  category: string;
  subscriptionPrice: string;
  interval: 'monthly' | 'quarterly' | 'yearly';
  governanceType: 'multisig' | 'dao';
  membershipType: 'open' | 'approval-required' | 'invite-only';
  votingThreshold: string;
  logoEmoji: string;
  tags: string;
}

const CreateGuild = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<GuildFormData>({
    name: '',
    description: '',
    category: '',
    subscriptionPrice: '',
    interval: 'monthly',
    governanceType: 'dao',
    membershipType: 'open',
    votingThreshold: '60',
    logoEmoji: '',
    tags: '',
  });

  const categories = [
    'Investment',
    'Gaming',
    'Developer',
    'Social Impact',
    'Creative',
    'Professional',
    'Education',
    'Research',
  ];

  const popularEmojis = [
    '🏗️',
    '📈',
    '🎮',
    '🌍',
    '🎨',
    '💼',
    '📚',
    '🔬',
    '⚖️',
    '✍️',
    '🎵',
    '🏋️',
    '🍳',
    '📷',
    '🚀',
    '💎',
  ];

  const handleInputChange = (field: keyof GuildFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast.error('Please connect your wallet to create a guild');
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      toast.error('Guild name is required');
      return;
    }

    if (formData.name.length < 3 || formData.name.length > 50) {
      toast.error('Guild name must be between 3 and 50 characters');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    if (formData.description.length < 20 || formData.description.length > 500) {
      toast.error('Description must be between 20 and 500 characters');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    const price = parseFloat(formData.subscriptionPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid subscription price');
      return;
    }

    if (price > 10000) {
      toast.error('Maximum subscription price is $10,000');
      return;
    }

    const threshold = parseInt(formData.votingThreshold);
    if (isNaN(threshold) || threshold < 1 || threshold > 100) {
      toast.error('Voting threshold must be between 1 and 100');
      return;
    }

    if (!formData.logoEmoji) {
      toast.error('Please select a logo emoji');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement guild creation
      // 1. Create multi-sig treasury wallet (Squads Protocol)
      // 2. Store guild metadata in database
      // 3. Create subscription template in ICP timer
      // 4. Deploy any necessary smart contracts

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const guildId = `guild_${Date.now()}`;

      console.log('Creating guild:', {
        id: guildId,
        ...formData,
        creatorWallet: publicKey.toString(),
        treasuryWallet: 'MultiSigWallet...', // Would be generated
      });

      toast.success('Guild created successfully! 🎉');

      // Redirect to guild detail page
      navigate(`/guild/${guildId}`);
    } catch (error) {
      console.error('Error creating guild:', error);
      toast.error('Failed to create guild. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-8">
            Please connect your wallet to create a guild.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/guild')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Guilds
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Your Guild</h1>
          <p className="text-muted-foreground text-lg">
            Start a community, pool resources, and govern collectively
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Info */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Tell us about your guild</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Guild Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Guild Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Solana Builders Guild"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.name.length}/50 characters
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your guild's purpose, goals, and what members will gain..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={5}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/500 characters
                  </p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Logo Emoji */}
                <div className="space-y-2">
                  <Label>Logo Emoji *</Label>
                  <div className="grid grid-cols-8 gap-2">
                    {popularEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInputChange('logoEmoji', emoji)}
                        className={`text-3xl p-2 rounded-lg border-2 transition-colors hover:bg-muted ${
                          formData.logoEmoji === emoji
                            ? 'border-primary bg-primary/10'
                            : 'border-transparent'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {formData.logoEmoji && (
                    <p className="text-sm text-muted-foreground">
                      Selected: <span className="text-2xl">{formData.logoEmoji}</span>
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="e.g., Developers, Open Source, Hackathons"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add up to 5 tags to help members find your guild
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Settings */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Subscription Settings</CardTitle>
                <CardDescription>How will members pay to join?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price */}
                  <div className="space-y-2">
                    <Label htmlFor="price">Subscription Price (USD) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        max="10000"
                        placeholder="0.00"
                        value={formData.subscriptionPrice}
                        onChange={(e) => handleInputChange('subscriptionPrice', e.target.value)}
                        className="pl-7"
                      />
                    </div>
                  </div>

                  {/* Interval */}
                  <div className="space-y-2">
                    <Label htmlFor="interval">Billing Interval *</Label>
                    <Select
                      value={formData.interval}
                      onValueChange={(value) =>
                        handleInputChange('interval', value as 'monthly' | 'quarterly' | 'yearly')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Governance Settings */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Governance Settings</CardTitle>
                <CardDescription>How will your guild make decisions?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Governance Type */}
                <div className="space-y-3">
                  <Label>Governance Type *</Label>
                  <RadioGroup
                    value={formData.governanceType}
                    onValueChange={(value) =>
                      handleInputChange('governanceType', value as 'multisig' | 'dao')
                    }
                  >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="dao" id="dao" />
                      <div className="flex-1">
                        <Label htmlFor="dao" className="flex items-center gap-2 cursor-pointer">
                          <Zap className="w-5 h-5" />
                          <span className="font-semibold">DAO (Recommended)</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          All members can vote on proposals. One member, one vote. Fully
                          decentralized.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="multisig" id="multisig" />
                      <div className="flex-1">
                        <Label
                          htmlFor="multisig"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Shield className="w-5 h-5" />
                          <span className="font-semibold">Multi-Sig</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Selected signers approve proposals. More control, less decentralized.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Voting Threshold */}
                <div className="space-y-2">
                  <Label htmlFor="threshold">Voting Threshold (%) *</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="60"
                    value={formData.votingThreshold}
                    onChange={(e) => handleInputChange('votingThreshold', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentage of votes needed to pass a proposal (1-100)
                  </p>
                </div>

                {/* Membership Type */}
                <div className="space-y-3">
                  <Label>Membership Type *</Label>
                  <RadioGroup
                    value={formData.membershipType}
                    onValueChange={(value) =>
                      handleInputChange(
                        'membershipType',
                        value as 'open' | 'approval-required' | 'invite-only'
                      )
                    }
                  >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="open" id="open" />
                      <div className="flex-1">
                        <Label htmlFor="open" className="flex items-center gap-2 cursor-pointer">
                          <Users className="w-5 h-5" />
                          <span className="font-semibold">Open</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Anyone can join by paying the subscription fee
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="approval-required" id="approval" />
                      <div className="flex-1">
                        <Label
                          htmlFor="approval"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Key className="w-5 h-5" />
                          <span className="font-semibold">Approval Required</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Members must apply and be approved by admins
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg">
                      <RadioGroupItem value="invite-only" id="invite" />
                      <div className="flex-1">
                        <Label
                          htmlFor="invite"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Lock className="w-5 h-5" />
                          <span className="font-semibold">Invite Only</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Only invited members can join (most exclusive)
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card className="glass bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formData.logoEmoji && (
                  <div className="text-5xl mb-2">{formData.logoEmoji}</div>
                )}
                <p>
                  <strong>Name:</strong> {formData.name || 'Not set'}
                </p>
                <p>
                  <strong>Category:</strong> {formData.category || 'Not set'}
                </p>
                <p>
                  <strong>Price:</strong> ${formData.subscriptionPrice || '0.00'}/
                  {formData.interval}
                </p>
                <p>
                  <strong>Governance:</strong> {formData.governanceType.toUpperCase()}
                </p>
                <p>
                  <strong>Membership:</strong>{' '}
                  {formData.membershipType.replace('-', ' ').toUpperCase()}
                </p>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/guild')}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Guild...
                  </>
                ) : (
                  'Create Guild'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGuild;
