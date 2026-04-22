"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { OpportunityResult } from "@/lib/queries/profit-opportunities";

function fmtAmount(v: number | null | undefined, fiat: string): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${fiat}`;
}

function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}

function fmtUsdt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} USDT`;
}

function cycleLabel(buyDate: string, sellDate: string): string {
  if (buyDate === sellDate) return buyDate;
  return `${buyDate} → ${sellDate}`;
}

export function OpportunityResults({ result }: { result: OpportunityResult }) {
  const { mode, cycles, cumulative, singleCycle, meta, warning } = result;
  const fiat = meta.fiat;
  const anyViable = cycles.some((c) => c.viable);
  const isWeekly = mode === "weekly";

  const chartData = cycles.map((c) => ({
    label: cycleLabel(c.buyDate, c.sellDate),
    netProfit: c.netProfitLocal !== null ? Math.round(c.netProfitLocal) : 0,
    viable: c.viable,
  }));

  const cumulativeTitle = isWeekly
    ? "Cycles hebdomadaires cumulés"
    : "Cycles quotidiens cumulés";
  const cumulativeUnit = isWeekly ? "semaines viables" : "jours viables";
  const avgLabel = isWeekly ? "Moy. net / semaine viable" : "Moy. net / jour viable";
  const tableColLabel = isWeekly ? "Semaine (achat → vente)" : "Jour";

  return (
    <div className="space-y-4">
      {warning && (
        <div className="rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30 p-3 text-sm">
          ⚠ {warning}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Single cycle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Cycle unique{" "}
              <span className="text-muted-foreground font-normal">
                (achat {singleCycle.buyDate} → vente {singleCycle.sellDate})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Prix d&apos;achat</p>
                <p className="font-medium">{fmtPrice(singleCycle.bestBuyPrice)} {fiat}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prix de vente</p>
                <p className="font-medium">{fmtPrice(singleCycle.bestSellPrice)} {fiat}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">USDT acquis</p>
                <p className="font-medium">{fmtUsdt(singleCycle.usdtAcquired)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Spread brut</p>
                <p className="font-medium">{fmtPrice(singleCycle.grossSpread)} {fiat}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit brut</p>
                <p className="font-medium">{fmtAmount(singleCycle.grossProfitLocal, fiat)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frais (send + receive)</p>
                <p className="font-medium">
                  {fmtAmount(singleCycle.sendFee + singleCycle.receiveFeeOnGross, fiat)}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-border flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Profit net</p>
                <p
                  className={`text-2xl font-bold ${
                    singleCycle.viable ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {fmtAmount(singleCycle.netProfitLocal, fiat)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ROI</p>
                <p
                  className={`text-xl font-bold ${
                    singleCycle.viable ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {fmtPct(singleCycle.roiPercent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {cumulativeTitle}{" "}
              <span className="text-muted-foreground font-normal">
                ({cumulative.viableCycles}/{cumulative.totalCycles} {cumulativeUnit})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Profit brut cumulé</p>
                <p className="font-medium">{fmtAmount(cumulative.totalGrossProfit, fiat)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cycles viables</p>
                <p className="font-medium">
                  {cumulative.viableCycles} / {cumulative.totalCycles}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{avgLabel}</p>
                <p className="font-medium">{fmtAmount(cumulative.avgNetPerViableCycle, fiat)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Capital</p>
                <p className="font-medium">{fmtAmount(meta.capital, fiat)}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-border flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Profit net total</p>
                <p
                  className={`text-2xl font-bold ${
                    cumulative.totalNetProfit > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {fmtAmount(cumulative.totalNetProfit, fiat)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ROI</p>
                <p
                  className={`text-xl font-bold ${
                    cumulative.roiPercent > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {fmtPct(cumulative.roiPercent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!anyViable && cycles.length > 0 && (
        <div className="rounded-md bg-muted/50 border border-dashed p-4 text-sm text-muted-foreground text-center">
          Aucune opportunité viable sur cette plage (profit net ≤ 0 ou aucune ad ne
          correspond aux filtres).
        </div>
      )}

      {cycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Profit net par {isWeekly ? "semaine" : "jour"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${Number(v).toLocaleString("fr-FR")} ${fiat}`, "Profit net"]}
                />
                <Bar dataKey="netProfit" name="Profit net">
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.viable ? "#22c55e" : "#6b7280"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Détail par {isWeekly ? "semaine" : "jour"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tableColLabel}</TableHead>
                <TableHead className="text-right">Best achat</TableHead>
                <TableHead className="text-right">Best vente</TableHead>
                <TableHead className="text-right">Spread</TableHead>
                <TableHead className="text-right">Profit net</TableHead>
                <TableHead className="text-center">Viable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((c) => (
                <TableRow key={`${c.buyDate}-${c.sellDate}`}>
                  <TableCell className="font-medium">
                    {cycleLabel(c.buyDate, c.sellDate)}
                  </TableCell>
                  <TableCell className="text-right">{fmtPrice(c.bestBuyPrice)}</TableCell>
                  <TableCell className="text-right">{fmtPrice(c.bestSellPrice)}</TableCell>
                  <TableCell className="text-right">{fmtPrice(c.grossSpread)}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      c.viable ? "text-green-500" : c.netProfitLocal !== null ? "text-red-500" : ""
                    }`}
                  >
                    {fmtAmount(c.netProfitLocal, fiat)}
                  </TableCell>
                  <TableCell className="text-center">
                    {c.netProfitLocal === null ? (
                      <Badge variant="outline">—</Badge>
                    ) : c.viable ? (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/40">
                        Oui
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-500 border-red-500/40">
                        Non
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
