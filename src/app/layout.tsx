import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/app/NavBar/NavBar';
import { SessionProvider } from '@/lib/providers/SessionProvider';
import { validateRequest } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/providers/ThemeProvider';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Sidebar from '@/components/app/Sidebar/Sidebar';
import { roomService } from '@/lib/services/livekit';
import { Room } from 'livekit-server-sdk';

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
  roomService.listRooms().then((rooms: Room[]) => {
    console.log('existing rooms', rooms);
  });
  return (
    <html lang="en">
      <body className="flex flex-col h-screen">
        <SessionProvider value={sessionData}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SidebarProvider>
              <Navbar />
              <div className="flex flex-1 pt-16"> {/* pt-16 for navbar height */}
                <Sidebar className='pt-16' />
                <main className="flex-1 overflow-auto">
                  {children}
                </main>
              </div>
              <Toaster />
            </SidebarProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}