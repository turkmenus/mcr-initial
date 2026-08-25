"use client";

import React, { useState } from "react";
import { useRealtime } from "@/context/RealtimeContext";
import {
  Play,
  Square,
  RefreshCw,
  Trash2,
  Plus,
  Tv,
  Layers,
  Terminal,
  Clock,
  Sliders,
  Radio,
  Cast,
  Video,
  Monitor,
  Shield,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { BROADCAST_TEMPLATES_REGISTRY, BroadcastTemplateMeta } from "@mcr/templates";

const TEMPLATES = BROADCAST_TEMPLATES_REGISTRY;

export default function LiveControlPage() {
  const {
    activeCgLayers,
    rundown,
    amcpLogs,
    sendCGCommand,
    takeRundownItem,
    createRundownItem,
    deleteRundownItem,
  } = useRealtime();

  const [selectedTemplate, setSelectedTemplate] = useState<BroadcastTemplateMeta>(TEMPLATES[0]);
  const [formData, setFormData] = useState<Record<string, any>>(TEMPLATES[0].defaultData);
  const [showSafeAreas, setShowSafeAreas] = useState(true);

  // Switcher state (OBS / vMix / CasparCG)
  const [programSource, setProgramSource] = useState("CAM1");
  const [previewSource, setPreviewSource] = useState("CAM2");
  const [operatorRole, setOperatorRole] = useState("DIRECTOR");

  const sources = ["CAM1", "CAM2", "VTR1", "GFX1"];

  const handleTemplateChange = (templateId: string) => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
    setSelectedTemplate(tmpl);
    setFormData(tmpl.defaultData);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const currentLayerKey = `${selectedTemplate.channel}_${selectedTemplate.layer}_${selectedTemplate.cgLayer}`;
  const isLayerActive = !!activeCgLayers[currentLayerKey] && activeCgLayers[currentLayerKey].state === "PLAYING";

  const handleTakeIn = () => {
    sendCGCommand("PLAY", {
      channel: selectedTemplate.channel,
      layer: selectedTemplate.layer,
      cgLayer: selectedTemplate.cgLayer,
      templateId: selectedTemplate.id,
      data: formData,
    });
  };

  const handleTakeOut = () => {
    sendCGCommand("STOP", {
      channel: selectedTemplate.channel,
      layer: selectedTemplate.layer,
      cgLayer: selectedTemplate.cgLayer,
    });
  };

  const handleUpdate = () => {
    sendCGCommand("UPDATE", {
      channel: selectedTemplate.channel,
      layer: selectedTemplate.layer,
      cgLayer: selectedTemplate.cgLayer,
      data: formData,
    });
  };

  const handleClearLayer = () => {
    sendCGCommand("CLEAR", {
      channel: selectedTemplate.channel,
      layer: selectedTemplate.layer,
    });
  };

  const handleAddToRundown = () => {
    createRundownItem({
      title: `${selectedTemplate.name} - ${formData.title || formData.city || formData.teamA || "Grafik"}`,
      category: selectedTemplate.category,
      templateId: selectedTemplate.id,
      channel: selectedTemplate.channel,
      layer: selectedTemplate.layer,
      cgLayer: selectedTemplate.cgLayer,
      data: formData,
      duration: 6,
      autoOut: true,
    });
  };

  // Trigger Switcher Transition (OBS WebSocket / vMix / CasparCG)
  const triggerSwitcherTransition = async (type: "CUT" | "AUTO" | "STINGER") => {
    const oldPgm = programSource;
    setProgramSource(previewSource);
    setPreviewSource(oldPgm);

    try {
      await fetch("/api/switcher/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transitionType: type,
          source: previewSource,
          duration: type === "AUTO" ? 1000 : 0,
        }),
      });
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-[1920px] mx-auto w-full">
      {/* Top Production Action Bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">HEDEF:</span>
            <Badge variant="outline" className="font-mono text-xs font-bold text-sky-400">
              CH {selectedTemplate.channel} : L{selectedTemplate.layer} (CG{selectedTemplate.cgLayer})
            </Badge>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">GRAFİK:</span>
            <Badge variant={isLayerActive ? "tallyOnAir" : "secondary"}>
              {isLayerActive ? "YAYINDA (ON AIR)" : "HAZIR (OFF)"}
            </Badge>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <Badge variant="teal" className="text-[10px] font-mono">
              ROL: {operatorRole}
            </Badge>
          </div>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="broadcastTake"
            size="default"
            onClick={handleTakeIn}
            className="gap-2"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>TAKE IN (F1)</span>
          </Button>

          <Button
            variant="broadcastOut"
            size="default"
            onClick={handleTakeOut}
            className="gap-2"
          >
            <Square className="w-4 h-4 fill-current text-slate-300" />
            <span>TAKE OUT (F2)</span>
          </Button>

          <Button
            variant="broadcastUpdate"
            size="default"
            onClick={handleUpdate}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>GÜNCELLE</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearLayer}
            className="gap-2 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            <span>TEMİZLE</span>
          </Button>
        </div>
      </Card>

      {/* Production Broadcast Switcher Control Strip */}
      <Card className="p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 bg-card/80 border-border">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Yayın Switcher Paneli</span>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                OBS Studio / vMix / NDI
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">Kamera miksajı ve canlı kaynak yönlendirme</div>
          </div>
        </div>

        {/* Program (PGM) & Preview (PVW) Bus */}
        <div className="flex items-center gap-6">
          {/* PGM BUS */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-red-400 font-mono">PGM:</span>
            <div className="flex items-center gap-1">
              {sources.map((src) => (
                <Button
                  key={src}
                  variant={programSource === src ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setProgramSource(src)}
                  className="h-7 px-2.5 text-xs font-bold font-mono"
                >
                  {src}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* PVW BUS */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-400 font-mono">PVW:</span>
            <div className="flex items-center gap-1">
              {sources.map((src) => (
                <Button
                  key={src}
                  variant={previewSource === src ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewSource(src)}
                  className={`h-7 px-2.5 text-xs font-bold font-mono ${
                    previewSource === src ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""
                  }`}
                >
                  {src}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Transition Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => triggerSwitcherTransition("CUT")}
            className="h-8 font-black font-mono tracking-wider px-3"
          >
            CUT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerSwitcherTransition("AUTO")}
            className="h-8 font-bold text-xs px-3"
          >
            AUTO (1.0s)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerSwitcherTransition("STINGER")}
            className="h-8 font-bold text-xs text-amber-400 border-amber-500/40 hover:bg-amber-950/40"
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            STINGER
          </Button>
        </div>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Template Selector & Dynamic Form (4 cols) */}
        <Card className="lg:col-span-4 flex flex-col p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Grafik Şablonu & Veri</span>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              OGraf v1
            </Badge>
          </div>

          {/* Template Select Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Aktif Şablon
            </label>
            <Select
              value={selectedTemplate.id}
              onChange={(e) => handleTemplateChange(e.target.value)}
            >
              {TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Dynamic Form Fields */}
          <ScrollArea className="space-y-4 flex-1 h-[320px]">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Şablon Alanları
            </div>
            <div className="space-y-3.5">
              {selectedTemplate.fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>{field.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{field.key}</span>
                  </label>
                  {field.type === "color" ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData[field.key] || field.defaultVal}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border bg-transparent cursor-pointer"
                      />
                      <Input
                        value={formData[field.key] || field.defaultVal}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : "text"}
                      value={formData[field.key] !== undefined ? formData[field.key] : field.defaultVal}
                      onChange={(e) =>
                        handleFieldChange(
                          field.key,
                          field.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Add to Rundown Button */}
          <Button
            variant="outline"
            onClick={handleAddToRundown}
            className="w-full gap-2 font-bold"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Rundown Listesine Ekle</span>
          </Button>
        </Card>

        {/* Center Column: Live Monitor Canvas & AMCP Console (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Live Preview Box */}
          <Card className="p-4 flex flex-col shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-bold text-white">Canlı Yayın Önizleme Monitörü</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <Switch checked={showSafeAreas} onCheckedChange={setShowSafeAreas} />
                  <span>Güvenli Alan</span>
                </label>
                <Badge variant="outline" className="font-mono text-[11px]">
                  1080p50
                </Badge>
              </div>
            </div>

            {/* 16:9 Canvas Aspect Frame */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border shadow-inner flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 opacity-70" />

              {/* Safe Title Guides */}
              {showSafeAreas && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-[5%] border border-dashed border-sky-500/25" />
                  <div className="absolute inset-[10%] border border-dashed border-red-500/25" />
                </div>
              )}

              {/* Real-time Rendered Live Template Sandbox */}
              <div className="absolute inset-0">
                <iframe
                  key={`${selectedTemplate.id}_preview`}
                  src={`/templates/${selectedTemplate.id}/index.html`}
                  className="w-full h-full border-none pointer-events-none"
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    setTimeout(() => {
                      if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: "UPDATE", data: formData }, "*");
                        if (isLayerActive) {
                          iframe.contentWindow.postMessage({ type: "PLAY" }, "*");
                        }
                      }
                    }, 200);
                  }}
                />
              </div>

              <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur text-[10px] font-mono text-muted-foreground">
                MCR LIVE PREVIEW • {selectedTemplate.name}
              </div>
            </div>
          </Card>

          {/* AMCP Live Terminal Console */}
          <Card className="p-4 flex-1 flex flex-col min-h-[220px]">
            <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>CasparCG AMCP Protokol Konsolu</span>
              </div>
              <Badge variant="teal" className="text-[10px] font-mono">
                PORT 5250 CANLI
              </Badge>
            </div>
            <ScrollArea className="flex-1 h-[140px] font-mono text-xs space-y-1 text-slate-300">
              {amcpLogs.length === 0 ? (
                <div className="text-muted-foreground italic">Komut bekleniyor...</div>
              ) : (
                amcpLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] leading-relaxed">
                    <span className="text-muted-foreground">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className="text-sky-400 font-semibold">{log.direction} &gt;</span>
                    <span className="text-emerald-300 font-bold">{log.command}</span>
                  </div>
                ))
              )}
            </ScrollArea>
          </Card>
        </div>

        {/* Right Column: Rundown Cue Sheet (3 cols) */}
        <Card className="lg:col-span-3 p-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Bülten Akışı (Rundown)</span>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {rundown.length} CUE
            </Badge>
          </div>

          <ScrollArea className="space-y-3 flex-1 h-[480px]">
            {rundown.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Rundown listesi boş. Sol panelden grafik ekleyebilirsiniz.
              </div>
            ) : (
              rundown.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border mb-2.5 transition-all duration-200 ${
                    item.status === "ON_AIR"
                      ? "bg-red-950/40 border-red-500/60 shadow-lg shadow-red-950/40"
                      : "bg-secondary/60 border-border hover:border-muted-foreground/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      #{idx + 1} · {item.category}
                    </span>
                    <Badge
                      variant={
                        item.status === "ON_AIR"
                          ? "destructive"
                          : item.status === "PLAYED"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <div className="text-sm font-bold text-white line-clamp-1 mb-1">
                    {item.title}
                  </div>

                  {item.notes && (
                    <div className="text-xs text-muted-foreground italic mb-2 line-clamp-1">
                      {item.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {item.duration}s {item.autoOut && "(Auto-Out)"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="broadcastTake"
                        size="sm"
                        onClick={() => takeRundownItem(item.id)}
                        className="h-7 px-3 text-xs"
                      >
                        TAKE
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRundownItem(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
