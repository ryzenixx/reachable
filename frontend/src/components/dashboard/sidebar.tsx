"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  LayoutDashboard,
  LogOut,
  Server,
  Settings,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { OrganizationAvatar } from "@/components/app/organization-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemVersion } from "@/hooks/dashboard/system";
import { cn } from "@/lib/utils";

type DashboardNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: Server },
  { href: "/dashboard/monitors", label: "Monitors", icon: Activity },
  { href: "/dashboard/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/dashboard/maintenances", label: "Maintenances", icon: Wrench },
  { href: "/dashboard/subscribers", label: "Subscribers", icon: Bell },
];

type DashboardSidebarProps = {
  userName: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  onNavigate?: () => void;
  onLogout?: () => void;
  isLoggingOut?: boolean;
};

export function DashboardSidebar({
  userName,
  organizationName,
  organizationLogoUrl,
  onNavigate,
  onLogout,
  isLoggingOut = false,
}: DashboardSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const isDev = process.env.NODE_ENV === "development";
  const systemVersionQuery = useSystemVersion({ enabled: !isDev });

  function isNavItemActive(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-full w-60 flex-col bg-[#fafafa]">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <OrganizationAvatar
            className="h-8 w-8"
            organization={{
              name: organizationName,
              logo_url: organizationLogoUrl,
            }}
          />
          <span className="text-sm font-semibold text-neutral-900 truncate">{organizationName}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 hover:bg-white",
              isNavItemActive(href) && "text-neutral-900 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
            )}
            href={href}
            onClick={onNavigate}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        ))}

        <div className="pt-3">
          <Link
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 hover:bg-white",
              pathname.startsWith("/dashboard/settings") && "text-neutral-900 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
            )}
            href="/dashboard/settings"
            onClick={onNavigate}
          >
            <Settings className="size-4" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {!isDev && (
        <div className="px-5 pb-3">
          {systemVersionQuery.isPending ? (
            <Skeleton className="h-4 w-16" />
          ) : systemVersionQuery.data ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">v{systemVersionQuery.data.current_version}</span>
              {systemVersionQuery.data.update_available && (
                <Badge className="h-4 rounded px-1.5 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-50">
                  Update
                </Badge>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="mx-3 mb-4 mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200/80 text-xs font-semibold text-neutral-600">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{userName}</p>
        </div>
        <button
          type="button"
          aria-label={isLoggingOut ? "Signing out" : "Log out"}
          className="rounded-md p-1.5 text-neutral-400 transition-colors hover:text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
          disabled={isLoggingOut}
          onClick={() => {
            onNavigate?.();
            onLogout?.();
          }}
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
