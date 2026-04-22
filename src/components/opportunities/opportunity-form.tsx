"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFiat } from "@/components/providers/fiat-provider";

export type FormMode = "daily" | "weekly";

export interface OpportunityFormValues {
  mode: FormMode;
  capital: number;
  dateStart: string;
  dateEnd: string;
  morningStart: number;
  morningEnd: number;
  eveningStart: number;
  eveningEnd: number;
  buyDayOfWeek: number;
  sellDayOfWeek: number;
  payType?: string;
}

interface OpportunityFormProps {
  onSubmit: (values: OpportunityFormValues) => void;
  loading?: boolean;
}

interface PaymentMethodOption {
  id: string;
  label: string;
}

const DAYS_OF_WEEK = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "0", label: "Dimanche" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function OpportunityForm({ onSubmit, loading }: OpportunityFormProps) {
  const { fiat } = useFiat();

  const [mode, setMode] = useState<FormMode>("daily");
  const [capital, setCapital] = useState(100000);
  const [dateStart, setDateStart] = useState(daysAgoIso(6));
  const [dateEnd, setDateEnd] = useState(todayIso());
  const [singleDay, setSingleDay] = useState(false);
  const [morningStart, setMorningStart] = useState(6);
  const [morningEnd, setMorningEnd] = useState(12);
  const [eveningStart, setEveningStart] = useState(18);
  const [eveningEnd, setEveningEnd] = useState(24);
  const [buyDayOfWeek, setBuyDayOfWeek] = useState("1"); // Monday
  const [sellDayOfWeek, setSellDayOfWeek] = useState("6"); // Saturday
  const [payType, setPayType] = useState<string>("all");

  const [availableMethods, setAvailableMethods] = useState<PaymentMethodOption[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);

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
      })
      .catch(() => {})
      .finally(() => setMethodsLoading(false));
  }, [fiat]);

  useEffect(() => {
    if (singleDay) {
      setDateEnd(dateStart);
    }
  }, [singleDay, dateStart]);

  // When switching to weekly mode, extend range to at least 28 days so cycles fit.
  useEffect(() => {
    if (mode === "weekly" && singleDay) {
      setSingleDay(false);
    }
    if (mode === "weekly") {
      const start = new Date(dateStart + "T00:00:00Z");
      const end = new Date(dateEnd + "T00:00:00Z");
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 14) {
        setDateStart(daysAgoIso(27));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      mode,
      capital,
      dateStart,
      dateEnd: singleDay ? dateStart : dateEnd,
      morningStart,
      morningEnd,
      eveningStart,
      eveningEnd,
      buyDayOfWeek: Number(buyDayOfWeek),
      sellDayOfWeek: Number(sellDayOfWeek),
      payType: payType === "all" ? undefined : payType,
    });
  };

  const validWindows =
    mode !== "daily" || (morningEnd > morningStart && eveningEnd > eveningStart);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres d&apos;analyse</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mode d&apos;analyse</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("daily")}
                className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                  mode === "daily"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                Jour (matin → soir)
              </button>
              <button
                type="button"
                onClick={() => setMode("weekly")}
                className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                  mode === "weekly"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                Semaine (jour → jour)
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "daily"
                ? "Un cycle par jour : achat matin, vente soir."
                : "Un cycle par semaine : achat sur un jour, vente sur un autre."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Capital ({fiat})</label>
            <Input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              min={1000}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              {capital.toLocaleString("fr-FR")} {fiat}
            </p>
          </div>

          {mode === "daily" && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="single-day"
                checked={singleDay}
                onCheckedChange={(v) => setSingleDay(Boolean(v))}
              />
              <label htmlFor="single-day" className="text-sm">
                Jour unique
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date début</label>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date fin</label>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                disabled={singleDay && mode === "daily"}
                min={dateStart}
              />
            </div>
          </div>

          {mode === "daily" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fenêtre matin (achat)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Début</p>
                    <Input
                      type="number"
                      value={morningStart}
                      onChange={(e) => setMorningStart(Number(e.target.value))}
                      min={0}
                      max={23}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fin (exclu)</p>
                    <Input
                      type="number"
                      value={morningEnd}
                      onChange={(e) => setMorningEnd(Number(e.target.value))}
                      min={1}
                      max={24}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Heures UTC — {morningStart}h à {morningEnd}h (exclu)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fenêtre soir (vente)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Début</p>
                    <Input
                      type="number"
                      value={eveningStart}
                      onChange={(e) => setEveningStart(Number(e.target.value))}
                      min={0}
                      max={23}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fin (exclu)</p>
                    <Input
                      type="number"
                      value={eveningEnd}
                      onChange={(e) => setEveningEnd(Number(e.target.value))}
                      min={1}
                      max={24}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Heures UTC — {eveningStart}h à {eveningEnd}h (exclu)
                </p>
              </div>
            </>
          )}

          {mode === "weekly" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jour d&apos;achat (début semaine)</label>
                <Select
                  value={buyDayOfWeek}
                  onValueChange={(v) => v && setBuyDayOfWeek(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jour de vente (fin semaine)</label>
                <Select
                  value={sellDayOfWeek}
                  onValueChange={(v) => v && setSellDayOfWeek(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Si le jour de vente est identique ou antérieur au jour d&apos;achat,
                  la vente a lieu la semaine suivante.
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Moyen de paiement</label>
            <Select value={payType} onValueChange={(v) => v && setPayType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les paiements</SelectItem>
                {availableMethods.map((pm) => (
                  <SelectItem key={pm.id} value={pm.id}>
                    {pm.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {methodsLoading && (
              <p className="text-xs text-muted-foreground">Chargement…</p>
            )}
          </div>

          {!validWindows && (
            <p className="text-xs text-red-500">
              Les fenêtres horaires doivent être croissantes (début &lt; fin).
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !dateStart || !dateEnd || !validWindows}
          >
            {loading ? "Analyse en cours…" : "Analyser les opportunités"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
