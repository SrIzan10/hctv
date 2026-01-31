import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Users, MessageCircle, Code, Zap, Heart } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40 xl:py-48 overflow-hidden">
          <div className="absolute inset-0"></div>
          <div className="container px-4 md:px-6 relative">
            <div className="flex flex-col items-center space-y-8 text-center">              
              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-primary">
                  hackclub.tv
                </h1>
                <p className="mx-auto max-w-[600px] text-lg text-muted-foreground md:text-xl">
                  The streaming website for Hack Clubbers, by Hack Clubbers.
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
      </main>
    </>
  );
}