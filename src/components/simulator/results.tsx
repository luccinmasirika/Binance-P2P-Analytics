"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SimulationResult {
  totalProfit: number;
  avgDailyProfit: number;
  roiPercent: number;
  bestDay: { date: string; profit: number } | null;
  worstDay: { date: string; profit: number } | null;
  totalCycles: number;
  dailyProfits: { date: string; profit: number; cycles: number }[];
  hourlyOptimal: { hour: number; avgSpread: number }[];
}

export function SimulationResults({ result }: { result: SimulationResult }) {
  const cumulativeData = result.dailyProfits.reduce<
    { date: string; profit: number; cumulative: number }[]
  >((acc, day) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    acc.push({
      date: day.date,
      profit: Math.round(day.profit),
      cumulative: Math.round(prev + day.profit),
    });
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Profit total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-500">
              {result.totalProfit.toLocaleString("fr-RW", { maximumFractionDigits: 0 })} RWF
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Profit moyen/jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {result.avgDailyProfit.toLocaleString("fr-RW", { maximumFractionDigits: 0 })} RWF
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${result.roiPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
              {result.roiPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cycles total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{result.totalCycles}</div>
          </CardContent>
        </Card>
        {result.bestDay && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Meilleur jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-green-500">
                +{result.bestDay.profit.toLocaleString("fr-RW", { maximumFractionDigits: 0 })} RWF
              </div>
              <p className="text-xs text-muted-foreground">{result.bestDay.date}</p>
            </CardContent>
          </Card>
        )}
        {result.worstDay && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Pire jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-red-500">
                {result.worstDay.profit.toLocaleString("fr-RW", { maximumFractionDigits: 0 })} RWF
              </div>
              <p className="text-xs text-muted-foreground">{result.worstDay.date}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cumulative profit chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profits cumules</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} RWF`]} />
              <Line type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Optimal hours */}
      {result.hourlyOptimal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Heures les plus profitables</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={result.hourlyOptimal.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} RWF`, "Spread moyen"]} />
                <Bar dataKey="avgSpread" name="Spread moyen" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
