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
};

export default nextConfig;
