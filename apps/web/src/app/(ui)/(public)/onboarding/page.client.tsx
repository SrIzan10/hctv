'use client';

import { UniversalForm } from '@/components/app/UniversalForm/UniversalForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { onboard } from '@/lib/form/actions';
import { useSession } from '@/lib/providers/SessionProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Tv, Heart, MessageSquare } from 'lucide-react';
import Image from 'next/image';

export default function OnboardingClient() {
  const { user } = useSession();
  
  return (
    <div className="min-h-[93vh] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* welcome header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-primary/20">
                <AvatarImage src={user?.pfpUrl} alt={`@${user?.id}`} />
                <AvatarFallback className="text-2xl font-bold">
                  {user?.id?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to hackclub.tv!
            </h1>
            <p className="text-lg text-muted-foreground flex gap-2 justify-center">
              Let&apos;s get you set up <Image src="https://emoji.slack-edge.com/T0266FRGM/blahaj-heart/db9adf8229e9a4fb.png" alt=":blahaj-heart:" width={24} height={24} />
            </p>
          </div>
        </div>

        {/* explanation */}
        <Card className="border-2 border-primary/10 bg-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-primary" />
              Why do you need a personal channel?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Tv className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Stream content</h3>
                  <p className="text-xs text-muted-foreground">
                    Share your coding sessions and projects!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Chat with others</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect with other Hack Clubbers and grow your audience
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Follow hackclubbers</h3>
                  <p className="text-xs text-muted-foreground">
                    Stay updated with your favorite creators and streams
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-muted">
              <p className="text-sm text-muted-foreground">
                <strong>Your personal channel</strong> is your home base on hctv. 
                It&apos;s where your profile, streams, and content will live. You can always create 
                additional channels later for different types of content!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* form */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Choose Your Channel Username</CardTitle>
            <CardDescription>
              This will be your unique identifier on hctv. Choose something memorable!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UniversalForm
              fields={[
                { name: 'userId', label: 'User ID', type: 'hidden', value: user?.id },
                { 
                  name: 'username', 
                  label: 'Channel Username', 
                  type: 'text',
                  placeholder: 'e.g., yourname or yourname-codes',
                  maxChars: 20,
                  inputFilter: /[^a-z0-9_-]/g,
                },
              ]}
              schemaName="onboard"
              action={onboard}
              onActionComplete={() => {
                window.location.href = '/';
              }}
            />
            <div className="mt-4 p-3 bg-muted/30 rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Username rules:</strong> Only lowercase letters (a-z), numbers (0-9), 
                underscores (_), and dashes (-) are allowed. Up to 20 characters. Must be unique across the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}