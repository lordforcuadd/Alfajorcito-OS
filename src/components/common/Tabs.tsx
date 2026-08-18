import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = ''
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      onWheel={(e) => {
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }}
      className={`flex items-center gap-1.5 tab-scroll-pc py-1 px-1 bg-[#F5F1EB]/80 rounded-2xl border border-[#EBE5DF]/80 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 whitespace-nowrap cursor-pointer select-none shrink-0 active:scale-[0.98] ${
              isActive
                ? 'bg-white text-[#2B2D42] shadow-xs border border-[#EBE5DF]/80'
                : 'text-[#5A6275] hover:text-[#2B2D42] hover:bg-white/60'
            }`}
          >
            {tab.icon && <span className={`shrink-0 ${isActive ? 'text-[#D98880]' : 'text-[#8D99AE]'}`}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? 'bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/50' : 'bg-[#EBE5DF] text-[#5A6275]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
