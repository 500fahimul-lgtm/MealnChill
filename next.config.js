/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 15
  
  // Optimize for better chunk loading
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    }
    return config
  },
}

module.exports = nextConfig
