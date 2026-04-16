"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TraderTable } from "@/components/traders/trader-table";
import {
  ProfitTable,
  type ProfitEstimate,
} from "@/components/traders/profit-table";
import {
  PeriodSelector,
  type PeriodPreset,
  getPeriodRange,
} from "@/components/traders/period-selector";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useFiat } from "@/components/providers/fiat-provider";

export default function TradersPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Chargement...</div>}>
      <TradersContent />
    </Suspense>
  );
}

function TradersContent() {
  const searchParams = useSearchParams();
  const selectedUserNo = searchParams.get("userNo");
  const { fiat } = useFiat();

  const [topTraders, setTopTraders] = useState<any[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [marketMakers, setMarketMakers] = useState<any[]>([]);
  const [marketMakersLoading, setMarketMakersLoading] = useState(true);
  const [traderProfile, setTraderProfile] = useState<any>(null);
  const [traderProfileLoading, setTraderProfileLoading] = useState(false);
  const [traderPatterns, setTraderPatterns] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<{
    period: PeriodPreset;
    payType: string;
    fiat: string;
    estimates: ProfitEstimate[];
  } | null>(null);
  const [profitPeriod, setProfitPeriod] = useState<PeriodPreset>("7d");
  const [profitPayType, setProfitPayType] = useState<string>("all");
  const [paymentMethods, setPaymentMethods] = useState<
    { payType: string; payMethodName: string | null }[]
  >([]);
  const profitLoading =
    profitData?.period !== profitPeriod ||
    profitData?.payType !== profitPayType ||
    profitData?.fiat !== fiat;
  const profitEstimates = profitLoading ? [] : profitData!.estimates;

  useEffect(() => {
    const q = `fiat=${encodeURIComponent(fiat)}`;
    setTopLoading(true);
    fetch(`/api/traders?type=top&limit=30&${q}`)
      .then((r) => r.json())
      .then((data) => setTopTraders(Array.isArray(data) ? data : []))
      .catch(() => setTopTraders([]))
      .finally(() => setTopLoading(false));
    setMarketMakersLoading(true);
    fetch(`/api/traders?type=marketMakers&${q}`)
      .then((r) => r.json())
      .then((data) => setMarketMakers(Array.isArray(data) ? data : []))
      .catch(() => setMarketMakers([]))
      .finally(() => setMarketMakersLoading(false));
    fetch(`/api/ads?paymentMethods=true&${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const seen = new Set<string>();
        const uniq = data.filter((pm: { payType: string }) => {
          if (seen.has(pm.payType)) return false;
          seen.add(pm.payType);
          return true;
        });
        setPaymentMethods(uniq);
        if (
          profitPayType !== "all" &&
          !uniq.some((pm) => pm.payType === profitPayType)
        ) {
          setProfitPayType("all");
        }
      })
      .catch(() => {});
  }, [fiat]);

  useEffect(() => {
    if (!selectedUserNo) return;
    const q = `fiat=${encodeURIComponent(fiat)}`;
    setTraderProfileLoading(true);
    setTraderProfile(null);
    setTraderPatterns([]);
    Promise.all([
      fetch(`/api/traders?type=profile&userNo=${selectedUserNo}&${q}`).then(
        (r) => r.json()
      ),
      fetch(`/api/traders?type=patterns&userNo=${selectedUserNo}&${q}`).then(
        (r) => r.json()
      ),
    ])
      .then(([profile, patterns]) => {
        setTraderProfile(profile);
        setTraderPatterns(Array.isArray(patterns) ? patterns : []);
      })
      .catch(() => {
        setTraderProfile(null);
        setTraderPatterns([]);
      })
      .finally(() => setTraderProfileLoading(false));
  }, [selectedUserNo, fiat]);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = getPeriodRange(profitPeriod);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      limit: "100",
      fiat,
    });
    if (profitPayType !== "all") params.set("payType", profitPayType);
    fetch(`/api/traders/profit?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`profit api ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setProfitData({
          period: profitPeriod,
          payType: profitPayType,
          fiat,
          estimates: data.estimates ?? [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setProfitData({
          period: profitPeriod,
          payType: profitPayType,
          fiat,
          estimates: [],
        });
      });
    return () => {
      cancelled = true;
    };
  }, [profitPeriod, profitPayType, fiat]);

  if (selectedUserNo) {
    if (traderProfileLoading) {
      return (
        <div
          className="flex flex-col items-center justify-center py-24 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-widest">
            Chargement du trader
          </p>
        </div>
      );
    }
    if (traderProfile) {
      return <TraderDetail profile={traderProfile} patterns={traderPatterns} />;
    }
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        Trader introuvable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analyse des Traders</h1>

      <Tabs defaultValue="top" className="space-y-4">
        <TabsList>
          <TabsTrigger value="top">Top Traders</TabsTrigger>
          <TabsTrigger value="marketMakers">Market Makers</TabsTrigger>
          <TabsTrigger value="profits">Profits estimés</TabsTrigger>
        </TabsList>

        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle>Top Traders (7 derniers jours)</CardTitle>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <TraderTableLoader label="Chargement des traders" />
              ) : (
                <TraderTable traders={topTraders} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketMakers">
          <Card>
            <CardHeader>
              <CardTitle>Market Makers (presence &gt; 80%)</CardTitle>
            </CardHeader>
            <CardContent>
              {marketMakersLoading ? (
                <TraderTableLoader label="Chargement des market makers" />
              ) : (
                <TraderTable traders={marketMakers} showPresence />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profits">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Profits estimés</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inférence basée sur la décroissance du tradable_quantity
                    entre snapshots, validée contre le delta monthOrderCount.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={profitPayType}
                    onValueChange={(v) => v && setProfitPayType(v)}
                  >
                    <SelectTrigger
                      className="min-w-[160px] w-auto h-8 text-[11px] font-bold bg-secondary/50 border-border hover:bg-secondary transition-colors focus:ring-1 focus:ring-primary cursor-pointer"
                      aria-label="Filtrer par moyen de paiement"
                    >
                      <SelectValue placeholder="Paiement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        Tous les paiements
                      </SelectItem>
                      {paymentMethods.map((pm) => (
                        <SelectItem
                          key={pm.payType}
                          value={pm.payType}
                          className="text-xs"
                        >
                          {pm.payMethodName || pm.payType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <PeriodSelector
                    value={profitPeriod}
                    onChange={setProfitPeriod}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <TraderTableLoader label="Calcul des profits en cours" />
              ) : (
                <ProfitTable estimates={profitEstimates} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TraderTableLoader({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" aria-hidden="true" />
      <p className="text-[10px] font-bold uppercase tracking-widest">{label}</p>
    </div>
  );
}

function TraderDetail({ profile, patterns }: { profile: any; patterns: any[] }) {
  const { trader, adHistory } = profile;

  const priceHistory = (adHistory || []).map((ad: any) => ({
    time: new Date(ad.scraped_at).toLocaleString("fr-RW", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    price: Number(ad.price),
    tradeType: ad.trade_type,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{trader.nickname}</h1>
        <Badge>{trader.userType || "user"}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ordres/mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{trader.monthlyOrderCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Taux completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {trader.monthlyFinishRate
                ? `${(Number(trader.monthlyFinishRate) * 100).toFixed(1)}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avis positifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {trader.positiveRate
                ? `${(Number(trader.positiveRate) * 100).toFixed(1)}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Premiere apparition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {new Date(trader.firstSeenAt).toLocaleDateString("fr-RW")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des prix</CardTitle>
        </CardHeader>
        <CardContent>
          {priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#8b5cf6" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Pas de donnees historiques.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
