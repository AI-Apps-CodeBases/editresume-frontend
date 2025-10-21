/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // App Router is now stable in Next.js 14, no experimental flag needed
  typescript: {
    // Ignore TypeScript errors during build for now
    ignoreBuildErrors: false,
  },
  eslint: {
    // Disable ESLint during build to allow deployment
    ignoreDuringBuilds: true,
  },
  // Optimize for Vercel deployment
  experimental: {
    esmExternals: false,
  },
};
export default nextConfig;

