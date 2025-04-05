import * as path from 'node:path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE_SERVER_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://backend.hctv.srizan.dev'
    : 'http://localhost:8888';
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
    ],
    minimumCacheTTL: 120,
  },
  env: {
    LIVE_SERVER_URL,
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
