"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFiat } from "@/components/providers/fiat-provider";

interface FiltersProps {
  period: string;
  onPeriodChange: (period: string) => void;
  payType: string;
  onPayTypeChange: (payType: string) => void;
}

interface PaymentMethod {
  payType: string;
  payMethodName: string | null;
}

export function Filters({
  period,
  onPeriodChange,
  payType,
  onPayTypeChange,
}: FiltersProps) {
  const { fiat } = useFiat();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetch(`/api/ads?paymentMethods=true&fiat=${encodeURIComponent(fiat)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const seen = new Set<string>();
        const uniq = data.filter((pm: PaymentMethod) => {
          if (seen.has(pm.payType)) return false;
          seen.add(pm.payType);
          return true;
        });
        setPaymentMethods(uniq);
        if (payType !== "all" && !uniq.some((pm) => pm.payType === payType)) {
          onPayTypeChange("all");
        }
      })
      .catch(() => {});
  }, [fiat]);

  return (
    <div className="flex items-center gap-3 flex-wrap" role="group" aria-label="Filtres de recherche">
      <Select value={payType} onValueChange={(v) => v && onPayTypeChange(v)}>
        <SelectTrigger
          className="min-w-[140px] w-auto h-8 text-[11px] font-bold bg-secondary/50 border-border hover:bg-secondary transition-colors focus:ring-1 focus:ring-primary cursor-pointer"
          aria-label="Sélectionner la méthode de paiement"
        >
          <SelectValue placeholder="Paiement" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Tous les paiements</SelectItem>
          {paymentMethods.map((pm) => (
            <SelectItem key={pm.payType} value={pm.payType} className="text-xs">
              {pm.payMethodName || pm.payType}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={(v) => v && onPeriodChange(v)}>
        <SelectTrigger
          className="w-[100px] h-8 text-[11px] font-bold bg-secondary/50 border-border hover:bg-secondary transition-colors focus:ring-1 focus:ring-primary cursor-pointer"
          aria-label="Sélectionner la période de temps"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="24h" className="text-xs">24 Heures</SelectItem>
          <SelectItem value="7d" className="text-xs">7 Jours</SelectItem>
          <SelectItem value="30d" className="text-xs">30 Jours</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
