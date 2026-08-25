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
          Düzenlemek için timeline üzerinden bir klibe tıklayın.
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
      {/* Header */}
      <div className="h-8 px-3 bg-[#121722] border-b border-[#1e2538] flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-semibold text-slate-200 truncate uppercase tracking-wider">
            {clip.type} Özellikleri
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500">{clip.id.slice(0, 8)}</span>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3.5 pb-4">
          {/* Clip Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Klip Adı
            </label>
            <Input
              value={clip.name}
              onChange={(e) => onUpdateClip(clip.id, { name: e.target.value })}
              className="h-7 text-[11px] bg-[#121722] border-[#1e2538] text-slate-200"
            />
          </div>

          {/* Timing Section */}
          <div className="space-y-1.5 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Clock className="w-3 h-3 text-sky-400" />
              <span>Zamanlama</span>
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
          </div>

          {/* 1. OGraf Graphics Properties */}
          {isGraphics && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>OGraf Şablonu</span>
              </div>
              <div className="space-y-1">
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
              <div className="space-y-1">
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
              <div className="space-y-1">
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
            </div>
          )}

          {/* 2. Text Properties */}
          {isText && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                <Type className="w-3 h-3" />
                <span>Metin & Tipografi</span>
              </div>
              <div className="space-y-1">
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
                  <span className="text-[9px] text-slate-500">YAZI BOYUTU: {textClip.fontSize || 48}px</span>
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
                        className={`flex-1 py-0.5 text-[9px] font-bold rounded border ${
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
          )}

          {/* 3. Transform & Position (Video/Text) */}
          {(isVideo || isText) && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                <Move className="w-3 h-3" />
                <span>Dönüşüm (Transform)</span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400">
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
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400">
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
              </div>
            </div>
          )}

          {/* 4. Audio Properties */}
          {(isAudio || isVideo) && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Volume2 className="w-3 h-3" />
                <span>Ses Seviyesi</span>
              </div>
              <div>
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>VOLUME</span>
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
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
