import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Users, MessageCircle, Code, Zap, Heart } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 xl:py-48 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center space-y-8 text-center">
              <Badge variant="outline" className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
                <Heart className="w-4 h-4 mr-2" />
                Made with ❤️ by Hack Clubbers
              </Badge>
              
              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  hackclub.tv
                </h1>
                <p className="mx-auto max-w-[600px] text-lg text-muted-foreground md:text-xl">
                  The streaming platform where Hack Clubbers share their coding journeys, workshops, and hackathon adventures with the world.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row">
                <Link href="/login" className="space-x-4">
                  <Button size="lg" className="px-8 py-3 text-lg font-semibold">
                    <Play className="w-5 h-5 mr-2" />
                    Start Streaming
                  </Button>
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg font-semibold">
                  <Users className="w-5 h-5 mr-2" />
                  Watch Streams
                </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 bg-muted/30" id="features">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-8 mb-16">
              <Badge variant="secondary" className="px-4 py-2">
                Platform Features
              </Badge>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Built for creators, by creators
                </h2>
                <p className="max-w-[700px] text-lg text-muted-foreground">
                  Everything you need to connect, create, and grow within the Hack Club community.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Low-Latency Streaming</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Share your coding sessions with ultra-low latency. Your audience stays engaged with real-time interaction.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Real-Time Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Engage with your community through integrated chat. Get instant feedback and build connections.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Community First</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Follow your favorite streamers, discover new creators, and be part of the vibrant Hack Club ecosystem.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-accent/50 rounded-lg flex items-center justify-center mb-4">
                    <Code className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-xl">Code-Focused</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Built specifically for developers. Perfect for coding sessions, tutorials, and technical workshops.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-xl">Easy to Use</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Simple, intuitive interface. Start streaming in minutes, not hours. Focus on what you love: coding.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Open Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Transparent, community-driven, and built in the open. Contribute, customize, and make it yours.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ready to share your journey?
                </h2>
                <p className="max-w-[600px] text-lg text-muted-foreground">
                  Join the community of makers, builders, and dreamers. Start streaming your coding adventures today.
                </p>
              </div>
              <Link href="/login">
                <Button size="lg" className="px-8 py-3 text-lg font-semibold">
                  <Play className="w-5 h-5 mr-2" />
                  Get Started Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}