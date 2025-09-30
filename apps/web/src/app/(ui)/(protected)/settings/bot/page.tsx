import { validateRequest } from '@/lib/auth/validate';
import { prisma } from '@hctv/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Plus, Bot, Calendar, Hash } from 'lucide-react';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function Page() {
  const { user } = await validateRequest();
  if (!user) {
    redirect('/');
  }

  const bots = await prisma.user.findFirst({
    where: { id: user.id },
    select: {
      botAccounts: true,
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bot Accounts</h1>
          <p className="text-muted-foreground">Manage your automated bot accounts</p>
        </div>
        <Link href="/settings/bot/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Bot
          </Button>
        </Link>
      </div>

      <Separator />

      {bots?.botAccounts.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bots.botAccounts.map((bot) => (
            <Link href={`/settings/bot/${bot.slug}`} key={bot.id}>
              <Card key={bot.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Image src={bot.pfpUrl} alt={'Bot Avatar'} width={32} height={32} className="rounded-full" />
                    <CardTitle className="text-lg">{bot.displayName}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>{bot.slug}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(bot.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent className="space-y-4">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <CardTitle>No bot accounts yet</CardTitle>
              <CardDescription className="mt-2">
                Get started by creating your first bot account
              </CardDescription>
            </div>
            <Link href="/settings/bot/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Bot
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
