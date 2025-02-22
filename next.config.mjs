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
  transpilePackages: ['livekit-server-sdk']
};

export default nextConfig;
