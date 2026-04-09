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
      <Table aria-label="Carnet d'ordres P2P">
        <caption className="sr-only">Liste des annonces P2P actives sur Binance</caption>
        <TableHeader className="bg-card/50">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead scope="col" className="w-[80px] text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 border-b border-border/10">Type</TableHead>
            <TableHead scope="col" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 border-b border-border/10">Prix ({fiat})</TableHead>
            <TableHead scope="col" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 border-b border-border/10">Quantité (USDT)</TableHead>
            <TableHead scope="col" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 border-b border-border/10">Limites ({fiat})</TableHead>
            <TableHead scope="col" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 border-b border-border/10">Annonceur</TableHead>
            <TableHead scope="col" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 border-b border-border/10">Paiement</TableHead>
            <TableHead scope="col" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest h-9 text-right border-b border-border/10">Heure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.map((ad) => (
            <TableRow key={ad.id} className="border-border hover:bg-muted/20 transition-colors group cursor-pointer">
              <TableCell className="py-2.5">
                <div 
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded inline-block ${
                    ad.tradeType === "BUY" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                  }`}
                  aria-label={`Type de transaction : ${ad.tradeType === "BUY" ? "Achat" : "Vente"}`}
                >
                  {ad.tradeType === "BUY" ? "Achat" : "Vente"}
                </div>
              </TableCell>
              <TableCell className="py-2.5 font-mono font-bold text-sm tracking-tighter">
                <span className={ad.tradeType === "BUY" ? "text-success" : "text-destructive"} aria-label={`Prix : ${ad.price} ${fiat}`}>
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
                   <div 
                    className="text-[12px] font-bold text-white group-hover:text-primary transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Voir le profil de ${ad.advertiserNickname}`}
                   >
                    {ad.advertiserNickname}
                   </div>
                   <div className="text-[10px] text-muted-foreground flex items-center gap-1.5" aria-label={`${ad.advertiserMonthlyOrders ?? 0} ordres, taux de complétion ${(Number(ad.advertiserFinishRate || 0) * 100).toFixed(1)}%`}>
                     <span>{ad.advertiserMonthlyOrders ?? 0} ordres</span>
                     <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                     <span>{(Number(ad.advertiserFinishRate || 0) * 100).toFixed(1)}%</span>
                   </div>
                </div>
              </TableCell>
              <TableCell className="py-2.5">
                <div className="flex flex-wrap gap-1" aria-label="Méthodes de paiement acceptées">
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
                <div className="flex flex-col items-center gap-2 opacity-30" aria-live="polite">
                  <div className="w-8 h-8 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-widest">Scanner actif... patientez</span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
