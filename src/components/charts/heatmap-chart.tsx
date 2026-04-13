"use client";

interface HeatmapDataPoint {
  day_of_week: number;
  hour_of_day: number;
  avg_spread: number;
  sample_count: number;
}

interface HeatmapChartProps {
  data: HeatmapDataPoint[];
  fiat?: string;
  granularity?: string;
}

import { useState } from "react";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;

const pad2 = (n: number) => n.toString().padStart(2, "0");

const HOUR_BUCKETS: Record<string, { count: number; label: (i: number) => string; tooltipLabel: (i: number) => string }> = {
  "15min": {
    count: 96,
    label: (i) => (i % 4 === 0 ? `${i / 4}h` : ""),
    tooltipLabel: (i) => {
      const h = Math.floor(i / 4);
      const m = (i % 4) * 15;
      const endTotal = h * 60 + m + 15;
      const eh = Math.floor(endTotal / 60) % 24;
      const em = endTotal % 60;
      return `${pad2(h)}:${pad2(m)} - ${pad2(eh)}:${pad2(em)}`;
    },
  },
  "1h": {
    count: 24,
    label: (i) => `${i}h`,
    tooltipLabel: (i) => `${i}h`,
  },
  "4h": {
    count: 6,
    label: (i) => `${i * 4}h-${i * 4 + 4}h`,
    tooltipLabel: (i) => `${i * 4}h à ${i * 4 + 4}h`,
  },
  "1D": {
    count: 1,
    label: () => "Jour",
    tooltipLabel: () => "sur la journée",
  },
  "1W": {
    count: 1,
    label: () => "Jour",
    tooltipLabel: () => "sur la journée",
  },
};

const TooltipBox = ({ point, day, hourLabel, fiat, placement }: { point?: HeatmapDataPoint; day: string; hourLabel: string; fiat: string; placement: "above" | "below" }) => {
  if (!point) return null;
  const positionClass = placement === "above"
    ? "-translate-y-full -translate-x-1/2 mt-[-10px]"
    : "-translate-x-1/2 mt-[10px]";
  return (
    <div className={`absolute z-50 bg-card/95 border border-border p-3 rounded shadow-xl backdrop-blur-sm pointer-events-none min-w-[150px] ${positionClass}`}>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/50 pb-1">
        {day} · {hourLabel}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-medium text-white/80">Spread Moyen :</span>
          <span className="text-[11px] font-mono font-bold text-primary">
            {Number(point.avg_spread).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {fiat}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-medium text-white/80">Échantillons :</span>
          <span className="text-[11px] font-mono font-bold text-white/60">
            {point.sample_count}
          </span>
        </div>
      </div>
    </div>
  );
};

export function HeatmapChart({ data, fiat = "RWF", granularity = "hour" }: HeatmapChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; hourLabel: string; point: HeatmapDataPoint | undefined; x: number; y: number; placement: "above" | "below" } | null>(null);

  const bucket = HOUR_BUCKETS[granularity] ?? HOUR_BUCKETS["1h"];

  const maxSpread = Math.max(...data.map((d) => Number(d.avg_spread)), 1);
  const minSpread = Math.min(...data.map((d) => Number(d.avg_spread)), 0);

  const getColor = (spread: number) => {
    const ratio = (Number(spread) - minSpread) / (maxSpread - minSpread || 1);
    // Use professional trading colors (Red to Green transition)
    if (ratio > 0.8) return "bg-[#2ebd85]";
    if (ratio > 0.6) return "bg-[#2ebd85]/70";
    if (ratio > 0.4) return "bg-primary/60";
    if (ratio > 0.2) return "bg-destructive/50";
    return "bg-destructive/80";
  };

  const lookup = new Map<string, HeatmapDataPoint>();
  for (const d of data) {
    lookup.set(`${d.day_of_week}-${d.hour_of_day}`, d);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto relative">
        <div className={`${bucket.count >= 96 ? "min-w-[1600px]" : bucket.count >= 12 ? "min-w-[800px]" : ""} p-2`}>
          {/* Header row */}
          <div className="flex gap-1 mb-2">
            <div className="w-12 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter" />
            {Array.from({ length: bucket.count }, (_, h) => (
              <div key={h} className="flex-1 text-center text-[9px] font-bold text-muted-foreground/50">
                {bucket.label(h)}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex gap-1 mb-1 items-center">
              <div className="w-12 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                {day}
              </div>
              {Array.from({ length: bucket.count }, (_, h) => {
                const point = lookup.get(`${dayIdx}-${h}`);
                const hourLabel = bucket.tooltipLabel(h);
                return (
                  <div
                    key={h}
                    className={`flex-1 ${bucket.count >= 12 ? "aspect-square" : "h-8"} rounded-[1px] transition-all duration-200 relative ${
                      point ? getColor(point.avg_spread) : "bg-white/[0.03]"
                    } hover:scale-110 hover:z-10 hover:shadow-lg cursor-crosshair`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const placement: "above" | "below" = rect.top < 160 ? "below" : "above";
                      setHoveredPoint({
                        day,
                        hourLabel,
                        point,
                        x: rect.left + rect.width / 2,
                        y: placement === "above" ? rect.top : rect.bottom,
                        placement,
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Floating Tooltip Component */}
        {hoveredPoint && (
          <div
            className="fixed z-[100] pointer-events-none"
            style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
          >
            <TooltipBox point={hoveredPoint.point} day={hoveredPoint.day} hourLabel={hoveredPoint.hourLabel} fiat={fiat} placement={hoveredPoint.placement} />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-2 py-3 border-t border-border/30 bg-card/10 rounded-b">
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Légende :</span>
           <div className="flex items-center gap-2 text-[9px] font-medium text-muted-foreground uppercase">
              <span>Moins Profitable</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-[1px] bg-destructive/80" />
                <div className="w-3 h-3 rounded-[1px] bg-destructive/50" />
                <div className="w-3 h-3 rounded-[1px] bg-primary/60" />
                <div className="w-3 h-3 rounded-[1px] bg-[#2ebd85]/70" />
                <div className="w-3 h-3 rounded-[1px] bg-[#2ebd85]" />
              </div>
              <span>Plus Profitable</span>
           </div>
        </div>
        <div className="text-[9px] font-medium text-muted-foreground italic">
           Basé sur le spread moyen historique
        </div>
      </div>
    </div>
  );
}
