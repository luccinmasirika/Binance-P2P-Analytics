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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

  const [topTraders, setTopTraders] = useState([]);
  const [marketMakers, setMarketMakers] = useState([]);
  const [traderProfile, setTraderProfile] = useState<any>(null);
  const [traderPatterns, setTraderPatterns] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<{
    period: PeriodPreset;
    estimates: ProfitEstimate[];
  } | null>(null);
  const [profitPeriod, setProfitPeriod] = useState<PeriodPreset>("7d");
  const profitLoading = profitData?.period !== profitPeriod;
  const profitEstimates = profitLoading ? [] : profitData!.estimates;

  useEffect(() => {
    fetch("/api/traders?type=top&limit=30").then((r) => r.json()).then(setTopTraders);
    fetch("/api/traders?type=marketMakers").then((r) => r.json()).then(setMarketMakers);
  }, []);

  useEffect(() => {
    if (selectedUserNo) {
      fetch(`/api/traders?type=profile&userNo=${selectedUserNo}`)
        .then((r) => r.json())
        .then(setTraderProfile);
      fetch(`/api/traders?type=patterns&userNo=${selectedUserNo}`)
        .then((r) => r.json())
        .then(setTraderPatterns);
    }
  }, [selectedUserNo]);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = getPeriodRange(profitPeriod);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      limit: "100",
    });
    fetch(`/api/traders/profit?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setProfitData({
            period: profitPeriod,
            estimates: data.estimates ?? [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profitPeriod]);

  if (selectedUserNo && traderProfile) {
    return <TraderDetail profile={traderProfile} patterns={traderPatterns} />;
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
              <TraderTable traders={topTraders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketMakers">
          <Card>
            <CardHeader>
              <CardTitle>Market Makers (presence &gt; 80%)</CardTitle>
            </CardHeader>
            <CardContent>
              <TraderTable traders={marketMakers} showPresence />
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
                <PeriodSelector
                  value={profitPeriod}
                  onChange={setProfitPeriod}
                />
              </div>
            </CardHeader>
            <CardContent>
              {profitLoading ? (
                <div className="text-center text-muted-foreground py-8">
                  Calcul en cours...
                </div>
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
