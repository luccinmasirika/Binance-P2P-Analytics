"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFlag } from "@/lib/utils/flag-utils";
import { useFiat } from "@/components/providers/fiat-provider";

interface Country {
  fiat: string;
  name: string;
  isActive: boolean;
}

export function CountrySelector() {
  const router = useRouter();
  const { fiat, setFiat } = useFiat();
  const [countries, setCountries] = useState<Country[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => {
        const active = (data.active ?? []).filter((c: Country) => c.isActive);
        setCountries(active);
      })
      .catch(() => setCountries([]));
  }, []);

  const handleChange = (next: string | null) => {
    if (!next || next === fiat) return;
    setFiat(next);
    startTransition(async () => {
      try {
        await fetch("/api/fiat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fiat: next }),
        });
      } finally {
        router.refresh();
      }
    });
  };

  if (countries.length === 0) {
    return null;
  }

  return (
    <Select value={fiat} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        className="h-8 min-w-[130px] text-[11px] font-bold bg-secondary/50 border-border hover:bg-secondary transition-colors focus:ring-1 focus:ring-primary cursor-pointer"
        aria-label="Sélectionner le pays"
      >
        <SelectValue>
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">{getFlag(fiat)}</span>
            <span>{fiat}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {countries.map((c) => (
          <SelectItem key={c.fiat} value={c.fiat} className="text-xs">
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">{getFlag(c.fiat)}</span>
              <span className="font-bold">{c.fiat}</span>
              <span className="text-muted-foreground">— {c.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
