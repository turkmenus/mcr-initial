"use client";

import React, { useState, useRef } from "react";
import {
  FolderOpen,
  UploadCloud,
  Film,
  Music,
  Sparkles,
  Type,
  Volume2,
  Plus,
  Play,
  RefreshCw,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  SAMPLE_STOCK_MEDIA,
  STOCK_OGRAF_TEMPLATES,
  STOCK_TEXT_PRESETS,
  SampleMediaItem,
} from "../data/sampleMedia";
import { audioEngine } from "./AudioEngine";
import { MediaAsset } from "@mcr/db";

interface MediaLibraryPanelProps {
  mediaAssets: MediaAsset[];
  isUploading: boolean;
  uploadProgress: string;
  onUploadFile: (file: File) => void;
  onAddStockMedia: (item: SampleMediaItem) => void;
  onAddOGrafTemplate: (template: any) => void;
  onAddTextPreset: (preset: any) => void;
  onAddAsset: (asset: MediaAsset) => void;
}

export function MediaLibraryPanel({
  mediaAssets,
  isUploading,
  uploadProgress,
  onUploadFile,
  onAddStockMedia,
  onAddOGrafTemplate,
  onAddTextPreset,
  onAddAsset,
}: MediaLibraryPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFile(files[0]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      <Tabs defaultValue="stock" className="flex-1 flex flex-col space-y-3">
        {/* Top Tab Bar & Upload Button */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <TabsList className="grid grid-cols-4 w-80 h-8">
            <TabsTrigger value="stock" className="text-[11px] font-bold">
              <Film className="w-3 h-3 mr-1 text-sky-400" />
              Medya
            </TabsTrigger>
            <TabsTrigger value="ograf" className="text-[11px] font-bold">
              <Sparkles className="w-3 h-3 mr-1 text-rose-400" />
              OGraf
            </TabsTrigger>
            <TabsTrigger value="text" className="text-[11px] font-bold">
              <Type className="w-3 h-3 mr-1 text-amber-400" />
              Metin
            </TabsTrigger>
            <TabsTrigger value="audio" className="text-[11px] font-bold">
              <Music className="w-3 h-3 mr-1 text-emerald-400" />
              Ses FX
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-8 gap-1.5 text-xs font-bold bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Dosya Yükle</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*,image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {uploadProgress && (
          <div className="p-2.5 rounded-lg bg-sky-950/60 border border-sky-500/40 text-xs font-mono text-sky-300 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        )}

        {/* Tab 1: MAM Stock & Uploaded Media */}
        <TabsContent value="stock" className="flex-1 flex flex-col space-y-2 mt-0">
          <ScrollArea className="flex-1 h-[320px] pr-2">
            {/* Uploaded User Assets (if any) */}
            {mediaAssets.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Yüklenen Dosyalar ({mediaAssets.length})
                </div>
                {mediaAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-black/60 border border-border flex items-center justify-center flex-shrink-0 text-sky-400">
                        {asset.mimeType.startsWith("audio") ? (
                          <Music className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Film className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{asset.originalName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {asset.durationSeconds.toFixed(1)}s • {(asset.sizeBytes / 1048576).toFixed(1)}MB
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAddAsset(asset)}
                      className="h-7 px-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-950/40 gap-1 flex-shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Ekle</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Built-in Stock Media Assets */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Hazır Yayın Klipleri (4K Stüdyo & B-Roll)
              </div>
              {SAMPLE_STOCK_MEDIA.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-border/80 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between gap-3 transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold flex-shrink-0 shadow"
                      style={{ backgroundColor: `${item.color}25`, color: item.color }}
                    >
                      {item.type === "video" ? <Film className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {item.category} • {item.duration}s
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddStockMedia(item)}
                    className="h-7 px-2.5 text-xs font-bold text-sky-400 hover:bg-sky-950/40 gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ekle</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab 2: OGraf Broadcast Templates */}
        <TabsContent value="ograf" className="flex-1 flex flex-col space-y-2 mt-0">
          <ScrollArea className="flex-1 h-[320px] pr-2">
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                EBU OGraf Yayın Grafikleri
              </div>
              {STOCK_OGRAF_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.templateId}
                  className="p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between gap-3 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold flex-shrink-0 shadow"
                      style={{ backgroundColor: `${tmpl.color}25`, color: tmpl.color }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{tmpl.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {tmpl.category} • {tmpl.duration}s
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddOGrafTemplate(tmpl)}
                    className="h-7 px-2.5 text-xs font-bold text-rose-400 hover:bg-rose-950/40 gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ekle</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab 3: Text & Title Presets */}
        <TabsContent value="text" className="flex-1 flex flex-col space-y-2 mt-0">
          <ScrollArea className="flex-1 h-[320px] pr-2">
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Başlık ve Altyazı Şablonları
              </div>
              {STOCK_TEXT_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold flex-shrink-0 shadow">
                      <Type className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{preset.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono line-clamp-1">
                        &ldquo;{preset.text}&rdquo;
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddTextPreset(preset)}
                    className="h-7 px-2.5 text-xs font-bold text-amber-400 hover:bg-amber-950/40 gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ekle</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab 4: Audio & SFX Presets */}
        <TabsContent value="audio" className="flex-1 flex flex-col space-y-2 mt-0">
          <ScrollArea className="flex-1 h-[320px] pr-2">
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Ses Efektleri & Jingle (Canlı Ön Dinleme)
              </div>
              {[
                { name: "Ana Haber Açılış Jingle", type: "jingle" as const, desc: "Haber jingle fanfare melodisi", dur: 6 },
                { name: "Son Dakika Boom Hit", type: "hit" as const, desc: "Dramatik stinger sub bass vurgusu", dur: 3 },
                { name: "Deklanşör & Fotoğraf Sesi", type: "click" as const, desc: "Flaş ve basın toplantısı efekti", dur: 1 },
                { name: "Bip / Sayım Tonu", type: "beep" as const, desc: "Canlı yayın geri sayım bip sesi", dur: 1 },
              ].map((sfx, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => audioEngine.playSoundEffect(sfx.type)}
                      className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold flex-shrink-0 shadow hover:bg-emerald-500/30"
                      title="Ön Dinle"
                    >
                      <Play className="w-4 h-4 fill-emerald-400" />
                    </Button>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{sfx.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{sfx.desc}</div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onAddStockMedia({
                        id: `sfx_${Date.now()}_${idx}`,
                        name: sfx.name,
                        type: "audio",
                        duration: sfx.dur,
                        category: "SFX",
                        color: "#10B981",
                        description: sfx.desc,
                        src: `synthetic://${sfx.type}`,
                      })
                    }
                    className="h-7 px-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-950/40 gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ekle</span>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
