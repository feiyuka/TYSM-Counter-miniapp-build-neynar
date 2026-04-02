'use client';

import { useState } from 'react';
import { useFarcasterUser } from '@/neynar-farcaster-sdk/mini';
import { CustomHeader } from '@/features/app/components/custom-header';
import { BackgroundLogo } from '@/features/app/components/background-logo';
import { BottomTabs } from '@/features/app/components/bottom-tabs';
import { CheckInTab } from '@/features/app/components/check-in-tab';
import { LiveClaimsTab } from '@/features/app/components/live-claims-tab';
import { LeaderboardTab } from '@/features/app/components/leaderboard-tab';
import { AdminTab } from '@/features/app/components/admin-tab';

const CREATOR_FID = Number(process.env.NEXT_PUBLIC_USER_FID ?? 0);

const BASE_TABS = [
  { label: '🎁 Check-in' },
  { label: '📡 Live' },
  { label: '🏆 Top' },
];

const ADMIN_TABS = [
  ...BASE_TABS,
  { label: '👑 Admin' },
];

export function MiniApp() {
  const [activeTab, setActiveTab] = useState(0);
  const { data: farcasterUser } = useFarcasterUser();

  const isCreator = farcasterUser?.fid === CREATOR_FID;
  const tabs = isCreator ? ADMIN_TABS : BASE_TABS;

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <CheckInTab />;
      case 1:
        return <LiveClaimsTab />;
      case 2:
        return <LeaderboardTab />;
      case 3:
        return isCreator ? <AdminTab /> : <CheckInTab />;
      default:
        return <CheckInTab />;
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-black text-white relative overflow-hidden">
      {/* Background Logo with Luxury Effects */}
      <BackgroundLogo />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-2 relative z-10">
        <CustomHeader />
        {renderTabContent()}

        {/* Footer Credit */}
        <div className="text-center py-4 mt-4 space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xs text-gray-400">Built with 💙 on</span>
            <a
              href="https://neynar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://neynar.com/favicon.ico"
                alt="Neynar"
                className="w-3.5 h-3.5"
              />
              Neynar App Studio
            </a>
          </div>
          <a
            href="https://warpcast.com/feiyuka"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            by @feiyuka
          </a>
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      <BottomTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
