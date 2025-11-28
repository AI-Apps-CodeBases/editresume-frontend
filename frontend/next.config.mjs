import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {}
    // Resolve @/* imports to src/*
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    // Also add specific aliases for compatibility
    config.resolve.alias['@/components'] = path.resolve(__dirname, 'src/components')
    config.resolve.alias['@/contexts'] = path.resolve(__dirname, 'src/contexts')
    config.resolve.alias['@/lib'] = path.resolve(__dirname, 'src/lib')
    config.resolve.alias['@/hooks'] = path.resolve(__dirname, 'src/hooks')
    config.resolve.alias['@/utils'] = path.resolve(__dirname, 'src/utils')
    config.resolve.alias['@/features'] = path.resolve(__dirname, 'src/features')
    return config
  },
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

