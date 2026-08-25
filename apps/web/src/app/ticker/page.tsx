"use client";

import React, { useState, useEffect } from "react";
import { useRealtime } from "@/context/RealtimeContext";
import {
  ScrollText,
  Plus,
  Trash2,
  AlertTriangle,
  Play,
  Square,
  Gauge,
  Sparkles,
  Save,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { TickerItem } from "@mcr/schema";

export default function TickerOperatorPage() {
  const { tickerState, updateTickerItems, updateTickerConfig, sendCGCommand, activeCgLayers } = useRealtime();

  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("SON DAKİKA");
  const [isUrgent, setIsUrgent] = useState(false);
  const [clockStr, setClockStr] = useState("12:00:00");

  useEffect(() => {
    const updateTime = () => setClockStr(new Date().toLocaleTimeString());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isTickerOnAir = !!activeCgLayers["1_20_20"] && activeCgLayers["1_20_20"].state === "PLAYING";

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newItem: TickerItem = {
      id: `ticker_${Date.now()}`,
      text: newText.trim(),
      category: newCategory,
      urgent: isUrgent,
      enabled: true,
      order: tickerState.items.length + 1,
    };

    updateTickerItems([...tickerState.items, newItem]);
    setNewText("");
    setIsUrgent(false);
  };

  const handleToggleItem = (id: string) => {
    const updated = tickerState.items.map((it) =>
      it.id === id ? { ...it, enabled: !it.enabled } : it
    );
    updateTickerItems(updated);
  };

  const handleDeleteItem = (id: string) => {
    const updated = tickerState.items.filter((it) => it.id !== id);
    updateTickerItems(updated);
  };

  const handleSpeedChange = (speed: number) => {
    updateTickerConfig({ speed });
  };

  const handleTakeIn = () => {
    sendCGCommand("PLAY", {
      channel: 1,
      layer: 20,
      cgLayer: 20,
      templateId: "ticker.headline",
      data: {
        category: newCategory,
        items: tickerState.items.filter((i) => i.enabled).map((i) => i.text),
        speed: tickerState.speed,
      },
    });
  };

  const handleTakeOut = () => {
    sendCGCommand("STOP", {
      channel: 1,
      layer: 20,
      cgLayer: 20,
    });
  };

  const handleSyncToAir = () => {
    sendCGCommand("UPDATE", {
      channel: 1,
      layer: 20,
      cgLayer: 20,
      data: {
        category: newCategory,
        items: tickerState.items.filter((i) => i.enabled).map((i) => i.text),
        speed: tickerState.speed,
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Action Bar */}
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Ticker (Haber Bandı) Operatörü</h1>
            <p className="text-xs text-muted-foreground">Canlı yayın haber akışı ve acil durum bildirim yönetimi</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={isTickerOnAir ? "destructive" : "broadcastTake"}
            size="default"
            onClick={handleTakeIn}
            className="gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>TICKER YAYINA AL (IN)</span>
          </Button>

          <Button
            variant="outline"
            size="default"
            onClick={handleTakeOut}
            className="gap-2"
          >
            <Square className="w-4 h-4 fill-current text-slate-300" />
            <span>DURDUR (OUT)</span>
          </Button>

          <Button
            variant="broadcastUpdate"
            size="default"
            onClick={handleSyncToAir}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            <span>YAYINA GÜNCELLE</span>
          </Button>
        </div>
      </Card>

      {/* Live Marquee Preview Bar */}
      <Card className="p-4 shadow-xl">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Canlı Önizleme Bandı</span>
          <Badge variant="info" className="font-mono">{tickerState.speed} px/sn</Badge>
        </div>
        <div className="relative w-full h-14 bg-black rounded-xl overflow-hidden border border-border flex items-center shadow-inner">
          <div className="h-full bg-primary text-primary-foreground font-black text-sm px-6 flex items-center tracking-wider z-10 shadow-md">
            {newCategory}
          </div>
          <div
            suppressHydrationWarning
            className="h-full bg-secondary text-secondary-foreground font-mono text-sm px-4 flex items-center border-r border-border z-10"
          >
            {clockStr}
          </div>
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="whitespace-nowrap animate-marquee flex items-center gap-8 text-white font-medium text-base px-6">
              {tickerState.items.filter((i) => i.enabled).map((item) => (
                <span key={item.id} className="inline-flex items-center gap-2">
                  {item.urgent && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      FLAŞ
                    </Badge>
                  )}
                  <span>{item.text}</span>
                  <span className="text-primary font-bold ml-6">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Form & Settings (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* Add Item Card */}
          <Card className="p-5 space-y-4">
            <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-border pb-3">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Yeni Haber Başlığı Ekle</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Kategori / Başlık</label>
              <div className="grid grid-cols-3 gap-2">
                {["SON DAKİKA", "GÜNDEM", "EKONOMİ", "DÜNYA", "SPOR", "METEOROLOJİ"].map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={newCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewCategory(cat)}
                    className="text-xs font-bold h-8"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Haber Metni</label>
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Örn: Hazar kıyısında yeni enerji anlaşması imzalandı..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
                <span className="flex items-center gap-1 text-primary">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Flaş Haber Olarak İşaretle
                </span>
              </label>

              <Button
                variant="broadcastSuccess"
                size="sm"
                onClick={handleAddItem}
                className="font-bold"
              >
                Listeye Ekle
              </Button>
            </div>
          </Card>

          {/* Speed Controls */}
          <Card className="p-5 space-y-4">
            <div className="text-sm font-bold text-white flex items-center gap-2 border-b border-border pb-3">
              <Gauge className="w-4 h-4 text-sky-400" />
              <span>Kayan Yazı Hız Ayarı</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-medium text-slate-300">
                <span>Kayma Hızı (Scroll Speed)</span>
                <span className="font-mono text-sky-400 font-bold">{tickerState.speed} px/sn</span>
              </div>
              <Slider
                min={60}
                max={240}
                step={10}
                value={tickerState.speed}
                onValueChange={handleSpeedChange}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Yavaş (60 px/s)</span>
                <span>Normal (120 px/s)</span>
                <span>Hızlı (240 px/s)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Ticker Queue (7 cols) */}
        <Card className="md:col-span-7 p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Haber Bandı Akış Sırası</span>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {tickerState.items.length} Öğe
            </Badge>
          </div>

          <ScrollArea className="space-y-2.5 flex-1 h-[420px]">
            {tickerState.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Henüz haber başlığı eklenmedi.
              </div>
            ) : (
              tickerState.items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border mb-2 flex items-center justify-between gap-4 transition-all duration-150 ${
                    item.enabled
                      ? "bg-secondary/70 border-border hover:border-muted-foreground/60"
                      : "bg-card/40 border-border/40 opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                    <Badge variant={item.urgent ? "destructive" : "info"} className="text-[10px]">
                      {item.category}
                    </Badge>
                    <p className="text-sm text-foreground font-medium line-clamp-2">{item.text}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={item.enabled ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleItem(item.id)}
                      className="h-7 text-xs font-bold"
                    >
                      {item.enabled ? "AKTİF" : "PASİF"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
