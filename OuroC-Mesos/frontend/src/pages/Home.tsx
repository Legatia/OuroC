import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Users,
  GraduationCap,
  Shield,
  TrendingUp,
  Zap,
  BookOpen,
  Vote,
  Wallet,
  Globe
} from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-indigo-600/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-4 text-base px-4 py-2">
              🚀 Powered by Solana & ICP Chain Fusion
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Learn, Earn, Govern
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              The decentralized platform for P2P learning and community governance with recurring crypto payments
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/community-hub">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  <GraduationCap className="mr-2 h-6 w-6" />
                  Explore Community Hub
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/guild">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                  <Shield className="mr-2 h-6 w-6" />
                  Browse Guilds
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features - Community Hub & Guilds */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Two Powerful Platforms</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you want to share knowledge or pool resources, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Community Hub Card */}
            <Card className="glass hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-500/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                    <GraduationCap className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Community Hub</CardTitle>
                    <Badge className="mt-1">P2P Learning Marketplace</Badge>
                  </div>
                </div>
                <CardDescription className="text-base">
                  Teach what you know, learn what you want. Direct creator-to-student payments with recurring subscriptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Create & Monetize Courses</p>
                      <p className="text-sm text-muted-foreground">Share your expertise and earn recurring revenue</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Direct Payments to Creators</p>
                      <p className="text-sm text-muted-foreground">98% goes to creator, 2% platform fee</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Instant Crypto Payments</p>
                      <p className="text-sm text-muted-foreground">Weekly, monthly, or quarterly subscriptions</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">Popular Categories:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">💻 Programming</Badge>
                    <Badge variant="outline">🎨 Design</Badge>
                    <Badge variant="outline">🎵 Music</Badge>
                    <Badge variant="outline">🗣️ Languages</Badge>
                    <Badge variant="outline">💼 Business</Badge>
                  </div>
                </div>

                <Link to="/community-hub" className="block">
                  <Button className="w-full mt-4" size="lg">
                    Explore Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Guilds Card */}
            <Card className="glass hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-500/50">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Guilds & DAOs</CardTitle>
                    <Badge className="mt-1">Collective Governance</Badge>
                  </div>
                </div>
                <CardDescription className="text-base">
                  Pool resources, vote on proposals, and govern collectively with multisig treasuries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Wallet className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Multisig Treasuries</p>
                      <p className="text-sm text-muted-foreground">Powered by Squads Protocol for secure fund management</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Vote className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Democratic Voting</p>
                      <p className="text-sm text-muted-foreground">Members vote on proposals with threshold-based execution</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Member Subscriptions</p>
                      <p className="text-sm text-muted-foreground">Recurring payments directly to guild treasury</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">Guild Types:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">💰 Investment</Badge>
                    <Badge variant="outline">🎮 Gaming</Badge>
                    <Badge variant="outline">💻 Developer</Badge>
                    <Badge variant="outline">🌱 Impact</Badge>
                    <Badge variant="outline">🎨 Creative</Badge>
                  </div>
                </div>

                <Link to="/guild" className="block">
                  <Button className="w-full mt-4" size="lg" variant="outline">
                    Browse Guilds
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 glass">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why OuroC-Mesos?</h2>
            <p className="text-xl text-muted-foreground">Decentralized, transparent, and powered by cutting-edge technology</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
                <Zap className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast Payments</h3>
              <p className="text-muted-foreground">
                Powered by Solana for instant, low-cost transactions. Pay in USDC with minimal fees.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Chain Fusion Technology</h3>
              <p className="text-muted-foreground">
                ICP Timer canisters manage recurring payments with threshold ECDSA signing.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 mb-4">
                <Shield className="h-8 w-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Transparent</h3>
              <p className="text-muted-foreground">
                All transactions on-chain. Guild treasuries protected by Squads multisig.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-purple-500 mb-2">8</div>
              <p className="text-muted-foreground">Active Guilds</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-blue-500 mb-2">500+</div>
              <p className="text-muted-foreground">Community Members</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-indigo-500 mb-2">50+</div>
              <p className="text-muted-foreground">Courses Available</p>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-pink-500 mb-2">$350K+</div>
              <p className="text-muted-foreground">Treasury Assets</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="glass border-2 border-primary/20 bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Whether you want to share knowledge, learn new skills, or govern collectively, OuroC-Mesos has you covered.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/profile/create-content">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <GraduationCap className="mr-2 h-5 w-5" />
                    Start Teaching
                  </Button>
                </Link>
                <Link to="/guild/create">
                  <Button size="lg" variant="outline" className="border-2">
                    <Shield className="mr-2 h-5 w-5" />
                    Create a Guild
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Also Available Section */}
      <section className="py-16 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Also Available</h3>
            <p className="text-muted-foreground">Traditional subscriptions and gift cards with crypto payments</p>
          </div>
          <div className="flex justify-center gap-4">
            <Link to="/buy">
              <Button variant="ghost" size="lg">
                Browse Subscriptions & Gift Cards
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
