import {withSentryConfig} from '@sentry/nextjs';
import * as path from 'node:path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE_SERVER_URL =
  process.env.NODE_ENV === 'production'
    ? 'http://nginx-rtmp:8888'
    : 'http://localhost:8888';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const { version } = packageJson;
const commit = process.env.commit || execSync('git rev-parse --short HEAD')
  .toString().trim();
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'picsum.photos',
      },
      {
        hostname: 'secure.gravatar.com',
      },
      {
        hostname: 'emoji.slack-edge.com',
      },
      {
        hostname: 'cdn.jsdelivr.net',
        pathname: '/npm/emoji-datasource-twitter@15.1.2/img/twitter/64/*',
      },
      {
        hostname: 'eoceqrx2r7.ufs.sh'
      },
    ],
    minimumCacheTTL: 120,
  },
  env: {
    LIVE_SERVER_URL,
    commit,
    version,
  },
  reactStrictMode: false,
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  serverExternalPackages: ['bullmq'],
  async rewrites() {
    return [
      {
        source: '/api/stream/chat/:path*',
        destination: `http://${process.env.NODE_ENV === 'production' ? 'chat' : 'localhost'}:8000/:path*`,
      },
    ];
  },
  logging: {
    incomingRequests: false,
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "sr-izan",

  project: "hctv",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});