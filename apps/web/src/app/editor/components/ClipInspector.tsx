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
  Zap,
  Music,
  SplitSquareVertical,
  Plus,
  Trash2,
  Activity,
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
  ClipKeyframe,
} from "@mcr/schema";

interface ClipInspectorProps {
  clip: TimelineClip | null;
  currentTime?: number;
  onUpdateClip: (clipId: string, partial: Partial<TimelineClip> | Record<string, any>) => void;
  onSetClipSpeed?: (clipId: string, speed: number) => void;
  onDetachAudio?: (clipId: string) => void;
  onAddKeyframe?: (clipId: string, keyframe: ClipKeyframe) => void;
  onRemoveKeyframe?: (clipId: string, keyframeId: string) => void;
}

export function ClipInspector({
  clip,
  currentTime = 0,
  onUpdateClip,
  onSetClipSpeed,
  onDetachAudio,
  onAddKeyframe,
  onRemoveKeyframe,
}: ClipInspectorProps) {
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

  const currentSpeed = clip.speed ?? 1.0;
  const localPlayhead = Math.max(0, Math.min(clip.duration, currentTime - clip.start));

  const handleCreateKeyframeAtPlayhead = () => {
    const newKf: ClipKeyframe = {
      id: `kf_${Date.now()}`,
      timeOffset: parseFloat(localPlayhead.toFixed(2)),
      x: (clip as any).x ?? 0,
      y: (clip as any).y ?? 0,
      scale: (clip as any).scale ?? 1.0,
      rotation: (clip as any).rotation ?? 0,
      opacity: (clip as any).opacity ?? 1.0,
      volume: (clip as any).volume ?? 1.0,
      easing: "linear",
    };
    onAddKeyframe?.(clip.id, newKf);
  };

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

          {/* 1. Zamanlama & Hız (OpenCut Retime Model) */}
          <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>Zamanlama & Hız (Retime)</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">
                {currentSpeed.toFixed(2)}x Hız
              </span>
            </div>

            {/* Speed Presets */}
            <div className="flex items-center gap-1 pt-0.5">
              {[0.5, 1.0, 1.5, 2.0, 4.0].map((s) => (
                <button
                  key={s}
                  onClick={() => onSetClipSpeed?.(clip.id, s)}
                  className={`flex-1 py-0.5 text-[9px] font-bold rounded border transition ${
                    Math.abs(currentSpeed - s) < 0.05
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                      : "bg-[#0b0e14] text-slate-400 border-[#1e2538] hover:bg-[#1a2333] hover:text-slate-200"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Custom Speed Slider */}
            <div className="space-y-1 pt-1">
              <Slider
                value={[currentSpeed]}
                min={0.25}
                max={4.0}
                step={0.05}
                onValueChange={(val) => onSetClipSpeed?.(clip.id, val[0])}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
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
                  value={parseFloat(clip.duration.toFixed(2))}
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

          {/* 2. Video Sesi Ayırma (OpenCut Detach Audio) */}
          {isVideo && (clip as any).src && (
            <div className="p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <button
                onClick={() => onDetachAudio?.(clip.id)}
                className="w-full py-1.5 px-2.5 rounded bg-[#1a2338] hover:bg-[#222e49] border border-sky-500/30 text-sky-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                title="Videonun sesini bağımsız bir ses katmanına ayır"
              >
                <SplitSquareVertical className="w-3.5 h-3.5 text-sky-400" />
                <span>Videodan Sesi Ayır (Detach Audio)</span>
              </button>
            </div>
          )}

          {/* 3. Anahtar Kareler (OpenCut Keyframe Animation) */}
          {(isVideo || isText) && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                  <Activity className="w-3 h-3" />
                  <span>Keyframe Animasyonu</span>
                </div>
                <button
                  onClick={handleCreateKeyframeAtPlayhead}
                  className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[9px] font-bold flex items-center gap-0.5 transition"
                  title="Playhead konumunda yeni anahtar kare oluştur"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Keyframe Ekle ({localPlayhead.toFixed(1)}s)</span>
                </button>
              </div>

              {/* Keyframe List */}
              {clip.keyframes && clip.keyframes.length > 0 ? (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {clip.keyframes.map((kf, kfIdx) => (
                    <div
                      key={kf.id}
                      className="flex items-center justify-between p-1 rounded bg-[#090b10] border border-[#1e2538] text-[9px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-amber-400 font-bold">
                          #{kfIdx + 1} ({kf.timeOffset}s)
                        </span>
                        <span className="text-slate-400">
                          X:{Math.round(kf.x ?? 0)} Y:{Math.round(kf.y ?? 0)} S:
                          {((kf.scale ?? 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <button
                        onClick={() => onRemoveKeyframe?.(clip.id, kf.id)}
                        className="p-0.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                        title="Keyframe Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[9px] text-slate-500 italic text-center py-1">
                  Henüz anahtar kare eklenmedi. Playhead üzerinde konum/ölçek animasyonu için butonla ekleyin.
                </div>
              )}
            </div>
          )}

          {/* 4. Video Dönüşüm (Transform) & Opaklık */}
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

          {/* 5. Renk Düzeltme & Filtreler (Color Grading) */}
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

          {/* 6. Ses Ayarları (Audio Suite) */}
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

          {/* 7. OGraf Grafik Şablonu Ayarları */}
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
                        data: { ...(graphicsClip.data || {}), title: e.target.value },
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
                        data: { ...(graphicsClip.data || {}), subtitle: e.target.value },
                      })
                    }
                    className="h-6 text-[11px] bg-[#0b0e14] border-[#1e2538] text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. Metin Katmanı Ayarları */}
          {isText && (
            <div className="space-y-2 p-2.5 rounded bg-[#121722] border border-[#1e2538]">
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                <Type className="w-3 h-3" />
                <span>Metin & Tipografi</span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[9px] text-slate-500">METİN İÇERİĞİ</span>
                  <Textarea
                    value={textClip.text || ""}
                    onChange={(e) => onUpdateClip(clip.id, { text: e.target.value })}
                    rows={2}
                    className="text-[11px] bg-[#0b0e14] border-[#1e2538] text-slate-200 resize-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-slate-400 mb-1">
                    <span>YAZI BOYUTU</span>
                    <span className="font-mono">{textClip.fontSize ?? 48}px</span>
                  </div>
                  <Slider
                    value={[textClip.fontSize ?? 48]}
                    min={18}
                    max={120}
                    step={2}
                    onValueChange={(val) => onUpdateClip(clip.id, { fontSize: val[0] })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
