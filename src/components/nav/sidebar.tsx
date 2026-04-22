"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  Bell,
  Globe,
  Settings,
  Bot,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/traders", label: "Traders", icon: Users },
  { href: "/simulator", label: "Simulateur", icon: Activity },
  { href: "/opportunities", label: "Opportunités", icon: TrendingUp },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/countries", label: "Pays", icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0" aria-label="Navigation principale">
      <div className="h-14 flex items-center px-6 gap-3 border-b border-border">
        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center" aria-hidden="true">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight text-white uppercase italic">Quant-Core</span>
      </div>

      <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-muted-foreground mb-2 px-3 uppercase tracking-[0.2em]">
          Analytique
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-all duration-150 group text-xs font-bold uppercase tracking-wider relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset rounded",
                isActive 
                  ? "text-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" aria-hidden="true" />
              )}
              <Icon className={cn(
                "w-4 h-4 transition-colors", 
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
              )} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 mt-auto border-t border-border focus-within:ring-1 focus-within:ring-primary rounded">
        <Link
          href="/settings"
          aria-current={pathname === "/settings" ? "page" : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-150 text-xs font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset"
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
          Configuration
        </Link>
      </div>
    </aside>
  );
}
