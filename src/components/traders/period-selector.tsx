"use client";

import { Button } from "@/components/ui/button";

export type PeriodPreset = "24h" | "7d" | "30d";

export interface PeriodRange {
  from: Date;
  to: Date;
  preset: PeriodPreset;
}

export function getPeriodRange(preset: PeriodPreset): PeriodRange {
  const to = new Date();
  const days = preset === "24h" ? 1 : preset === "7d" ? 7 : 30;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to, preset };
}

interface PeriodSelectorProps {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset) => void;
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={value === p.value ? "default" : "outline"}
          onClick={() => onChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
