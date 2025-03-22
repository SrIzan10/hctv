import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/app/NavBar/NavBar';
import { SessionProvider } from '@/lib/providers/SessionProvider';
import { validateRequest } from '@/lib/auth/validate';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/providers/ThemeProvider';
import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/components/app/Sidebar/Sidebar';
import { cn } from '@/lib/utils';
import EditLivestream from '@/components/app/EditLivestream/EditLivestream';
import { StreamInfoProvider } from '@/lib/providers/StreamInfoProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'hackclub.tv',
  description: "Hack Club's livestreaming platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionData = await validateRequest();
  return (
    <html lang="en">
      <body className={cn('flex flex-col h-screen', inter.className)}>
        <SessionProvider value={sessionData}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <StreamInfoProvider>
                {/* this promise is ugly but i'm lazy to fix the type errors */}
                <Navbar editLivestream={Promise.resolve(<EditLivestream />)} />
                <div className="flex flex-1 pt-16">
                  {/* pt-16 for navbar height */}
                  <Sidebar className="pt-16" />
                  <main className="flex-1 overflow-auto">{children}</main>
                </div>
                <Toaster />
              </StreamInfoProvider>
            </SidebarProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
