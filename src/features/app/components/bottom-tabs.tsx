'use client';

interface Tab {
  label: string;
}

interface BottomTabsProps {
  tabs: Tab[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export function BottomTabs({ tabs, activeTab, onTabChange }: BottomTabsProps) {
  return (
    <div className="flex gap-2 p-2 mx-2 mb-2 rounded-xl border border-amber-400/50 bg-black/90">
      {tabs.map((tab, index) => (
        <button
          key={index}
          onClick={() => onTabChange(index)}
          className={`flex-1 py-3 text-sm font-bold transition-colors rounded-lg ${
            activeTab === index
              ? 'bg-amber-500/30 text-amber-400'
              : 'text-gray-400 hover:bg-amber-500/10'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
