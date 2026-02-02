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
  { label: '📡 Live' },
  { label: '🏆 Top' },
];

export function MiniApp() {
  const [activeTab, setActiveTab] = useState(0);
  const [showFeedPopup, setShowFeedPopup] = useState(false);
  const [hideFloatingIcon, setHideFloatingIcon] = useState(false);

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

      {/* Feed Trending Popup */}
      {showFeedPopup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFeedPopup(false)}
          />

          {/* Popup Content */}
          <div className="relative w-full max-h-[85vh] bg-gray-900 rounded-t-3xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <img
                  src="/floating-book-icon.png"
                  alt="Feed"
                  className="w-8 h-8"
                />
                <h2 className="text-lg font-bold text-amber-400">Feed Trending</h2>
              </div>
              <button
                onClick={() => setShowFeedPopup(false)}
                className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Feed Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-4">
              <FeedTab />
            </div>
          </div>
        </div>
      )}

      {/* Floating Book Icon - Open Feed Popup */}
      {!showFeedPopup && !hideFloatingIcon && (
        <div className="fixed bottom-24 right-4 z-40">
          {/* Close button */}
          <button
            onClick={() => setHideFloatingIcon(true)}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-colors text-xs z-10"
          >
            ✕
          </button>
          {/* Book icon */}
          <button
            onClick={() => setShowFeedPopup(true)}
            className="w-14 h-14 rounded-full shadow-lg shadow-amber-500/30 hover:scale-110 transition-transform animate-bounce"
            style={{ animationDuration: '2s' }}
          >
            <img
              src="/floating-book-icon.png"
              alt="Feed Trending"
              className="w-full h-full"
            />
          </button>
        </div>
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
