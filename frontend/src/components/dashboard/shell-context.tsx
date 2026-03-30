"use client";

import { createContext, useContext } from "react";

type DashboardShellContextValue = {
  openMobileSidebar: () => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function DashboardShellProvider({
  value,
  children,
}: {
  value: DashboardShellContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <DashboardShellContext.Provider value={value}>{children}</DashboardShellContext.Provider>;
}

export function useDashboardShell(): DashboardShellContextValue {
  const context = useContext(DashboardShellContext);

  if (!context) {
    return {
      openMobileSidebar: () => undefined,
    };
  }

  return context;
}
