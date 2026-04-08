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

interface Trader {
  user_no: string;
  nickname: string;
  monthly_order_count: number;
  monthly_finish_rate: string;
  positive_rate: string;
  user_type: string | null;
  total_ads: number;
  sessions_present: number;
  avg_buy_price: string | null;
  avg_sell_price: string | null;
  presence_pct?: string;
}

export function TraderTable({ traders, showPresence = false }: { traders: Trader[]; showPresence?: boolean }) {
  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trader</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Ordres/mois</TableHead>
            <TableHead>Taux completion</TableHead>
            <TableHead>Annonces</TableHead>
            <TableHead>Prix moyen BUY</TableHead>
            <TableHead>Prix moyen SELL</TableHead>
            {showPresence && <TableHead>Presence</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {traders.map((t) => (
            <TableRow key={t.user_no}>
              <TableCell>
                <Link
                  href={`/traders?userNo=${t.user_no}`}
                  className="font-medium hover:underline"
                >
                  {t.nickname}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={t.user_type === "merchant" ? "default" : "outline"}>
                  {t.user_type || "user"}
                </Badge>
              </TableCell>
              <TableCell>{t.monthly_order_count}</TableCell>
              <TableCell>
                {t.monthly_finish_rate
                  ? `${(Number(t.monthly_finish_rate) * 100).toFixed(1)}%`
                  : "—"}
              </TableCell>
              <TableCell>{t.total_ads}</TableCell>
              <TableCell className="font-mono">
                {t.avg_buy_price ? Number(t.avg_buy_price).toFixed(2) : "—"}
              </TableCell>
              <TableCell className="font-mono">
                {t.avg_sell_price ? Number(t.avg_sell_price).toFixed(2) : "—"}
              </TableCell>
              {showPresence && (
                <TableCell>
                  <Badge variant="outline">{t.presence_pct}%</Badge>
                </TableCell>
              )}
            </TableRow>
          ))}
          {traders.length === 0 && (
            <TableRow>
              <TableCell colSpan={showPresence ? 8 : 7} className="text-center text-muted-foreground py-8">
                Aucun trader trouve.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
