/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable turbopack for better HMR
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Optimize for development
  devIndicators: {
    position: 'bottom-right',
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Fallback for Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      process: false,
      net: false,
      tls: false,
      child_process: false,
      dns: false,
      http: false,
      https: false,
      zlib: false,
      querystring: false,
      url: false,
      mongodb: false,
      'timers/promises': false,
    };

    // Optimize chunks for better loading
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      };
      
      // Exclude MongoDB from client-side bundling
      config.externals = config.externals || [];
      config.externals.push({
        'mongodb': 'commonjs mongodb',
        'timers/promises': 'commonjs timers/promises'
      });
    }

    // Handle HMR properly
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
  
  // Enable source maps in development
  productionBrowserSourceMaps: false,
  
  // Optimize images
  images: {
    unoptimized: true,
  },
  
  // Handle static files
  trailingSlash: false,
  
  // Enable compression
  compress: true,
}

module.exports = nextConfig