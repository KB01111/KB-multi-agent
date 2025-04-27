/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Removed experimental section to fix warning
  env: {
    NEXT_PUBLIC_BACKEND_URL: 'http://localhost:8124',
    NEXT_PUBLIC_SUPABASE_URL: 'https://hello-prisma.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlbGxvLXByaXNtYSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE0MDI0NzY5LCJleHAiOjIwMjk2MDA3Njl9.BZ1ToMltgCKn2Bbd4_NKBwB9U98qmLuqS8FlPj77Dno',
    NEXT_PUBLIC_COPILOT_CLOUD_API_KEY: 'ck_pub_f00c74d40b2f393d2881a5551dc65768'
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  staticPageGenerationTimeout: 180,
  images: {
    domains: ['localhost'],
  },
  // Fix for critical dependency warnings from OpenTelemetry and Sentry
  webpack: (config, { isServer }) => {
    // Add problematic packages to webpack externals
    if (!isServer) {
      config.externals = [...(config.externals || []), {
        'require-in-the-middle': 'commonjs require-in-the-middle',
        '@opentelemetry/instrumentation': 'commonjs @opentelemetry/instrumentation'
      }];
    }

    // Ignore specific webpack warnings
    config.ignoreWarnings = [
      // Ignore warnings about dynamic requires
      { module: /node_modules\/require-in-the-middle\/index\.js/ },
      { module: /node_modules\/@opentelemetry\/instrumentation\/build\/esm\/platform\/node\/instrumentation\.js/ }
    ];

    return config;
  },
  // Add server external packages to prevent bundling issues
  serverExternalPackages: [
    'require-in-the-middle',
    '@opentelemetry/instrumentation'
  ]
};

module.exports = nextConfig;
