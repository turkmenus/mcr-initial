"use client";

import React from "react";
import {
  Settings2,
  Sliders,
  Sparkles,
  Type,
  Volume2,
  Move,
  Palette,
  Clock,
  Gauge,
  Film,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TimelineClip,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
  TextClip,
  ImageClip,
} from "@mcr/schema";

interface ClipInspectorProps {
  clip: TimelineClip | null;
  onUpdateClip: (clipId: string, partial: Partial<TimelineClip> | Record<string, any>) => void;
}

export function ClipInspector({ clip, onUpdateClip }: ClipInspectorProps) {
  if (!clip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground select-none">
        <Sliders className="w-10 h-10 mb-3 opacity-30 text-sky-400" />
        <div className="text-sm font-bold text-slate-300">Klip Seçilmedi</div>
        <div className="text-xs text-muted-foreground max-w-xs mt-1">
          Özelliklerini ve efektlerini düzenlemek için zaman çizelgesinden bir klibe tıklayın.
        </div>
      </div>
    );
  }

  const isVideo = clip.type === "video";
  const isAudio = clip.type === "audio";
  const isGraphics = clip.type === "graphics";
  const isText = clip.type === "text";
  const isImage = clip.type === "image";

  const videoClip = clip as VideoClip;
  const audioClip = clip as AudioClip;
  const graphicsClip = clip as GraphicsOverlayClip;
  const textClip = clip as TextClip;
  const imageClip = clip as ImageClip;

  return (
    <ScrollArea className="flex-1 h-full pr-3 select-none">
      <div className="space-y-4 pb-6">
        {/* Header: Clip Name & Timing */}
        <div className="space-y-2 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="font-bold text-[10px] uppercase tracking-wider"
              style={{
                color: isGraphics ? "#F43F5E" : isText ? "#F59E0B" : isVideo ? "#38BDF8" : "#34D399",
                borderColor: `${isGraphics ? "#F43F5E" : isText ? "#F59E0B" : isVideo ? "#38BDF8" : "#34D399"}40`,
              }}
            >
              {clip.type.toUpperCase()} KLİBİ
            </Badge>

            <span className="text-xs font-mono text-muted-foreground">ID: {clip.id.slice(0, 10)}</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300">Klip Başlığı</label>
            <Input
              value={clip.name}
              onChange={(e) => onUpdateClip(clip.id, { name: e.target.value })}
              className="h-8 text-xs font-semibold"
            />
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Başlangıç (sn)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={clip.start}
                onChange={(e) => onUpdateClip(clip.id, { start: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Süre (sn)</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={clip.duration}
                onChange={(e) =>
                  onUpdateClip(clip.id, { duration: Math.max(0.1, parseFloat(e.target.value) || 0.5) })
                }
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* 1. OGraf Şablon Özellikleri */}
        {isGraphics && (
          <div className="space-y-3 p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OGraf Şablon Verileri</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Başlık / İsim</label>
              <Input
                value={graphicsClip.data?.title || ""}
                onChange={(e) =>
                  onUpdateClip(clip.id, {
                    data: { ...graphicsClip.data, title: e.target.value },
                  })
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Alt Başlık / Ünvan</label>
              <Input
                value={graphicsClip.data?.subtitle || ""}
                onChange={(e) =>
                  onUpdateClip(clip.id, {
                    data: { ...graphicsClip.data, subtitle: e.target.value },
                  })
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Kategori Rozeti</label>
                <Input
                  value={graphicsClip.data?.category || ""}
                  onChange={(e) =>
                    onUpdateClip(clip.id, {
                      data: { ...graphicsClip.data, category: e.target.value },
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Vurgu Rengi</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={graphicsClip.data?.accent || "#C8102E"}
                    onChange={(e) =>
                      onUpdateClip(clip.id, {
                        data: { ...graphicsClip.data, accent: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    {graphicsClip.data?.accent || "#C8102E"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Giriş Animasyon (sn)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3"
                  value={graphicsClip.inDuration ?? 0.5}
                  onChange={(e) =>
                    onUpdateClip(clip.id, { inDuration: parseFloat(e.target.value) || 0.5 })
                  }
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Çıkış Animasyon (sn)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="3"
                  value={graphicsClip.outDuration ?? 0.4}
                  onChange={(e) =>
                    onUpdateClip(clip.id, { outDuration: parseFloat(e.target.value) || 0.4 })
                  }
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Text / Başlık Özellikleri */}
        {isText && (
          <div className="space-y-3 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Type className="w-3.5 h-3.5" />
              <span>Metin ve Tipografi Ayarları</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300">Yazı İçeriği</label>
              <Textarea
                rows={2}
                value={textClip.text || ""}
                onChange={(e) => onUpdateClip(clip.id, { text: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Font Boyutu ({textClip.fontSize ?? 48}px)
                </label>
                <Slider
                  value={textClip.fontSize ?? 48}
                  min={18}
                  max={96}
                  step={2}
                  onValueChange={(val) => onUpdateClip(clip.id, { fontSize: val })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">Yazı Rengi</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textClip.textColor || "#FFFFFF"}
                    onChange={(e) => onUpdateClip(clip.id, { textColor: e.target.value })}
                    className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {textClip.textColor || "#FFFFFF"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              {(["left", "center", "right"] as const).map((align) => (
                <Button
                  key={align}
                  variant={textClip.textAlign === align ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => onUpdateClip(clip.id, { textAlign: align })}
                  className="h-7 text-[11px] capitalize"
                >
                  {align}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Transform (Video / Image) */}
        {(isVideo || isImage) && (
          <div className="space-y-3 p-3 rounded-xl bg-secondary/40 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Move className="w-3.5 h-3.5 text-sky-400" />
              <span>Görsel Transform (Boyut & Konum)</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Ölçek (Scale)</span>
                <span className="font-mono text-sky-400">
                  {Math.round(((videoClip.scale ?? 1.0) * 100))}%
                </span>
              </div>
              <Slider
                value={Math.round((videoClip.scale ?? 1.0) * 100)}
                min={20}
                max={250}
                step={5}
                onValueChange={(val) => onUpdateClip(clip.id, { scale: val / 100 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Konum X (px)</label>
                <Input
                  type="number"
                  step="10"
                  value={videoClip.x ?? 0}
                  onChange={(e) => onUpdateClip(clip.id, { x: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">Konum Y (px)</label>
                <Input
                  type="number"
                  step="10"
                  value={videoClip.y ?? 0}
                  onChange={(e) => onUpdateClip(clip.id, { y: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Opaklık (Opacity)</span>
                <span className="font-mono text-sky-400">
                  {Math.round(((videoClip.opacity ?? 1.0) * 100))}%
                </span>
              </div>
              <Slider
                value={Math.round((videoClip.opacity ?? 1.0) * 100)}
                min={0}
                max={100}
                step={5}
                onValueChange={(val) => onUpdateClip(clip.id, { opacity: val / 100 })}
              />
            </div>
          </div>
        )}

        {/* 4. Renk Filtreleri & Grading (Video / Image) */}
        {(isVideo || isImage) && (
          <div className="space-y-3 p-3 rounded-xl bg-secondary/40 border border-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Renk Ayarları & Filtreler</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Parlaklık (Brightness)</span>
                <span className="font-mono text-sky-400">
                  {(videoClip.brightness ?? 1.0).toFixed(2)}x
                </span>
              </div>
              <Slider
                value={Math.round((videoClip.brightness ?? 1.0) * 100)}
                min={20}
                max={200}
                step={5}
                onValueChange={(val) => onUpdateClip(clip.id, { brightness: val / 100 })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Kontrast (Contrast)</span>
                <span className="font-mono text-sky-400">
                  {(videoClip.contrast ?? 1.0).toFixed(2)}x
                </span>
              </div>
              <Slider
                value={Math.round((videoClip.contrast ?? 1.0) * 100)}
                min={20}
                max={200}
                step={5}
                onValueChange={(val) => onUpdateClip(clip.id, { contrast: val / 100 })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Doygunluk (Saturation)</span>
                <span className="font-mono text-sky-400">
                  {(videoClip.saturation ?? 1.0).toFixed(2)}x
                </span>
              </div>
              <Slider
                value={Math.round((videoClip.saturation ?? 1.0) * 100)}
                min={0}
                max={250}
                step={5}
                onValueChange={(val) => onUpdateClip(clip.id, { saturation: val / 100 })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Bulanıklık (Blur)</span>
                <span className="font-mono text-sky-400">{videoClip.blur ?? 0}px</span>
              </div>
              <Slider
                value={videoClip.blur ?? 0}
                min={0}
                max={20}
                step={1}
                onValueChange={(val) => onUpdateClip(clip.id, { blur: val })}
              />
            </div>
          </div>
        )}

        {/* 5. Ses Ayarları (Audio / Video) */}
        {(isAudio || isVideo) && (
          <div className="space-y-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Ses Seviyesi & Fade Eğrileri</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-300">
                <span>Ses Seviyesi (Volume)</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(((audioClip.volume ?? 1.0) * 100))}%
                </span>
              </div>
              <Slider
                value={Math.round((audioClip.volume ?? 1.0) * 100)}
                min={0}
                max={150}
                step={5}
                onValueChange={(val) => onUpdateClip(clip.id, { volume: val / 100 })}
              />
            </div>

            {isAudio && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Fade In (sn)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={audioClip.fadeIn ?? 0}
                    onChange={(e) =>
                      onUpdateClip(clip.id, { fadeIn: parseFloat(e.target.value) || 0 })
                    }
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400">Fade Out (sn)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={audioClip.fadeOut ?? 0}
                    onChange={(e) =>
                      onUpdateClip(clip.id, { fadeOut: parseFloat(e.target.value) || 0 })
                    }
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
