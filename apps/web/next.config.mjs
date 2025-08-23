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
      }
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
  async rewrites() {
    return [
      {
        source: '/api/stream/chat/:path*',
        destination: `http://${process.env.NODE_ENV === 'production' ? 'chat' : 'localhost'}:8000/:path*`,
      },
    ];
  },
};

export default nextConfig;
