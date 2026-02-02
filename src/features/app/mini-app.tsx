'use client';

import { useState } from 'react';
import { CustomHeader } from '@/features/app/components/custom-header';
import { BackgroundLogo } from '@/features/app/components/background-logo';
import { BottomTabs } from '@/features/app/components/bottom-tabs';
import { CheckInTab } from '@/features/app/components/check-in-tab';
import { LiveClaimsTab } from '@/features/app/components/live-claims-tab';
import { LeaderboardTab } from '@/features/app/components/leaderboard-tab';
import { FeedTab } from '@/features/app/components/feed-tab';

const TABS = [
  { label: '🎁 Check-in' },
  { label: '📰 Feed' },
  { label: '📡 Live' },
  { label: '🏆 Top' },
];

export function MiniApp() {
  const [activeTab, setActiveTab] = useState(0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <CheckInTab />;
      case 1:
        return <FeedTab />;
      case 2:
        return <LiveClaimsTab />;
      case 3:
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
        <div className="text-center py-4 mt-4 space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xs text-gray-400">Built with 💙 on</span>
            <a
              href="https://neynar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
            >
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

      {/* Floating Book Icon - Navigate to Feed */}
      {activeTab !== 1 && (
        <button
          onClick={() => setActiveTab(1)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg shadow-amber-500/30 hover:scale-110 transition-transform animate-bounce"
          style={{ animationDuration: '2s' }}
        >
          <img
            src="/floating-book-icon.png"
            alt="Feed Trending"
            className="w-full h-full rounded-full"
          />
        </button>
      )}

      {/* Bottom Tab Navigation */}
      <BottomTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
