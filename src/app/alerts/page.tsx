"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useFiat } from "@/components/providers/fiat-provider";

interface Alert {
  id: number;
  name: string;
  telegramChatId: string;
  conditionType: string;
  threshold: string;
  payTypes: string[] | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  cooldownMinutes: number;
  createdAt: string;
}

export default function AlertsPage() {
  const { fiat } = useFiat();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyAlertId, setBusyAlertId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [chatId, setChatId] = useState("");
  const [conditionType, setConditionType] = useState("spread_above");
  const [threshold, setThreshold] = useState("");
  const [cooldown, setCooldown] = useState(30);

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          telegramChatId: chatId,
          conditionType,
          threshold: Number(threshold),
          cooldownMinutes: cooldown,
        }),
      });
      setName("");
      setThreshold("");
      setShowForm(false);
      await fetchAlerts();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAlert = async (alert: Alert) => {
    setBusyAlertId(alert.id);
    try {
      await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, isActive: !alert.isActive }),
      });
      await fetchAlerts();
    } finally {
      setBusyAlertId(null);
    }
  };

  const deleteAlert = async (id: number) => {
    setBusyAlertId(id);
    try {
      await fetch("/api/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchAlerts();
    } finally {
      setBusyAlertId(null);
    }
  };

  const conditionLabel = (type: string) => {
    switch (type) {
      case "spread_above": return "Spread >";
      case "price_below": return "Prix BUY <";
      case "price_above": return "Prix SELL >";
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Alertes Telegram</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Annuler" : "Nouvelle alerte"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Creer une alerte</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createAlert} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Spread interessant"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telegram Chat ID</label>
                  <Input
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="Ex: 123456789"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <Select value={conditionType} onValueChange={(v) => v && setConditionType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spread_above">Spread superieur a</SelectItem>
                      <SelectItem value="price_below">Prix BUY inferieur a</SelectItem>
                      <SelectItem value="price_above">Prix SELL superieur a</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seuil ({fiat})</label>
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cooldown (min)</label>
                  <Input
                    type="number"
                    value={cooldown}
                    onChange={(e) => setCooldown(Number(e.target.value))}
                    min={5}
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? "Création en cours…" : "Creer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Alertes configurees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Seuil</TableHead>
                <TableHead>Cooldown</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernier declenchement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alertsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10">
                    <div
                      className="flex items-center justify-center gap-3 text-muted-foreground text-xs"
                      role="status"
                      aria-live="polite"
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"
                        aria-hidden="true"
                      />
                      Chargement des alertes…
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {alerts.map((alert) => {
                    const busy = busyAlertId === alert.id;
                    return (
                      <TableRow key={alert.id} className={busy ? "opacity-60" : undefined}>
                        <TableCell className="font-medium">{alert.name}</TableCell>
                        <TableCell>{conditionLabel(alert.conditionType)}</TableCell>
                        <TableCell className="font-mono">{alert.threshold} {fiat}</TableCell>
                        <TableCell>{alert.cooldownMinutes} min</TableCell>
                        <TableCell>
                          <Badge variant={alert.isActive ? "default" : "outline"}>
                            {alert.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {alert.lastTriggeredAt
                            ? new Date(alert.lastTriggeredAt).toLocaleString("fr-RW")
                            : "Jamais"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => toggleAlert(alert)}
                            >
                              {busy
                                ? "…"
                                : alert.isActive
                                ? "Desactiver"
                                : "Activer"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={busy}
                              onClick={() => deleteAlert(alert.id)}
                            >
                              {busy ? "…" : "Supprimer"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {alerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Aucune alerte configuree.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Comment configurer Telegram</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>1. Ouvrez Telegram et cherchez <strong>@BotFather</strong></p>
          <p>2. Envoyez <code>/newbot</code> et suivez les instructions pour creer votre bot</p>
          <p>3. Copiez le <strong>token</strong> et ajoutez-le comme variable <code>TELEGRAM_BOT_TOKEN</code> dans les secrets GitHub</p>
          <p>4. Envoyez un message a votre bot, puis ouvrez <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> pour trouver votre <strong>Chat ID</strong></p>
          <p>5. Utilisez ce Chat ID pour creer vos alertes ci-dessus</p>
        </CardContent>
      </Card>
    </div>
  );
}
