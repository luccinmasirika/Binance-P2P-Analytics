"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersProps {
  fiat: string;
  onFiatChange: (fiat: string) => void;
  period: string;
  onPeriodChange: (period: string) => void;
  payType: string;
  onPayTypeChange: (payType: string) => void;
}

interface Country {
  fiat: string;
  name: string;
  isActive: boolean;
}

interface PaymentMethod {
  payType: string;
  payMethodName: string | null;
}

export function Filters({ fiat, onFiatChange, period, onPeriodChange, payType, onPayTypeChange }: FiltersProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => {
        setCountries(data.active || []);
        if (data.active?.length > 0 && !data.active.find((c: Country) => c.fiat === fiat)) {
          onFiatChange(data.active[0].fiat);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/ads?paymentMethods=true")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const seen = new Set<string>();
        setPaymentMethods(data.filter((pm: PaymentMethod) => {
          if (seen.has(pm.payType)) return false;
          seen.add(pm.payType);
          return true;
        }));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-3 flex-wrap" role="group" aria-label="Filtres de recherche">
      <Select value={fiat} onValueChange={(v) => v && onFiatChange(v)}>
        <SelectTrigger 
          className="w-[140px] h-8 text-[11px] font-bold bg-secondary/50 border-border hover:bg-secondary transition-colors focus:ring-1 focus:ring-primary cursor-pointer"
          aria-label="Sélectionner la devise Fiat"
        >
          <SelectValue placeholder="Devise" />
        </SelectTrigger>
        <SelectContent>
          {countries.map((c) => (
            <SelectItem key={c.fiat} value={c.fiat} className="text-xs">
              {c.name} ({c.fiat})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
