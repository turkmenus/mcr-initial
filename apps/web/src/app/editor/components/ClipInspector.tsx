"use client";

import React from "react";
import {
  Sliders,
  Type,
  Volume2,
  Move,
  Film,
  Sparkles,
  Clock,
  Palette,
  Gauge,
  Layers,
  RotateCw,
  SunMedium,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 select-none bg-[#0b0e14]">
        <Sliders className="w-8 h-8 mb-2 opacity-30 text-slate-400" />
        <div className="text-xs font-semibold text-slate-300">Seçili Klip Yok</div>
        <div className="text-[10px] text-slate-500 max-w-[200px] mt-0.5">
          Düzenlemek için zaman çizelgesi üzerinden bir klibe tıklayın.
        </div>
      </div>
    );
  }

  const isVideo = clip.type === "video";
  const isAudio = clip.type === "audio";
  const isGraphics = clip.type === "graphics";
  const isText = clip.type === "text";

  const videoClip = clip as VideoClip;
  const audioClip = clip as AudioClip;
  const graphicsClip = clip as GraphicsOverlayClip;
  const textClip = clip as TextClip;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[#0b0e14]">
      {/* 1. Header */}
      <div className="h-8 px-3 bg-[#121722] border-b border-[#1e2538] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-bold text-slate-200 truncate uppercase tracking-wider">
            {clip.type} ÖZELLİKLERİ
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/50 text-slate-400 border border-[#1e2538]">
          {clip.id.slice(0, 8)}
        </span>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3 pb-6">
          {/* Klip Adı */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Klip Adı
            </label>
            <Input
              value={clip.name}
              onChange={(e) => onUpdateClip(clip.id, { name: e.target.value })}
              className="h-7 text-[11px] bg-[#121722] border-[#1e2538] text-slate-200"
            />
          </div>

          {/* 1. Zamanlama & Hız */}
          <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
            <div className="flex items-center gap-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              <span>Zamanlama & Offset</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-slate-500 font-mono">BAŞLANGIÇ (SN)</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={clip.start}
                  onChange={(e) =>
                    onUpdateClip(clip.id, { start: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="h-6 text-[11px] font-mono bg-[#0b0e14] border-[#1e2538] text-slate-200"
                />
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-mono">SÜRE (SN)</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={clip.duration}
                  onChange={(e) =>
                    onUpdateClip(clip.id, {
                      duration: Math.max(0.1, parseFloat(e.target.value) || 0.5),
                    })
                  }
                  className="h-6 text-[11px] font-mono bg-[#0b0e14] border-[#1e2538] text-slate-200"
                />
              </div>
            </div>
            {(isVideo || isAudio) && (
              <div>
                <span className="text-[9px] text-slate-500 font-mono">KIRPMA OFSETİ (SN)</span>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={clip.offset || 0}
                  onChange={(e) =>
                    onUpdateClip(clip.id, { offset: Math.max(0, parseFloat(e.target.value) || 0) })
                  }
                  className="h-6 text-[11px] font-mono bg-[#0b0e14] border-[#1e2538] text-slate-200"
                />
              </div>
            )}
          </div>

          {/* 2. Video Dönüşüm (Transform) & Opaklık */}
          {(isVideo || isText) && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                <Move className="w-3 h-3" />
                <span>Dönüşüm & Konum (Transform)</span>
              </div>
              <div className="space-y-2">
                {/* Scale */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>ÖLÇEK (SCALE)</span>
                    <span className="font-mono">{((videoClip.scale ?? 1) * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[videoClip.scale ?? 1]}
                    min={0.2}
                    max={3}
                    step={0.05}
                    onValueChange={(val) => onUpdateClip(clip.id, { scale: val[0] })}
                  />
                </div>

                {/* Opacity */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>OPAKLIK (OPACITY)</span>
                    <span className="font-mono">{((videoClip.opacity ?? 1) * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[videoClip.opacity ?? 1]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={(val) => onUpdateClip(clip.id, { opacity: val[0] })}
                  />
                </div>

                {/* Rotation */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>DÖNDÜRME (ROTATION)</span>
                    <span className="font-mono">{(videoClip.rotation ?? 0).toFixed(0)}°</span>
                  </div>
                  <Slider
                    value={[videoClip.rotation ?? 0]}
                    min={-180}
                    max={180}
                    step={5}
                    onValueChange={(val) => onUpdateClip(clip.id, { rotation: val[0] })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Renk Düzeltme & Filtreler (Color Grading) */}
          {isVideo && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                <SunMedium className="w-3 h-3" />
                <span>Renk & Görüntü Ayarları</span>
              </div>
              <div className="space-y-2">
                {/* Brightness */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>PARLAKLIK (BRIGHTNESS)</span>
                    <span className="font-mono">{videoClip.brightness ?? 100}%</span>
                  </div>
                  <Slider
                    value={[videoClip.brightness ?? 100]}
                    min={20}
                    max={200}
                    step={5}
                    onValueChange={(val) => onUpdateClip(clip.id, { brightness: val[0] })}
                  />
                </div>

                {/* Contrast */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>KONTRAST (CONTRAST)</span>
                    <span className="font-mono">{videoClip.contrast ?? 100}%</span>
                  </div>
                  <Slider
                    value={[videoClip.contrast ?? 100]}
                    min={20}
                    max={200}
                    step={5}
                    onValueChange={(val) => onUpdateClip(clip.id, { contrast: val[0] })}
                  />
                </div>

                {/* Saturation */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>DOYGUNLUK (SATURATION)</span>
                    <span className="font-mono">{videoClip.saturation ?? 100}%</span>
                  </div>
                  <Slider
                    value={[videoClip.saturation ?? 100]}
                    min={0}
                    max={250}
                    step={5}
                    onValueChange={(val) => onUpdateClip(clip.id, { saturation: val[0] })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Ses Ayarları (Audio Suite) */}
          {(isAudio || isVideo) && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Volume2 className="w-3 h-3" />
                <span>Ses Mikseri & Fade Eğrileri</span>
              </div>
              <div className="space-y-2">
                {/* Volume */}
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>SES SEVİYESİ (VOLUME)</span>
                    <span className="font-mono">
                      {((isAudio ? audioClip.volume ?? 1 : videoClip.volume ?? 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[isAudio ? audioClip.volume ?? 1 : videoClip.volume ?? 1]}
                    min={0}
                    max={1.5}
                    step={0.05}
                    onValueChange={(val) => onUpdateClip(clip.id, { volume: val[0] })}
                  />
                </div>

                {/* Fade In / Fade Out */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono">FADE IN (SN)</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={audioClip.fadeIn || 0}
                      onChange={(e) =>
                        onUpdateClip(clip.id, { fadeIn: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="h-6 text-[11px] font-mono bg-[#0b0e14] border-[#1e2538] text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono">FADE OUT (SN)</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={audioClip.fadeOut || 0}
                      onChange={(e) =>
                        onUpdateClip(clip.id, { fadeOut: Math.max(0, parseFloat(e.target.value) || 0) })
                      }
                      className="h-6 text-[11px] font-mono bg-[#0b0e14] border-[#1e2538] text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. OGraf Grafik Şablonu Ayarları */}
          {isGraphics && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>OGraf Canlı Şablon Verisi</span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[9px] text-slate-500">BAŞLIK</span>
                  <Input
                    value={graphicsClip.data?.title || ""}
                    onChange={(e) =>
                      onUpdateClip(clip.id, {
                        data: { ...graphicsClip.data, title: e.target.value },
                      })
                    }
                    className="h-6 text-[11px] bg-[#0b0e14] border-[#1e2538] text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500">ALT BAŞLIK / ÜNVAN</span>
                  <Input
                    value={graphicsClip.data?.subtitle || ""}
                    onChange={(e) =>
                      onUpdateClip(clip.id, {
                        data: { ...graphicsClip.data, subtitle: e.target.value },
                      })
                    }
                    className="h-6 text-[11px] bg-[#0b0e14] border-[#1e2538] text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[9px] text-slate-500">KATEGORİ ETİKETİ</span>
                  <Input
                    value={graphicsClip.data?.category || "HABER"}
                    onChange={(e) =>
                      onUpdateClip(clip.id, {
                        data: { ...graphicsClip.data, category: e.target.value },
                      })
                    }
                    className="h-6 text-[11px] bg-[#0b0e14] border-[#1e2538] text-slate-200"
                  />
                </div>

                {/* Accent Color Palette */}
                <div>
                  <span className="text-[9px] text-slate-500">VURGU RENGİ (ACCENT)</span>
                  <div className="flex gap-1.5 mt-1">
                    {["#C8102E", "#0284C7", "#059669", "#D97706", "#7C3AED", "#E11D48"].map((col) => (
                      <button
                        key={col}
                        onClick={() =>
                          onUpdateClip(clip.id, {
                            data: { ...graphicsClip.data, accent: col },
                            color: col,
                          })
                        }
                        className={`w-5 h-5 rounded-full border-2 transition ${
                          graphicsClip.data?.accent === col
                            ? "border-white scale-110 shadow"
                            : "border-transparent opacity-75 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. Metin & Tipografi Ayarları */}
          {isText && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                <Type className="w-3 h-3" />
                <span>Tipografi & Metin Katmanı</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[9px] text-slate-500">METİN İÇERİĞİ</span>
                  <Textarea
                    rows={2}
                    value={textClip.text || ""}
                    onChange={(e) => onUpdateClip(clip.id, { text: e.target.value })}
                    className="text-[11px] bg-[#0b0e14] border-[#1e2538] text-slate-200 min-h-[50px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-500">FONT BOYUTU: {textClip.fontSize || 48}px</span>
                    <Slider
                      value={[textClip.fontSize || 48]}
                      min={18}
                      max={120}
                      step={2}
                      onValueChange={(val) => onUpdateClip(clip.id, { fontSize: val[0] })}
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500">HİZALAMA</span>
                    <div className="flex gap-1 mt-1">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => onUpdateClip(clip.id, { textAlign: align })}
                          className={`flex-1 py-0.5 text-[9px] font-bold rounded border transition ${
                            (textClip.textAlign || "center") === align
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                              : "bg-[#0b0e14] text-slate-400 border-[#1e2538]"
                          }`}
                        >
                          {align[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
