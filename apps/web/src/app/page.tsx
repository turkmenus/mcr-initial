"use client";

import React from "react";
import Link from "next/link";
import { useRealtime } from "@/context/RealtimeContext";
import {
  SlidersHorizontal,
  ScrollText,
  Film,
  CloudSun,
  Activity,
  Server,
  Layers,
  ArrowRight,
  Sparkles,
  Tv,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { connected, casparStatus, activeCgLayers, rundown, tickerState } = useRealtime();

  const activeLayerCount = Object.keys(activeCgLayers).length;

  const modules = [
    {
      title: "Canlı Grafik Kontrol",
      route: "/control",
      description: "OGraf standart şablonları (Lower-Third, Stinger, Score Bug) canlı yayında tek tuşla tetikleyin.",
      badge: "CANLI YAYIN",
      badgeVariant: "destructive" as const,
      icon: SlidersHorizontal,
      features: ["Tek Tuşla TAKE IN / OUT", "Dinamik Form Oluşturucu", "CasparCG AMCP Canlı Köprü", "Rundown Akış Listesi"],
    },
    {
      title: "Ticker Operatörü Konsolu",
      route: "/ticker",
      description: "Haber bandı içeriklerini bağımsız operatör panelinden anlık girin, düzenleyin ve yayınlayın.",
      badge: "OPERATÖR",
      badgeVariant: "tallyAmber" as const,
      icon: ScrollText,
      features: ["Son Dakika Acil Modu", "Kayan Yazı Hız Ayarı", "Kategori Rozetleri", "Gerçek Zamanlı Senkron"],
    },
    {
      title: "Kurgu & Timeline Editörü",
      route: "/editor",
      description: "Katman tabanlı timeline, video kırpma/kesme, OGraf grafik bindirme ve FFmpeg render kuyruğu.",
      badge: "KURGU (NLE)",
      badgeVariant: "info" as const,
      icon: Film,
      features: ["WebCodecs Kare Hassasiyeti", "EDL JSON Veri Modeli", "Grafik Katman Bindirme", "16:9 & 9:16 Export"],
    },
    {
      title: "Hava Durumu Stüdyosu",
      route: "/weather",
      description: "Open-Meteo verileri ve MapLibre GL ile yayın kalitesinde deterministik video segmentleri üretin.",
      badge: "SEGMENT ÜRETİCİ",
      badgeVariant: "teal" as const,
      icon: CloudSun,
      features: ["Open-Meteo Canlı Veri", "Koyu Yayın Harita Teması", "Türkmenistan Şehirleri", "FFmpeg Otomatik Klip"],
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 flex-1">
      {/* Hero Banner Card */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-card via-secondary/40 to-card border-border shadow-2xl p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <Badge variant="destructive" className="gap-1.5 py-1 px-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>MCR — MEDIA CONTROL ROOM STUDIO SUITE</span>
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Haber Odası Yayın ve Kurgu Otomasyonu
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              OGraf standart grafik şablonları, CasparCG NDI orkestrasyonu, çoklu operatör WebSocket senkronu ve
              profesyonel timeline video editörü tek çatı altında.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/control"
              className={cn(
                buttonVariants({ variant: "broadcastTake", size: "lg" }),
                "w-full sm:w-auto gap-2"
              )}
            >
              <Tv className="w-4 h-4" />
              <span>Canlı Kontrolü Başlat</span>
            </Link>
            <Link
              href="/editor"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto gap-2"
              )}
            >
              <Film className="w-4 h-4" />
              <span>Kurgu Editörü</span>
            </Link>
          </div>
        </div>
      </Card>

      {/* Studio Status Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-card/60">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">WebSocket Hub</div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              {connected ? "Bağlı (4001)" : "Bağlanıyor..."}
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-destructive animate-ping"}`} />
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-card/60">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">CasparCG AMCP</div>
            <div className="text-lg font-bold text-white flex items-center gap-2">
              {casparStatus} (5250)
              <span className={`w-2 h-2 rounded-full ${casparStatus === "CONNECTED" ? "bg-emerald-400" : "bg-amber-400"}`} />
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-card/60">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Aktif Katmanlar</div>
            <div className="text-lg font-bold text-white">
              {activeLayerCount} Katman Yayında
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-card/60">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Rundown / Ticker</div>
            <div className="text-lg font-bold text-white">
              {rundown.length} Cue / {tickerState.items.length} Başlık
            </div>
          </div>
        </Card>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.route} href={mod.route}>
              <Card className="group h-full p-6 flex flex-col justify-between hover:border-muted-foreground/60 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant={mod.badgeVariant}>{mod.badge}</Badge>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                    {mod.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-1.5 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                  <span>Modüle Git</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-primary" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
