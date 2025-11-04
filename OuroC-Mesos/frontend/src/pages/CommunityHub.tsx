import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Star, Users, Calendar } from 'lucide-react';

interface CommunityContent {
  id: string;
  title: string;
  creator: string;
  creatorWallet: string;
  price: number;
  rating: number;
  subscribers: number;
  thumbnail: string;
  category: string;
  interval: 'weekly' | 'monthly' | 'quarterly';
  description: string;
}

const CommunityHub = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState(50);

  // Mock data for demonstration
  const allContent: CommunityContent[] = [
    {
      id: 'content_1',
      title: 'Advanced React Patterns',
      creator: 'John Doe',
      creatorWallet: '9BVTpkYk4FvZ5dMPF6H4SXdxYnpZtvdCJqG7TYjjkzHQ',
      price: 20,
      rating: 4.8,
      subscribers: 45,
      thumbnail: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=React+Patterns',
      category: 'Programming',
      interval: 'monthly',
      description: 'Master advanced React patterns including render props, HOCs, and custom hooks.',
    },
    {
      id: 'content_2',
      title: 'Figma Design Mastery',
      creator: 'Sarah Chen',
      creatorWallet: '8xK5J2vN3mP9rT4qW6hL1sF7dA2cE5yU9oI3bV8nM7k',
      price: 15,
      rating: 4.9,
      subscribers: 102,
      thumbnail: 'https://via.placeholder.com/400x300/ec4899/ffffff?text=Figma+Design',
      category: 'Design',
      interval: 'monthly',
      description: 'Learn professional UI/UX design with Figma from scratch to advanced.',
    },
    {
      id: 'content_3',
      title: 'Yoga for Beginners',
      creator: 'Maya Patel',
      creatorWallet: '7zM4N2xQ5pR8tY6wK9jH3sG1fD4cE7vU2oL5bN8mK3j',
      price: 12,
      rating: 4.7,
      subscribers: 78,
      thumbnail: 'https://via.placeholder.com/400x300/10b981/ffffff?text=Yoga+Basics',
      category: 'Fitness',
      interval: 'monthly',
      description: 'Daily yoga routines and meditation practices for wellness and flexibility.',
    },
    {
      id: 'content_4',
      title: 'Piano Lessons',
      creator: 'David Miller',
      creatorWallet: '6yL3M1xP4oQ7sW5vJ8iG2rF9dB3cD6tU1nK4aN7lJ2h',
      price: 25,
      rating: 4.9,
      subscribers: 34,
      thumbnail: 'https://via.placeholder.com/400x300/8b5cf6/ffffff?text=Piano+Lessons',
      category: 'Music',
      interval: 'monthly',
      description: 'Learn piano from beginner to intermediate with weekly video lessons.',
    },
    {
      id: 'content_5',
      title: 'Python for Data Science',
      creator: 'Alex Kumar',
      creatorWallet: '5xK2L9wO3nP6qS4tV7jH1rE8cB2dC5sU9mI3aN6kJ1g',
      price: 30,
      rating: 4.8,
      subscribers: 89,
      thumbnail: 'https://via.placeholder.com/400x300/f59e0b/ffffff?text=Python+Data',
      category: 'Programming',
      interval: 'monthly',
      description: 'Master Python for data analysis, visualization, and machine learning.',
    },
    {
      id: 'content_6',
      title: 'Spanish Conversation',
      creator: 'Carlos Rodriguez',
      creatorWallet: '4wJ1K8vN2mO5pR3qT6iG9rD7aB1cC4rU8lH2nM5jI9f',
      price: 18,
      rating: 4.6,
      subscribers: 56,
      thumbnail: 'https://via.placeholder.com/400x300/ef4444/ffffff?text=Spanish+Class',
      category: 'Language',
      interval: 'monthly',
      description: 'Practice conversational Spanish with native speakers in weekly sessions.',
    },
  ];

  const categories = [
    { value: 'all', label: 'All Categories', icon: '🌐' },
    { value: 'Programming', label: 'Programming', icon: '💻' },
    { value: 'Design', label: 'Design', icon: '🎨' },
    { value: 'Music', label: 'Music', icon: '🎵' },
    { value: 'Fitness', label: 'Fitness', icon: '🏋️' },
    { value: 'Language', label: 'Language', icon: '🗣️' },
    { value: 'Business', label: 'Business', icon: '💼' },
    { value: 'Art', label: 'Art', icon: '🖼️' },
  ];

  const [filteredContent, setFilteredContent] = useState<CommunityContent[]>(allContent);

  useEffect(() => {
    let filtered = allContent;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(content => content.category === selectedCategory);
    }

    // Price filter
    filtered = filtered.filter(content => content.price <= maxPrice);

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(content =>
        content.title.toLowerCase().includes(query) ||
        content.creator.toLowerCase().includes(query) ||
        content.description.toLowerCase().includes(query) ||
        content.category.toLowerCase().includes(query)
      );
    }

    setFilteredContent(filtered);
  }, [selectedCategory, maxPrice, searchQuery]);

  const handleSubscribe = (contentId: string) => {
    alert(`Subscription flow for ${contentId} - Coming soon!`);
    // TODO: Integrate with existing subscription flow
  };

  const totalSubscribers = allContent.reduce((sum, c) => sum + c.subscribers, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-5xl font-bold mb-4">🌟 Community Hub</h1>
          <p className="text-xl mb-8 opacity-95">Learn from peers, share your knowledge, grow together</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              Browse Content
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => navigate('/profile?tab=earn')}
            >
              Share Your Skills
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="container mx-auto max-w-6xl px-4 -mt-8 relative z-10">
        <div className="bg-card rounded-lg shadow-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for courses, creators, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-6 text-lg"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Category Filter */}
            <Card>
              <CardHeader>
                <CardTitle>Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.value
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Price Range */}
            <Card>
              <CardHeader>
                <CardTitle>Price Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>$0</span>
                    <span>${maxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground text-center">Monthly subscription</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">{allContent.length}</div>
                  <div className="text-sm text-muted-foreground">Available Content</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">{totalSubscribers}</div>
                  <div className="text-sm text-muted-foreground">Active Learners</div>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Content Grid */}
          <main className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {filteredContent.length} {filteredContent.length === 1 ? 'Course' : 'Courses'}
                {searchQuery && ` matching "${searchQuery}"`}
              </h2>
            </div>

            {filteredContent.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <div className="text-6xl mb-4">😕</div>
                  <h3 className="text-2xl font-bold mb-2">No courses found</h3>
                  <p className="text-muted-foreground mb-6">Try adjusting your filters or search query</p>
                  <Button
                    onClick={() => {
                      setSelectedCategory('all');
                      setMaxPrice(50);
                      setSearchQuery('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredContent.map(content => (
                  <Card key={content.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      <img
                        src={content.thumbnail}
                        alt={content.title}
                        className="w-full h-48 object-cover"
                      />
                      <Badge className="absolute top-3 right-3 bg-white text-purple-600">
                        {content.category}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{content.title}</CardTitle>
                      <CardDescription>by {content.creator}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {content.description}
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {content.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {content.subscribers}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {content.interval}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      <div>
                        <span className="text-2xl font-bold text-primary">${content.price}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                      <Button
                        onClick={() => handleSubscribe(content.id)}
                        disabled={!publicKey}
                      >
                        {publicKey ? 'Subscribe' : 'Connect Wallet'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CommunityHub;
