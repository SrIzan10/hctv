/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'picsum.photos',
      },
      {
        hostname: 'secure.gravatar.com',
      }
    ]
  },
  env: {
    LIVE_SERVER_URL: process.env.NODE_ENV === 'production' ? 'https://backend.hctv.srizan.dev' : 'http://localhost:8888',
  },
  reactStrictMode: false,
};

export default nextConfig;
