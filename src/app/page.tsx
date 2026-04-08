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
  const [tradeType, setTradeType] = useState("BUY");
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = `fiat=${fiat}&tradeType=${tradeType}${payType !== "all" ? `&payType=${payType}` : ""}`;
      const [statsRes, priceRes, spreadRes, heatmapRes, depthRes, adsRes] =
        await Promise.all([
          fetch(`/api/stats?type=current&${q}`),
          fetch(`/api/stats?type=price&period=${period}&granularity=${granularity}&${q}`),
          fetch(`/api/stats?type=spread&period=${period}&granularity=${granularity}&${q}`),
          fetch(`/api/stats?type=heatmap&${q}`),
          fetch(`/api/depth?type=current&${q}`),
          fetch(`/api/ads?mode=latest&limit=50&${q}`),
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
  }, [period, fiat, tradeType, payType, granularity]);

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

      {!isMounted ? (
        <div className="h-[600px] flex items-center justify-center bg-card/10 rounded-lg border border-border/50 border-dashed">
           <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Main Chart Area - Full Width */}
          <div className="bg-card border border-border rounded shadow-sm overflow-hidden min-h-[540px]">
            <Tabs defaultValue="price" className="w-full">
              <div className="flex items-center justify-between border-b border-border bg-card/30 px-6">
                <TabsList className="bg-transparent h-auto p-0 space-x-8">
                  <TabsTrigger value="price" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Price Analysis</TabsTrigger>
                  <TabsTrigger value="spread" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Spread History</TabsTrigger>
                  <TabsTrigger value="volume" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Market Depth</TabsTrigger>
                  <TabsTrigger value="heatmap" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Spread Heatmap</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-success/10 rounded border border-success/20">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-[10px] font-bold text-success uppercase">Live Scanner Active</span>
                  </div>
                  <GranularitySelector value={granularity} onChange={setGranularity} />
                </div>
              </div>

              <div className="p-6 bg-background/20 min-h-[480px]">
                <TabsContent value="price" className="m-0">
                  {priceData.length > 0 ? <PriceChart data={priceData} forexRate={stats?.forexRate} fiat={fiat} /> : <EmptyState />}
                </TabsContent>
                <TabsContent value="spread" className="m-0">
                  {spreadData.length > 0 ? <SpreadChart data={spreadData} fiat={fiat} /> : <EmptyState />}
                </TabsContent>
                <TabsContent value="volume" className="m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[440px]">
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

          {/* Action Toolbar & Live Order Book */}
          <div className="space-y-4">
            
            {/* Horizontal Filter Toolbar */}
            <div className="bg-card/50 border border-border rounded p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex bg-background/60 p-1 rounded-md border border-border/50 min-w-[200px]">
                  <button 
                    onClick={() => setTradeType("BUY")}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                      tradeType === "BUY" 
                        ? "bg-success text-white shadow-lg shadow-success/20" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    Buy
                  </button>
                  <button 
                    onClick={() => setTradeType("SELL")}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all duration-200 ${
                      tradeType === "SELL" 
                        ? "bg-destructive text-white shadow-lg shadow-destructive/20" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    Sell
                  </button>
                </div>
                
                <div className="h-6 w-px bg-border/50 mx-2" />
                
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 pl-1">Sync Status</span>
                  <div className="flex items-center gap-2 px-2 py-1 bg-background/40 rounded border border-border/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Connected</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Filters 
                  fiat={fiat} 
                  onFiatChange={setFiat} 
                  period={period} 
                  onPeriodChange={setPeriod} 
                  payType={payType} 
                  onPayTypeChange={setPayType} 
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-card border border-border rounded shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/30">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                  <h2 className="text-[11px] font-bold text-white uppercase tracking-widest">Live Market Order Book</h2>
                </div>
                <div className="text-[10px] font-medium text-muted-foreground italic" suppressHydrationWarning>
                  {recentAds.length > 0 && recentAds[0].scrapedAt
                    ? `Last scan: ${new Date(recentAds[0].scrapedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · ${recentAds.length} ads`
                    : `${recentAds.length} ads`}
                </div>
              </div>
              <AdsTable ads={recentAds} fiat={fiat} />
            </div>
          </div>
        </div>
      )}

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
