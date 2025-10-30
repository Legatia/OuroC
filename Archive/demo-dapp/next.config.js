/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  experimental: {
    // Enable experimental features for better monorepo support
    externalDir: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // Disable webpack caching to force fresh builds
    config.cache = false

    // Handle Node.js modules that don't work in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }

    // Force resolution for SDK and React modules
    const path = require('path')
    const demoNodeModules = path.resolve(__dirname, 'node_modules')

    config.resolve.alias = {
      ...config.resolve.alias,
      '@ouroc/sdk': path.resolve(__dirname, '../packages/sdk/dist/index.js'),
      'react': path.join(demoNodeModules, 'react'),
      'react-dom': path.join(demoNodeModules, 'react-dom'),
      'react/jsx-runtime': path.join(demoNodeModules, 'react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(demoNodeModules, 'react/jsx-dev-runtime.js'),
    }

    return config
  },
}

module.exports = nextConfig