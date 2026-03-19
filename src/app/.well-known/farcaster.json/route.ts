// This route is served via rewrite to /api/farcaster-config (see next.config.ts).
// The force-static directive works around a Next.js 16 build trace issue where
// route segments containing ".json" fail to generate .nft.json trace files.
export const dynamic = "force-static";

export async function GET() {
  return Response.json({});
}
