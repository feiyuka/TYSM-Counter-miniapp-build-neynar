import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is run separately; skip the memory-intensive tsc pass during build
    ignoreBuildErrors: true,
  },
  // Expose VERCEL_PROJECT_PRODUCTION_URL to client-side code
  env: {
    NEXT_PUBLIC_VERCEL_PRODUCTION_URL:
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
  },
  // Rewrite /.well-known/farcaster.json to /api/farcaster-config to avoid a
  // Next.js 16 build trace bug where route segments with ".json" in the name
  // fail to generate .nft.json files during "Collecting build traces".
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/.well-known/farcaster.json",
          destination: "/api/farcaster-config",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  allowedDevOrigins: [
    "*.ngrok.app",
    "*.neynar.com",
    "*.neynar.app",
    "*.studio.neynar.com",
    "*.dev-studio.neynar.com",
    "*.nip.io",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
    ],
  },
  devIndicators: false,
  reactCompiler: true,
  webpack: (config) => {
    // Stub out missing optional dependencies that are pulled in transitively
    // by wagmi connectors (metamask-sdk, walletconnect/pino) but are not
    // available in the web build. Without these aliases webpack creates error
    // module factories that throw at prerender time.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },
  // Empty turbopack config silences the Next.js 16 warning about having a
  // webpack config without a turbopack config. Turbopack is the default dev
  // bundler in Next.js 16; the webpack config only runs during `next build`.
  turbopack: {
    root: import.meta.dirname,},
};

export default nextConfig;
