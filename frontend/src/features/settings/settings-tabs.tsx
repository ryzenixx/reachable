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
    <div className="flex items-center pb-2">
      <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
            onClick={() => onChange(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
