"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Country {
  fiat: string;
  name: string;
  currencySymbol: string;
  isActive: boolean;
}

interface AvailableCountry {
  fiat: string;
  name: string;
  currencySymbol: string;
}

export default function CountriesPage() {
  const [active, setActive] = useState<Country[]>([]);
  const [available, setAvailable] = useState<AvailableCountry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchCountries = async () => {
    try {
      const res = await fetch("/api/countries");
      const data = await res.json();
      setActive(data.active || []);
      setAvailable(data.available || []);
    } catch {
      setActive([]);
      setAvailable([]);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const addCountry = async (fiat: string) => {
    setLoading(fiat);
    await fetch("/api/countries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiat }),
    });
    await fetchCountries();
    setLoading(null);
  };

  const toggleCountry = async (fiat: string, isActive: boolean) => {
    setLoading(fiat);
    await fetch("/api/countries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiat, isActive }),
    });
    await fetchCountries();
    setLoading(null);
  };

  const removeCountry = async (fiat: string) => {
    setLoading(fiat);
    await fetch("/api/countries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiat }),
    });
    await fetchCountries();
    setLoading(null);
  };

  const activeFiats = new Set(active.map((c) => c.fiat));
  const notAdded = available.filter((c) => !activeFiats.has(c.fiat));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pays</h1>
      <p className="text-muted-foreground">
        Ajoutez un pays en un clic pour commencer a scraper ses annonces P2P.
      </p>

      {/* Active countries */}
      <Card>
        <CardHeader>
          <CardTitle>Pays actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">
              Aucun pays configure. Ajoutez-en un ci-dessous.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {active.map((c) => (
                <div
                  key={c.fiat}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.fiat} ({c.currencySymbol})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.isActive ? "default" : "outline"}>
                      {c.isActive ? "Actif" : "Pause"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading === c.fiat}
                      onClick={() => toggleCountry(c.fiat, !c.isActive)}
                    >
                      {c.isActive ? "Pause" : "Activer"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={loading === c.fiat}
                      onClick={() => removeCountry(c.fiat)}
                    >
                      Retirer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available countries to add */}
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un pays</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {notAdded.map((c) => (
              <Button
                key={c.fiat}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-1"
                disabled={loading === c.fiat}
                onClick={() => addCountry(c.fiat)}
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.fiat}</span>
              </Button>
            ))}
            {notAdded.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-4">
                Tous les pays disponibles ont ete ajoutes.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
