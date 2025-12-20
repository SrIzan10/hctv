import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  const publicEnv = Object.keys(process.env).reduce((acc, key) => {
    if (key.startsWith('NEXT_PUBLIC_')) {
      acc[key] = process.env[key];
    }
    return acc;
  }, {} as Record<string, string | undefined>);

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify(publicEnv)}`,
          }}
        />
      </head>
      <NuqsAdapter>
        <body>
          <main>{children}</main>
        </body>
      </NuqsAdapter>
    </html>
  );
}
