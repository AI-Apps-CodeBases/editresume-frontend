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
  webpack: (config, { webpack, isServer }) => {
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
    
    // Fix Firebase postinstall.mjs import issue
    // Replace the relative import of postinstall.mjs with postinstall.js
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /\.\/postinstall\.mjs$/,
        (resource) => {
          // Check if this is coming from @firebase/util
          if (resource.context && resource.context.includes('@firebase/util')) {
            resource.request = resource.request.replace('postinstall.mjs', 'postinstall.js')
          }
        }
      )
    )
    
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
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  async redirects() {
    const isStaging = process.env.VERCEL_ENV === 'preview' || 
                      process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
    
    const destination = isStaging 
      ? 'https://staging.editresume.io/:path*'
      : 'https://www.editresume.io/:path*';

    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'editcv.com',
          },
        ],
        destination,
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.editcv.com',
          },
        ],
        destination,
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'editcv.io',
          },
        ],
        destination,
        permanent: true,
      },
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.editcv.io',
          },
        ],
        destination,
        permanent: true,
      },
    ]
  },
};
export default nextConfig;

