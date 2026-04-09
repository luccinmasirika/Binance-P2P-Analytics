"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ScrapeButton() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleScrape = async () => {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 5000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
    setLoading(false);
  };

  return (
    <Button
      variant={status === "success" ? "default" : status === "error" ? "destructive" : "outline"}
      size="sm"
      onClick={handleScrape}
      disabled={loading}
      aria-label="Lancer le scan du marché P2P"
    >
      <span aria-live="polite">
        {loading
          ? "Scan en cours..."
          : status === "success"
            ? "Scan terminé"
            : status === "error"
              ? "Erreur"
              : "Lancer le scan"}
      </span>
    </Button>
  );
}
