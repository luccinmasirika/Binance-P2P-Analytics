"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export interface ProfitEstimate {
  userNo: string;
  nickname: string;
  userType: string | null;
  monthlyOrderCount: number | null;
  usdtBought: number;
  usdtSold: number;
  matchedVolumeUsdt: number;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  avgSpread: number | null;
  grossSpreadProfit: number;
  estimatedFees: number;
  netProfitEstimate: number;
  inferredOrdersCount: number;
  deltaMonthOrderCount: number | null;
  confidence: "high" | "medium" | "low";
  inventoryImbalanceUsdt: number;
}

const numberFr = new Intl.NumberFormat("fr-RW", {
  maximumFractionDigits: 0,
});
const numberFr2 = new Intl.NumberFormat("fr-RW", {
  maximumFractionDigits: 2,
});

function formatRwf(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${numberFr.format(Math.round(n))} RWF`;
}

function formatUsdt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${numberFr2.format(n)} USDT`;
}

function ConfidenceBadge({ value }: { value: "high" | "medium" | "low" }) {
  const variant: Record<typeof value, "default" | "secondary" | "outline"> = {
    high: "default",
    medium: "secondary",
    low: "outline",
  };
  const label: Record<typeof value, string> = {
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
  };
  const color: Record<typeof value, string> = {
    high: "text-emerald-500",
    medium: "text-amber-500",
    low: "text-muted-foreground",
  };
  return (
    <Badge variant={variant[value]} className={color[value]}>
      {label[value]}
    </Badge>
  );
}

interface ProfitTableProps {
  estimates: ProfitEstimate[];
}

export function ProfitTable({ estimates }: ProfitTableProps) {
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trader</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Volume inféré</TableHead>
            <TableHead className="text-right">Spread moyen</TableHead>
            <TableHead className="text-right">Profit brut</TableHead>
            <TableHead className="text-right">Frais estimés</TableHead>
            <TableHead className="text-right">Profit net</TableHead>
            <TableHead className="text-right">Fills / Δordres</TableHead>
            <TableHead>Confiance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimates.map((e) => (
            <TableRow key={e.userNo}>
              <TableCell>
                <Link
                  href={`/traders?userNo=${e.userNo}`}
                  className="font-medium hover:underline"
                >
                  {e.nickname}
                </Link>
              </TableCell>
              <TableCell>
                <Badge
                  variant={e.userType === "merchant" ? "default" : "outline"}
                >
                  {e.userType || "user"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatUsdt(e.matchedVolumeUsdt)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {e.avgSpread != null ? numberFr2.format(e.avgSpread) : "—"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatRwf(e.grossSpreadProfit)}
              </TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {formatRwf(e.estimatedFees)}
              </TableCell>
              <TableCell
                className={`text-right font-mono font-semibold ${
                  e.netProfitEstimate >= 0
                    ? "text-emerald-500"
                    : "text-destructive"
                }`}
              >
                {formatRwf(e.netProfitEstimate)}
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {e.inferredOrdersCount}
                {e.deltaMonthOrderCount != null
                  ? ` / ${e.deltaMonthOrderCount}`
                  : " / —"}
              </TableCell>
              <TableCell>
                <ConfidenceBadge value={e.confidence} />
              </TableCell>
            </TableRow>
          ))}
          {estimates.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center text-muted-foreground py-8"
              >
                Pas assez de données pour estimer les profits sur cette période.
                Le scraper doit accumuler plusieurs snapshots consécutifs.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
