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
}

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function HeatmapChart({ data, fiat = "RWF" }: HeatmapChartProps) {
  const maxSpread = Math.max(...data.map((d) => Number(d.avg_spread)), 1);
  const minSpread = Math.min(...data.map((d) => Number(d.avg_spread)), 0);

  const getColor = (spread: number) => {
    const ratio = (Number(spread) - minSpread) / (maxSpread - minSpread || 1);
    if (ratio > 0.7) return "bg-green-500";
    if (ratio > 0.4) return "bg-yellow-500";
    if (ratio > 0.2) return "bg-orange-400";
    return "bg-red-400";
  };

  const getOpacity = (spread: number) => {
    const ratio = (Number(spread) - minSpread) / (maxSpread - minSpread || 1);
    return 0.3 + ratio * 0.7;
  };

  // Build a lookup map
  const lookup = new Map<string, HeatmapDataPoint>();
  for (const d of data) {
    lookup.set(`${d.day_of_week}-${d.hour_of_day}`, d);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="flex gap-0.5 mb-1">
          <div className="w-10 text-xs text-muted-foreground" />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">
              {h}h
            </div>
          ))}
        </div>

        {/* Data rows */}
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="flex gap-0.5 mb-0.5">
            <div className="w-10 text-xs text-muted-foreground flex items-center">
              {day}
            </div>
            {Array.from({ length: 24 }, (_, h) => {
              const point = lookup.get(`${dayIdx}-${h}`);
              return (
                <div
                  key={h}
                  className={`flex-1 aspect-square rounded-sm ${
                    point ? getColor(point.avg_spread) : "bg-muted"
                  }`}
                  style={{ opacity: point ? getOpacity(point.avg_spread) : 0.1 }}
                  title={
                    point
                      ? `${day} ${h}h: ${Number(point.avg_spread).toFixed(2)} ${fiat} (${point.sample_count} samples)`
                      : `${day} ${h}h: pas de données`
                  }
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Spread faible</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded-sm bg-red-400 opacity-50" />
            <div className="w-4 h-4 rounded-sm bg-orange-400 opacity-60" />
            <div className="w-4 h-4 rounded-sm bg-yellow-500 opacity-70" />
            <div className="w-4 h-4 rounded-sm bg-green-500 opacity-90" />
          </div>
          <span>Spread élevé (plus profitable)</span>
        </div>
      </div>
    </div>
  );
}
