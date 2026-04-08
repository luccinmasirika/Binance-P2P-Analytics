"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Filters } from "@/components/dashboard/filters";
import { AdsTable } from "@/components/dashboard/ads-table";
import { PriceChart } from "@/components/charts/price-chart";
import { SpreadChart } from "@/components/charts/spread-chart";
import { VolumeChart } from "@/components/charts/volume-chart";
import { DepthChart } from "@/components/charts/depth-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { RefreshCw, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [fiat, setFiat] = useState("RWF");
  const [period, setPeriod] = useState("24h");
  const [payType, setPayType] = useState("all");
  const [granularity, setGranularity] = useState("hour");
  const [stats, setStats] = useState<any>(null);
  const [priceData, setPriceData] = useState([]);
  const [spreadData, setSpreadData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [depthData, setDepthData] = useState([]);
  const [recentAds, setRecentAds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = `fiat=${fiat}${payType !== "all" ? `&payType=${payType}` : ""}`;
      const [statsRes, priceRes, spreadRes, heatmapRes, depthRes, adsRes] =
        await Promise.all([
          fetch(`/api/stats?type=current&${q}`),
          fetch(`/api/stats?type=price&period=${period}&granularity=${granularity}&${q}`),
          fetch(`/api/stats?type=spread&period=${period}&granularity=${granularity}&${q}`),
          fetch(`/api/stats?type=heatmap&${q}`),
          fetch(`/api/depth?type=current&${q}`),
          fetch(`/api/ads?period=${period}&limit=50&${q}`),
        ]);

      setStats(await statsRes.json());
      setPriceData(await priceRes.json());
      setSpreadData(await spreadRes.json());
      setHeatmapData(await heatmapRes.json());
      setDepthData(await depthRes.json());
      setRecentAds(await adsRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
    setLoading(false);
  }, [period, fiat, payType, granularity]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-1 auto-rows-min animate-in fade-in duration-500">
      
      {/* Ticker Section - Live Prices */}
      <div className="mb-4">
        {stats && <StatsCards stats={stats} fiat={fiat} />}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Main Chart Area (Left/Center) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* Chart Container */}
          <div className="bg-card border border-border rounded shadow-sm overflow-hidden">
            <Tabs defaultValue="price" className="w-full">
              <div className="flex items-center justify-between border-b border-border bg-card/30 px-4">
                <TabsList className="bg-transparent h-auto p-0 space-x-6">
                  <TabsTrigger value="price" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Price</TabsTrigger>
                  <TabsTrigger value="spread" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Spread</TabsTrigger>
                  <TabsTrigger value="volume" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Order Depth</TabsTrigger>
                  <TabsTrigger value="heatmap" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Heatmap</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded border border-success/20">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-[10px] font-bold text-success uppercase">Market Active</span>
                  </div>
                  <GranularitySelector value={granularity} onChange={setGranularity} />
                </div>
              </div>

              <div className="p-4 bg-background/20 min-h-[480px]">
                <TabsContent value="price" className="m-0">
                  {priceData.length > 0 ? <PriceChart data={priceData} forexRate={stats?.forexRate} fiat={fiat} /> : <EmptyState />}
                </TabsContent>
                <TabsContent value="spread" className="m-0">
                  {spreadData.length > 0 ? <SpreadChart data={spreadData} fiat={fiat} /> : <EmptyState />}
                </TabsContent>
                <TabsContent value="volume" className="m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[440px]">
                    <div className="h-full bg-card/20 rounded border border-border/30 p-2">
                      <DepthChart data={depthData} />
                    </div>
                    <div className="h-full bg-card/20 rounded border border-border/30 p-2">
                       <VolumeChart data={priceData} />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="heatmap" className="m-0">
                  {heatmapData.length > 0 ? <HeatmapChart data={heatmapData} fiat={fiat} /> : <EmptyState />}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Live Order Book Table */}
          <div className="bg-card border border-border rounded shadow-sm">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest">Live Market Order Book</h2>
              <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                 <div className="w-1 h-1 rounded-full bg-success"></div>
                 Real-time Feed
              </div>
            </div>
            <AdsTable ads={recentAds} fiat={fiat} />
          </div>
        </div>

        {/* Right Panel - Filters & Tools */}
        <div className="flex flex-col gap-6">
          <div className="bg-card border border-border rounded p-6 shadow-sm sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-4 bg-primary rounded-full"></div>
              <h2 className="text-xs font-bold text-white uppercase tracking-widest">Controls</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Configuration</label>
                <div className="bg-background/40 border border-border p-3 rounded flex flex-col gap-4">
                  <Filters fiat={fiat} onFiatChange={setFiat} period={period} onPeriodChange={setPeriod} payType={payType} onPayTypeChange={setPayType} />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                 <div className="flex flex-col gap-2">
                   <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                     <span>Sync Status</span>
                     <span className="text-white">Active</span>
                   </div>
                   <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary/30 w-full animate-pulse" />
                   </div>
                 </div>
              </div>

              <div className="bg-secondary/10 p-4 rounded border border-border text-[11px] text-muted-foreground leading-relaxed">
                Adjust the **fiat currency** and **timeframe** to refine your P2P arbitrage analysis.
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

const GRANULARITIES = [
  { value: "hour", label: "1H" },
  { value: "12h", label: "12H" },
  { value: "day", label: "1D" },
  { value: "week", label: "1W" },
];

function GranularitySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-secondary p-0.5 rounded border border-border">
      {GRANULARITIES.map((g) => (
        <button
          key={g.value}
          onClick={() => onChange(g.value)}
          className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${
            value === g.value
              ? "bg-card text-white shadow-sm"
              : "text-muted-foreground hover:text-white"
          }`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[440px] text-muted-foreground border border-dashed border-border/40 rounded bg-muted/5">
      <RefreshCw className="w-10 h-10 mb-4 opacity-5 animate-spin-slow" />
      <p className="text-xs font-bold uppercase tracking-widest">Connect Scraper</p>
      <p className="text-[10px] mt-1">Initiate a market scan to populate the analytics dashboard.</p>
    </div>
  );
}
