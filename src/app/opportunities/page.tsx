"use client";

import { useState } from "react";
import { OpportunityForm, type OpportunityFormValues } from "@/components/opportunities/opportunity-form";
import { OpportunityResults } from "@/components/opportunities/opportunity-results";
import { useFiat } from "@/components/providers/fiat-provider";
import type { OpportunityResult } from "@/lib/queries/profit-opportunities";

export default function OpportunitiesPage() {
  const { fiat } = useFiat();
  const [result, setResult] = useState<OpportunityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (values: OpportunityFormValues) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/profit-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, fiat }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de l'analyse");
      }

      const data: OpportunityResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Opportunités de gain</h1>
        <p className="text-muted-foreground">
          Analyse rétrospective : si vous aviez acheté USDT le matin et revendu le soir,
          combien auriez-vous gagné sur la période choisie ?
        </p>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <OpportunityForm onSubmit={handleAnalyze} loading={loading} />

        <div>
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive p-4 mb-4">
              {error}
            </div>
          )}

          {result ? (
            <OpportunityResults result={result} />
          ) : (
            <div className="flex items-center justify-center h-[400px] rounded-lg border border-dashed text-muted-foreground">
              {loading
                ? "Calcul en cours…"
                : "Configurez les paramètres et lancez l'analyse pour voir les résultats."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
