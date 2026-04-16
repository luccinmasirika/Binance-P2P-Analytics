"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { Filters } from "@/components/dashboard/filters";
import { AdsTable, type AdRow } from "@/components/dashboard/ads-table";
import { PriceChart } from "@/components/charts/price-chart";
import { SpreadChart } from "@/components/charts/spread-chart";
import { VolumeChart } from "@/components/charts/volume-chart";
import { DepthChart } from "@/components/charts/depth-chart";
import { HeatmapChart } from "@/components/charts/heatmap-chart";
import { RefreshCw } from "lucide-react";
import { useFiat } from "@/components/providers/fiat-provider";

export default function DashboardPage() {
  const { fiat } = useFiat();
  const [tradeType, setTradeType] = useState("BUY");
  const [period, setPeriod] = useState("24h");
  const [payType, setPayType] = useState("all");
  const [granularity, setGranularity] = useState("1h");
  const [activeTab, setActiveTab] = useState("price");
  const [stats, setStats] = useState<any>(null);
  const [priceData, setPriceData] = useState([]);
  const [spreadData, setSpreadData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [depthData, setDepthData] = useState([]);
  const [recentAds, setRecentAds] = useState<AdRow[]>([]);
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
          fetch(`/api/stats?type=heatmap&granularity=${granularity}&${q}`),
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
    setPriceData([]);
    setSpreadData([]);
    setHeatmapData([]);
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-1 auto-rows-min animate-in fade-in duration-500">
      
      {/* Ticker Section - Live Prices */}
      <div className="mb-4">
        {stats ? (
          <StatsCards stats={stats} fiat={fiat} />
        ) : (
          <StatsCardsSkeleton />
        )}
      </div>

      {!isMounted ? (
        <div className="h-[600px] flex items-center justify-center bg-card/10 rounded-lg border border-border/50 border-dashed">
           <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Main Chart Area - Full Width */}
          <section className="bg-card border border-border rounded shadow-sm overflow-hidden min-h-[540px]" aria-labelledby="chart-section-title">
            <h2 id="chart-section-title" className="sr-only">Analyses Graphiques</h2>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between border-b border-border bg-card/30 px-6">
                <TabsList className="bg-transparent h-auto p-0 space-x-8">
                  <TabsTrigger value="price" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Analyse des Prix</TabsTrigger>
                  <TabsTrigger value="spread" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Historique des Spreads</TabsTrigger>
                  <TabsTrigger value="volume" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Profondeur du Marché</TabsTrigger>
                  <TabsTrigger value="heatmap" className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-0 py-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Heatmap des spreads</TabsTrigger>
                </TabsList>
                
                {activeTab !== "volume" && (
                  <GranularitySelector value={granularity} onChange={setGranularity} />
                )}
              </div>

              <div className="p-6 bg-background/20 min-h-[480px]">
                <TabsContent value="price" className="m-0 focus-visible:outline-none">
                  {priceData.length > 0 ? <PriceChart data={priceData} forexRate={stats?.forexRate} fiat={fiat} /> : loading ? <ChartLoader /> : <EmptyState />}
                </TabsContent>
                <TabsContent value="spread" className="m-0 focus-visible:outline-none">
                  {spreadData.length > 0 ? <SpreadChart data={spreadData} fiat={fiat} /> : loading ? <ChartLoader /> : <EmptyState />}
                </TabsContent>
                <TabsContent value="volume" className="m-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[440px]">
                    <div className="h-full bg-card/20 rounded border border-border/30 p-2">
                      <DepthChart data={depthData} />
                    </div>
                    <div className="h-full bg-card/20 rounded border border-border/30 p-2">
                       <VolumeChart data={priceData} />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="heatmap" className="m-0 focus-visible:outline-none">
                  {heatmapData.length > 0 ? <HeatmapChart data={heatmapData} fiat={fiat} granularity={granularity} /> : loading ? <ChartLoader /> : <EmptyState />}
                </TabsContent>
              </div>
            </Tabs>
          </section>

          {/* Action Toolbar & Live Order Book */}
          <div className="space-y-4">
            
            {/* Horizontal Filter Toolbar */}
            <div className="bg-card/50 border border-border rounded p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm" role="toolbar" aria-label="Filtres du marché">
              <div className="flex items-center gap-3">
                <div className="flex bg-background/60 p-1 rounded-md border border-border/50 min-w-[200px]" role="group" aria-label="Type de transaction">
                  <button 
                    onClick={() => setTradeType("BUY")}
                    aria-label="Afficher les annonces d'achat"
                    aria-pressed={tradeType === "BUY"}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded cursor-pointer transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary ${
                      tradeType === "BUY" 
                        ? "bg-success text-white shadow-lg shadow-success/20" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    Achat
                  </button>
                  <button 
                    onClick={() => setTradeType("SELL")}
                    aria-label="Afficher les annonces de vente"
                    aria-pressed={tradeType === "SELL"}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded cursor-pointer transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary ${
                      tradeType === "SELL" 
                        ? "bg-destructive text-white shadow-lg shadow-destructive/20" 
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    Vente
                  </button>
                </div>
                
                <div className="h-6 w-px bg-border/50 mx-2" aria-hidden="true" />
                
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 pl-1">État de Sync</span>
                  <div className="flex items-center gap-2 px-2 py-1 bg-background/40 rounded border border-border/50" aria-live="polite">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Connecté</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Filters
                  period={period}
                  onPeriodChange={setPeriod}
                  payType={payType}
                  onPayTypeChange={setPayType}
                />
              </div>
            </div>

            {/* Table Container */}
            <section className="bg-card border border-border rounded shadow-sm overflow-hidden" aria-labelledby="orderbook-title">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/30">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-4 bg-primary rounded-full" aria-hidden="true"></div>
                  <h2 id="orderbook-title" className="text-[11px] font-bold text-white uppercase tracking-widest">Carnet d'ordres en direct</h2>
                </div>
                <div className="text-[10px] font-medium text-muted-foreground italic" suppressHydrationWarning aria-live="polite">
                  {loading && recentAds.length === 0
                    ? "Chargement…"
                    : recentAds.length > 0 && recentAds[0].scrapedAt
                    ? `Dernier scan : ${new Date(recentAds[0].scrapedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · ${recentAds.length} annonces`
                    : `${recentAds.length} annonces affichées`}
                </div>
              </div>
              {loading && recentAds.length === 0 ? (
                <div
                  className="flex items-center justify-center py-10"
                  role="status"
                  aria-live="polite"
                >
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
                  <span className="sr-only">Chargement du carnet d&apos;ordres</span>
                </div>
              ) : (
                <AdsTable ads={recentAds} fiat={fiat} />
              )}
            </section>
          </div>
        </div>
      )}

    </div>
  );
}

const GRANULARITIES = [
  { value: "15min", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
];

function GranularitySelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-secondary p-0.5 rounded border border-border" role="group" aria-label="Granularité temporelle">
      {GRANULARITIES.map((g) => (
        <button
          key={g.value}
          onClick={() => onChange(g.value)}
          aria-pressed={value === g.value}
          className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
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
    <div className="flex flex-col items-center justify-center h-[440px] text-muted-foreground border border-dashed border-border/40 rounded bg-muted/5" role="status">
      <RefreshCw className="w-10 h-10 mb-4 opacity-5 animate-spin-slow" aria-hidden="true" />
      <p className="text-xs font-bold uppercase tracking-widest">Connectez le scanner</p>
      <p className="text-[10px] mt-1 text-center max-w-[200px]">Lancez un scan du marché pour alimenter le tableau de bord.</p>
    </div>
  );
}

function ChartLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-[440px] text-muted-foreground border border-dashed border-border/40 rounded bg-muted/5" role="status" aria-live="polite">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" aria-hidden="true" />
      <p className="text-xs font-bold uppercase tracking-widest">Chargement</p>
      <span className="sr-only">Chargement des données du graphique</span>
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3"
      role="status"
      aria-label="Chargement des statistiques"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded p-4 animate-pulse"
          aria-hidden="true"
        >
          <div className="h-3 w-20 bg-muted/40 rounded mb-3" />
          <div className="h-6 w-28 bg-muted/60 rounded mb-2" />
          <div className="h-2.5 w-16 bg-muted/30 rounded" />
        </div>
      ))}
      <span className="sr-only">Chargement des statistiques</span>
    </div>
  );
}

