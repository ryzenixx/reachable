"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartNoAxesCombined,
  CircleGauge,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  User,
  Wrench,
} from "lucide-react";
import { OrganizationAvatar } from "@/components/app/organization-avatar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

type DashboardNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/services", label: "Services", icon: CircleGauge },
  { href: "/dashboard/monitors", label: "Monitors", icon: ChartNoAxesCombined },
  { href: "/dashboard/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/dashboard/maintenances", label: "Maintenances", icon: Wrench },
  { href: "/dashboard/subscribers", label: "Subscribers", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
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

  function isNavItemActive(href: string): boolean {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <OrganizationAvatar
            className="h-8 w-8"
            organization={{
              name: organizationName,
              logo_url: organizationLogoUrl,
            }}
          />
          <div>
            <p className="text-sm font-semibold">{organizationName}</p>
            <p className="text-xs text-muted-foreground">Reachable</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted",
              isNavItemActive(href) && "bg-muted text-foreground",
            )}
            href={href}
            onClick={onNavigate}
          >
            <Icon className="size-4" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-md border p-2">
          <div className="flex items-center justify-between gap-2">
            <Avatar>
              <AvatarFallback>
                <User className="size-3" />
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{organizationName}</p>
            </div>
            <Button
              aria-label={isLoggingOut ? "Signing out" : "Log out"}
              className="size-8 shrink-0 p-0"
              disabled={isLoggingOut}
              onClick={() => {
                onNavigate?.();
                onLogout?.();
              }}
              variant="ghost"
            >
              <LogOut className="size-3.5" />
              <span className="sr-only">{isLoggingOut ? "Signing out" : "Log out"}</span>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
