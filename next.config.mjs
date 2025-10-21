/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Remove output: 'standalone' for Vercel deployment
  // App Router is now stable in Next.js 14, no experimental flag needed
  typescript: {
    // Ignore TypeScript errors during build for now
    ignoreBuildErrors: false,
  },
  eslint: {
    // Ignore ESLint errors during build for now
    ignoreDuringBuilds: false,
  },
};
export default nextConfig;

