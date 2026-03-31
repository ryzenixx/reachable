"use client";

import { cn } from "@/lib/utils";
import type { SettingsTab, SettingsTabDefinition } from "./types";

type SettingsTabsProps = {
  activeTab: SettingsTab;
  tabs: SettingsTabDefinition[];
  onChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ activeTab, tabs, onChange }: SettingsTabsProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 pb-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === tab.key
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-500 hover:text-neutral-700",
          )}
          onClick={() => onChange(tab.key)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
