'use client';

import { useState } from 'react';
import { CustomHeader } from '@/features/app/components/custom-header';
import { BackgroundLogo } from '@/features/app/components/background-logo';
import { BottomTabs } from '@/features/app/components/bottom-tabs';
import { CheckInTab } from '@/features/app/components/check-in-tab';
import { LiveClaimsTab } from '@/features/app/components/live-claims-tab';
import { LeaderboardTab } from '@/features/app/components/leaderboard-tab';

const TABS = [
  { label: '🎁 Check-in' },
  { label: '📡 Live' },
  { label: '🏆 Leaderboard' },
];

export function MiniApp() {
  const [activeTab, setActiveTab] = useState(0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <CheckInTab />;
      case 1:
        return <LiveClaimsTab />;
      case 2:
        return <LeaderboardTab />;
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
        <div className="text-center py-4 mt-4">
          <a
            href="https://warpcast.com/feiyuka"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
          >
            Built with 💙 by @feiyuka
          </a>
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      <BottomTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
