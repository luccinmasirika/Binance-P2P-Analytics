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
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/traders", label: "Traders", icon: Users },
  { href: "/simulator", label: "Simulateur", icon: Activity },
  { href: "/alerts", label: "Alertes", icon: Bell },
  { href: "/countries", label: "Pays", icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="h-14 flex items-center px-6 gap-3 border-b border-border">
        <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight text-white uppercase italic">Quant-Core</span>
      </div>

      <div className="flex-1 px-3 py-6 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-muted-foreground mb-2 px-3 uppercase tracking-[0.2em]">
          Analysis
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-all duration-150 group text-xs font-bold uppercase tracking-wider relative",
                isActive 
                  ? "text-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
              )}
              <Icon className={cn(
                "w-4 h-4 transition-colors", 
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
              )} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-3 mt-auto border-t border-border">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-150 text-xs font-bold uppercase tracking-wider"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
