"use client";

interface Stats {
  bestBuyPrice: number | null;
  bestSellPrice: number | null;
  spread: number | null;
  buyAdCount: number;
  sellAdCount: number;
  buyVolume: number;
  sellVolume: number;
  forexRate: number | null;
  p2pPremium: number | null;
}

export function StatsCards({ stats, fiat = "RWF" }: { stats: Stats; fiat?: string }) {
  const cards = [
    {
      title: "Best Buy Price",
      value: stats.bestBuyPrice ? `${stats.bestBuyPrice.toFixed(2)} ${fiat}` : "N/A",
      description: `${stats.buyAdCount} Ads`,
      color: "text-emerald-500",
    },
    {
      title: "Best Sell Price",
      value: stats.bestSellPrice ? `${stats.bestSellPrice.toFixed(2)} ${fiat}` : "N/A",
      description: `${stats.sellAdCount} Ads`,
      color: "text-rose-500",
    },
    {
      title: "Current Spread",
      value: stats.spread ? `${stats.spread.toFixed(2)} ${fiat}` : "N/A",
      description: stats.spread ? `${((stats.spread / (stats.bestBuyPrice || 1)) * 100).toFixed(2)}%` : "",
      color: "text-primary",
    },
    {
      title: "Buy Volume",
      value: `${stats.buyVolume.toFixed(0)} USDT`,
      description: "Available to buy",
      color: "text-emerald-500",
    },
    {
      title: "Sell Volume",
      value: `${stats.sellVolume.toFixed(0)} USDT`,
      description: "Available to sell",
      color: "text-rose-500",
    },
    {
      title: `Official USD/${fiat}`,
      value: stats.forexRate ? `${stats.forexRate.toFixed(2)}` : "N/A",
      description: stats.p2pPremium
        ? `P2P Premium: ${stats.p2pPremium > 0 ? "+" : ""}${stats.p2pPremium.toFixed(2)}%`
        : "",
      color: "text-purple-400",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-12 gap-y-4 px-6 py-4 bg-card border border-border rounded-lg shadow-sm">
      {cards.map((card) => (
        <div key={card.title} className="flex flex-col gap-0.5 min-w-[max-content]">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{card.title}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-extrabold font-mono tracking-tighter text-white">
              {card.value}
            </span>
            {card.description && (
              <span className={`text-[10px] font-bold ${card.color}`}>
                {card.description}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
