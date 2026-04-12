"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFlag } from "@/lib/utils/flag-utils";
import { 
  Plus, 
  Pause, 
  Play, 
  Trash2, 
  Globe, 
  Activity, 
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
    setDeleteConfirm(null);
  };

  const activeFiats = new Set(active.map((c) => c.fiat));
  const notAdded = available.filter((c) => !activeFiats.has(c.fiat));

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">Gestion des Pays</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Configurez les marchés régionaux à surveiller. Activez un pays pour commencer à collecter ses données P2P en temps réel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Active Countries List (Main area) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Marchés Actifs ({active.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {active.length === 0 ? (
              <div className="bg-card/30 border border-border border-dashed rounded-xl py-12 flex flex-col items-center gap-4">
                <Globe className="w-12 h-12 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Aucun marché configuré</p>
                <Button variant="outline" size="sm" className="text-[10px] font-bold uppercase cursor-pointer" onClick={() => {}}>Selectionnez un pays à droite</Button>
              </div>
            ) : (
              active.map((c) => (
                <div
                  key={c.fiat}
                  className="group bg-card/50 border border-border hover:border-primary/50 rounded-xl p-5 flex items-center justify-between transition-all duration-300 shadow-sm backdrop-blur-sm relative overflow-hidden"
                >
                  {/* Visual background glow for active items */}
                  {c.isActive && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  )}

                  <div className="flex items-center gap-4 relative z-10">
                    <div className="text-4xl filter drop-shadow-md select-none">
                      {getFlag(c.fiat)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white tracking-tight">{c.name}</span>
                        <Badge variant="outline" className="bg-background/50 border-border/50 text-[9px] h-4 font-bold uppercase tracking-tighter">
                          {c.fiat}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${c.isActive ? 'bg-success animate-pulse' : 'bg-muted-foreground/30'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${c.isActive ? 'text-success' : 'text-muted-foreground'}`}>
                            {c.isActive ? 'Opérationnel' : 'En Pause'}
                          </span>
                        </div>
                        <div className="w-px h-3 bg-border/50" />
                        <span className="text-[10px] text-muted-foreground font-medium italic">Devise : {c.currencySymbol}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-[10px] font-bold uppercase cursor-pointer bg-background/40 border-border/50 hover:bg-secondary transition-all"
                      disabled={loading === c.fiat}
                      onClick={() => toggleCountry(c.fiat, !c.isActive)}
                    >
                      {loading === c.fiat ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : c.isActive ? (
                        <div className="flex items-center gap-2">
                          <Pause className="w-3 h-3" /> Pause
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-success">
                          <Play className="w-3 h-3" /> Reprendre
                        </div>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                      disabled={loading === c.fiat}
                      onClick={() => setDeleteConfirm(c.fiat)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Available Countries (Secondary area) */}
        <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Ajouter un marché
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {notAdded.map((c) => (
              <button
                key={c.fiat}
                disabled={loading === c.fiat}
                onClick={() => addCountry(c.fiat)}
                className="group flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card/20 hover:bg-secondary/40 hover:border-primary/40 transition-all duration-200 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl filter grayscale group-hover:grayscale-0 transition-all">
                    {getFlag(c.fiat)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-primary transition-colors">{c.name}</div>
                    <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{c.fiat}</div>
                  </div>
                </div>
                {loading === c.fiat ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </button>
            ))}
            {notAdded.length === 0 && (
              <div className="bg-secondary/20 rounded-lg p-6 flex flex-col items-center gap-3 border border-border/30">
                <CheckCircle2 className="w-8 h-8 text-success/40" />
                <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest">
                  Tous les marchés disponibles sont configurés.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-[400px] bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive uppercase italic tracking-tight">
              <AlertCircle className="w-5 h-5" /> Retirer le marché ?
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              Êtes-vous sûr de vouloir retirer ce pays ? Toutes les données de scannage liées à ce marché seront archivées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex items-center gap-3">
            <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-bold uppercase cursor-pointer" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="flex-1 text-[10px] font-bold uppercase cursor-pointer" 
              onClick={() => deleteConfirm && removeCountry(deleteConfirm)}
              disabled={loading === deleteConfirm}
            >
              {loading === deleteConfirm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Retirer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

