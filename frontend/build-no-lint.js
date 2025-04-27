const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Ensure NODE_ENV is set to production for the build
process.env.NODE_ENV = 'production';

// Create a temporary next.config.js file without the clientTraceMetadata issue
const tempConfigPath = path.resolve(__dirname, 'next.config.temp.js');
const originalConfigPath = path.resolve(__dirname, 'next.config.ts');

try {
  // Read the original config
  const originalConfig = fs.readFileSync(originalConfigPath, 'utf8');

  // Create a JavaScript version with the fix
  const jsConfig = `
  const { withSentryConfig } = require('@sentry/nextjs');

  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    compiler: {
      styledComponents: true
    },
    transpilePackages: ['@copilotkit/react-ui', '@copilotkit/react-core'],
    output: 'standalone',
    poweredByHeader: false,
    webpack: (config, { isServer }) => {
      if (!isServer) {
        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        };
      }
      return config;
    },
    staticPageGenerationTimeout: 180,
    experimental: {
      // Fix clientTraceMetadata to be an array instead of boolean
      clientTraceMetadata: []
    },
  };

  module.exports = withSentryConfig(nextConfig, {
    org: "kb-konsult-partner-ab",
    project: "kb-agent-canvas-frontend",
    silent: !process.env.CI,
    widenClientFileUpload: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  });
  `;

  // Write the temporary config
  fs.writeFileSync(tempConfigPath, jsConfig);
  console.log('Created temporary Next.js config for build...');

  // Run the build with the temporary config
  console.log('Running build process with ESLint checks disabled...');
  execSync('next build --no-lint --config next.config.temp.js', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname),
    env: { ...process.env, NODE_ENV: 'production' }
  });

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Error running build:', error.message);
  process.exit(1);
} finally {
  // Clean up the temporary config file
  if (fs.existsSync(tempConfigPath)) {
    fs.unlinkSync(tempConfigPath);
    console.log('Removed temporary Next.js config.');
  }
}
