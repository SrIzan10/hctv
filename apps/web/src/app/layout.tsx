import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <NuqsAdapter>
        <body>
          <main>{children}</main>
        </body>
      </NuqsAdapter>
    </html>
  );
}
