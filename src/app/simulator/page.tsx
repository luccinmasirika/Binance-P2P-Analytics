"use client";

import { useState } from "react";
import { ProfileForm } from "@/components/simulator/profile-form";
import { SimulationResults } from "@/components/simulator/results";

export default function SimulatorPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (params: any) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la simulation");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Simulateur de Profil</h1>
      <p className="text-muted-foreground">
        Creez un profil fictif et estimez vos benefices potentiels
        bases sur les donnees historiques du marche P2P.
      </p>

      <div className="grid lg:grid-cols-[400px_1fr] gap-6">
        <ProfileForm onSubmit={handleSimulate} loading={loading} />

        <div>
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive p-4 mb-4">
              {error}
            </div>
          )}

          {result ? (
            <SimulationResults result={result} />
          ) : (
            <div className="flex items-center justify-center h-[400px] rounded-lg border border-dashed text-muted-foreground">
              {loading
                ? "Calcul en cours..."
                : "Configurez votre profil et lancez la simulation pour voir les resultats."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
