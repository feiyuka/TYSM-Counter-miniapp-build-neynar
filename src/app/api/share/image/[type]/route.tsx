import { NextRequest } from "next/server";
import { publicConfig } from "@/config/public-config";
import {
  getShareImageResponse,
  parseNextRequestSearchParams,
} from "@/neynar-farcaster-sdk/nextjs";

// Cache for 1 hour - query strings create separate cache entries
export const revalidate = 3600;

const { heroImageUrl, imageUrl } = publicConfig;

const showDevWarning = false;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  // Extract query params for personalization
  const searchParams = parseNextRequestSearchParams(request);
  const tysmBalance = searchParams.tysmBalance ?? "0";
  const streakDay = searchParams.streakDay ?? "1";
  const streakWeek = searchParams.streakWeek ?? "1";
  const tier = searchParams.tier ?? "No Tier";
  const username = searchParams.username ?? "Player";

  return getShareImageResponse(
    { type, heroImageUrl, imageUrl, showDevWarning },
    // Overlay JSX - Glass card with streak stats and tier badge
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        width: "100%",
        height: "100%",
        padding: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderRadius: 20,
          padding: "28px 36px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Username */}
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          @{username}
        </div>

        {/* TYSM Balance */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: "bold",
              color: "#fbbf24",
            }}
          >
            {parseInt(tysmBalance).toLocaleString()} TYSM
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            Total Balance
          </div>
        </div>

        {/* Streak Info */}
        <div
          style={{
            display: "flex",
            gap: 24,
            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
            paddingTop: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.6)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Week
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                fontWeight: "bold",
                color: "#60a5fa",
              }}
            >
              {streakWeek}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 1,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.6)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Day
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                fontWeight: "bold",
                color: "#60a5fa",
              }}
            >
              {streakDay}/7
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 1,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.6)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Tier
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: "bold",
                color: "#fbbf24",
              }}
            >
              {tier}
            </div>
          </div>
        </div>
      </div>
    </div>,
  );
}
