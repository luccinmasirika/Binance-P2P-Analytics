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

interface AdRow {
  id: number;
  tradeType: string;
  price: string;
  tradableQuantity: string | null;
  minAmount: string | null;
  maxAmount: string | null;
  advertiserNickname: string;
  advertiserMonthlyOrders: number | null;
  advertiserFinishRate: string | null;
  scrapedAt: string;
  paymentMethods: { payType: string; name: string | null }[];
}

export function AdsTable({ ads, fiat = "RWF" }: { ads: AdRow[]; fiat?: string }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-card/50">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[80px] text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9">Type</TableHead>
            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9">Price ({fiat})</TableHead>
            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9">Amount (USDT)</TableHead>
            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9">Limits ({fiat})</TableHead>
            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9">Advertiser</TableHead>
            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9">Payment</TableHead>
            <TableHead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.map((ad) => (
            <TableRow key={ad.id} className="border-border hover:bg-muted/20 transition-colors group">
              <TableCell className="py-2.5">
                <div className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded inline-block ${
                  ad.tradeType === "BUY" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}>
                  {ad.tradeType === "BUY" ? "Buy" : "Sell"}
                </div>
              </TableCell>
              <TableCell className="py-2.5 font-mono font-bold text-sm tracking-tighter">
                <span className={ad.tradeType === "BUY" ? "text-success" : "text-destructive"}>
                  {Number(ad.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </TableCell>
              <TableCell className="py-2.5 font-mono text-[11px] font-medium text-white/90">
                {ad.tradableQuantity ? Number(ad.tradableQuantity).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
              </TableCell>
              <TableCell className="py-2.5 text-[11px] text-muted-foreground font-medium">
                {ad.minAmount && ad.maxAmount
                  ? `${Number(ad.minAmount).toLocaleString()} - ${Number(ad.maxAmount).toLocaleString()}`
                  : "—"}
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex flex-col gap-0.5">
                   <div className="text-[12px] font-bold text-white group-hover:text-primary transition-colors cursor-pointer">{ad.advertiserNickname}</div>
                   <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                     <span>{ad.advertiserMonthlyOrders ?? 0} orders</span>
                     <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground" />
                     <span>{(Number(ad.advertiserFinishRate || 0) * 100).toFixed(1)}%</span>
                   </div>
                </div>
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex flex-wrap gap-1">
                  {ad.paymentMethods.map((pm, i) => (
                    <div key={`${pm.payType}-${i}`} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-bold tracking-tight border border-border/40 whitespace-nowrap">
                      {pm.name || pm.payType}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="py-2.5 text-[10px] text-muted-foreground text-right font-medium" suppressHydrationWarning>
                {new Date(ad.scrapedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </TableCell>
            </TableRow>
          ))}
          {ads.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-20 bg-muted/5">
                <div className="flex flex-col items-center gap-2 opacity-30">
                  <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Scanner active ...</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
