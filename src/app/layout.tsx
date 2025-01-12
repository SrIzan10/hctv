import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/app/NavBar/NavBar";
import { SessionProvider } from "@/lib/providers/SessionProvider";
import { validateRequest } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/lib/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "stack",
  description: "The tech stack for your next(.js) project.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionData = await validateRequest()
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider value={sessionData}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <Navbar />
          {children}
          <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
