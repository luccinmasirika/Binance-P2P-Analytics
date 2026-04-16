"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useFiat } from "@/components/providers/fiat-provider";

interface PaymentMethodOption {
  id: string;
  label: string;
}

interface ProfileFormProps {
  onSubmit: (params: {
    capital: number;
    paymentMethods: string[];
    hoursPerDay: number;
    minutesPerTrade: number;
    startDate: string;
    endDate: string;
    priceStrategy: 1 | 2 | 3;
  }) => void;
  loading?: boolean;
}

export function ProfileForm({ onSubmit, loading }: ProfileFormProps) {
  const { fiat } = useFiat();
  const [capital, setCapital] = useState(100000);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethodOption[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [minutesPerTrade, setMinutesPerTrade] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priceStrategy, setPriceStrategy] = useState<1 | 2 | 3>(2);

  useEffect(() => {
    setMethodsLoading(true);
    fetch(`/api/ads?paymentMethods=true&fiat=${encodeURIComponent(fiat)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const seen = new Set<string>();
        const options: PaymentMethodOption[] = data
          .filter((pm: { payType: string }) => {
            if (seen.has(pm.payType)) return false;
            seen.add(pm.payType);
            return true;
          })
          .map((pm: { payType: string; payMethodName: string | null }) => ({
            id: pm.payType,
            label: pm.payMethodName || pm.payType,
          }));
        setAvailableMethods(options);
        setPaymentMethods((prev) => {
          const validIds = new Set(options.map((o) => o.id));
          const retained = prev.filter((id) => validIds.has(id));
          if (retained.length > 0) return retained;
          return options.length > 0 ? [options[0].id] : [];
        });
      })
      .catch(() => {})
      .finally(() => setMethodsLoading(false));
  }, [fiat]);

  const togglePayMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      capital,
      paymentMethods,
      hoursPerDay,
      minutesPerTrade,
      startDate,
      endDate,
      priceStrategy,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil fictif</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Capital */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Capital initial ({fiat})</label>
            <Input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              min={10000}
              step={10000}
            />
            <p className="text-xs text-muted-foreground">
              {capital.toLocaleString("fr-FR")} {fiat}
            </p>
          </div>

          {/* Payment methods */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Moyens de paiement</label>
            <div className="flex flex-col gap-2">
              {methodsLoading ? (
                <div
                  className="flex items-center gap-2 text-xs text-muted-foreground py-1"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-primary border-t-transparent animate-spin"
                    aria-hidden="true"
                  />
                  Chargement des moyens de paiement…
                </div>
              ) : availableMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucun moyen de paiement pour {fiat}. Lancez un scrape pour en
                  remonter.
                </p>
              ) : (
                availableMethods.map((pm) => (
                  <div key={pm.id} className="flex items-center gap-2">
                    <Checkbox
                      id={pm.id}
                      checked={paymentMethods.includes(pm.id)}
                      onCheckedChange={() => togglePayMethod(pm.id)}
                    />
                    <label htmlFor={pm.id} className="text-sm">
                      {pm.label}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hours per day */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Temps disponible par jour: {hoursPerDay}h
            </label>
            <input
              type="range"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              min={1}
              max={16}
              step={1}
              className="w-full accent-primary"
            />
          </div>

          {/* Minutes per trade */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Duree estimee par transaction (min)
            </label>
            <Input
              type="number"
              value={minutesPerTrade}
              onChange={(e) => setMinutesPerTrade(Number(e.target.value))}
              min={5}
              max={120}
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date debut</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Price strategy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Strategie de prix</label>
            <div className="flex gap-3">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPriceStrategy(s)}
                  className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                    priceStrategy === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {s === 1 ? "Meilleur prix" : s === 2 ? "2e meilleur" : "3e meilleur"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Un prix plus realiste (2e ou 3e) tient compte de la concurrence.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !startDate || !endDate}>
            {loading ? "Simulation en cours..." : "Lancer la simulation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
