import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';

interface ContentFormData {
  title: string;
  description: string;
  category: string;
  price: string;
  interval: 'weekly' | 'monthly' | 'quarterly';
  thumbnailUrl: string;
}

const CreateContent = () => {
  const navigate = useNavigate();
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    description: '',
    category: '',
    price: '',
    interval: 'monthly',
    thumbnailUrl: '',
  });

  const categories = [
    { value: 'Programming', label: '💻 Programming' },
    { value: 'Design', label: '🎨 Design' },
    { value: 'Music', label: '🎵 Music' },
    { value: 'Fitness', label: '🏋️ Fitness' },
    { value: 'Language', label: '🗣️ Language' },
    { value: 'Business', label: '💼 Business' },
    { value: 'Art', label: '🖼️ Art' },
    { value: 'Cooking', label: '🍳 Cooking' },
    { value: 'Photography', label: '📷 Photography' },
    { value: 'Writing', label: '✍️ Writing' },
  ];

  const handleInputChange = (field: keyof ContentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // TODO: Upload to IPFS or storage service
      // For now, just store the file name
      handleInputChange('thumbnailUrl', file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to create content',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your content',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please enter a description',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: 'Category required',
        description: 'Please select a category',
        variant: 'destructive',
      });
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid price greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (priceNum > 1000) {
      toast({
        title: 'Price too high',
        description: 'Maximum price is $1000 per month',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Integrate with backend
      // 1. Upload thumbnail to IPFS/CDN
      // 2. Create subscription via ICP timer
      // 3. Store content metadata in database

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const contentId = `content_${Date.now()}`;

      console.log('Creating content:', {
        id: contentId,
        ...formData,
        creatorWallet: publicKey.toString(),
        priceUSD: priceNum,
      });

      toast({
        title: 'Content created successfully! 🎉',
        description: 'Your content is now live in the Community Hub',
      });

      // Redirect to profile content tab
      navigate('/profile?tab=content');
    } catch (error) {
      console.error('Error creating content:', error);
      toast({
        title: 'Failed to create content',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/profile?tab=content')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-4xl font-bold mb-2">Create New Content</h1>
          <p className="text-muted-foreground">
            Share your knowledge and earn recurring revenue from the community
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="glass">
            <CardHeader>
              <CardTitle>Content Details</CardTitle>
              <CardDescription>
                Fill in the details about your course or content offering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Advanced React Patterns"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.title.length}/100 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what subscribers will learn or receive..."
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
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1000"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum: $1000
                  </p>
                </div>

                {/* Billing Interval */}
                <div className="space-y-2">
                  <Label htmlFor="interval">Billing Interval *</Label>
                  <Select
                    value={formData.interval}
                    onValueChange={(value) => handleInputChange('interval', value as 'weekly' | 'monthly' | 'quarterly')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail Image</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  {thumbnailPreview ? (
                    <div className="space-y-4">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setThumbnailPreview('');
                          handleInputChange('thumbnailUrl', '');
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <Label
                        htmlFor="thumbnail"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        Click to upload
                      </Label>
                      <p className="text-xs text-muted-foreground mt-2">
                        PNG, JPG or WEBP (max 5MB)
                      </p>
                      <Input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">Preview</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Title:</strong> {formData.title || 'Not set'}
                  </p>
                  <p>
                    <strong>Category:</strong> {formData.category || 'Not set'}
                  </p>
                  <p>
                    <strong>Price:</strong> $
                    {formData.price || '0.00'}/{formData.interval}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/profile?tab=content')}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !publicKey}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Content'
              )}
            </Button>
          </div>

          {!publicKey && (
            <p className="text-center text-sm text-destructive mt-4">
              Please connect your wallet to create content
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateContent;
