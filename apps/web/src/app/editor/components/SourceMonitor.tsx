"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Film,
  Play,
  Pause,
  Plus,
  Eye,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Music,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineClip } from "@mcr/schema";
import { formatTimecode } from "@mcr/timeline";

interface SourceMonitorProps {
  clip: TimelineClip | null;
  onInsertToTimeline?: (inPoint?: number, outPoint?: number) => void;
  onOverwriteToTimeline?: (inPoint?: number, outPoint?: number) => void;
}

export function SourceMonitor({
  clip,
  onInsertToTimeline,
  onOverwriteToTimeline,
}: SourceMonitorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const duration = clip ? clip.duration || 10 : 10;
  const isVideo = clip?.type === "video";
  const isAudio = clip?.type === "audio";

  // Reset when clip changes
  useEffect(() => {
    setCurrentTime(0);
    setInPoint(null);
    setOutPoint(null);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [clip?.id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    const clamped = Math.max(0, Math.min(duration, time));
    setCurrentTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  const stepFrame = (deltaFrames: number) => {
    const frameTime = 1 / 50; // 50 fps
    handleSeek(currentTime + deltaFrames * frameTime);
  };

  const setMarkIn = () => {
    setInPoint(currentTime);
  };

  const setMarkOut = () => {
    setOutPoint(currentTime);
  };

  const clearMarks = () => {
    setInPoint(null);
    setOutPoint(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14] border-r border-[#222733] select-none h-full overflow-hidden">
      {/* 1. Header Bar */}
      <div className="h-8 px-3 bg-[#131722] border-b border-[#222733] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider truncate">
            KAYNAK MONİTÖRÜ (SOURCE)
          </span>
        </div>
        {clip && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-amber-400 border border-amber-500/30 truncate max-w-[150px]">
              {clip.name}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {formatTimecode(currentTime, 50)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Display Surface */}
      <div className="flex-1 bg-[#05070a] flex items-center justify-center p-2 relative overflow-hidden">
        {clip ? (
          <div className="aspect-video w-full max-h-full bg-black rounded shadow-2xl flex items-center justify-center relative overflow-hidden border border-[#222733]">
            {clip.src ? (
              <video
                ref={videoRef}
                src={clip.src}
                muted={isMuted}
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                    if (outPoint !== null && videoRef.current.currentTime >= outPoint) {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    }
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />
            ) : (
              <div className="text-center p-4">
                <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
                <div className="text-xs font-bold text-white">{clip.name}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Süre: {duration.toFixed(1)}s • {clip.type.toUpperCase()}
                </div>
              </div>
            )}

            {/* In / Out Active Range HUD Badge */}
            {(inPoint !== null || outPoint !== null) && (
              <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/80 border border-amber-500/40 text-[9px] font-mono text-amber-300 flex items-center gap-2">
                <span>IN: {inPoint !== null ? formatTimecode(inPoint, 50) : "--:--:--:--"}</span>
                <span>OUT: {outPoint !== null ? formatTimecode(outPoint, 50) : "--:--:--:--"}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500">
            <Eye className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-amber-400" />
            <div className="text-xs font-semibold text-slate-300">Kaynak Klip Seçilmedi</div>
            <div className="text-[10px] text-slate-500 max-w-[200px] mt-0.5">
              Önizlemek için kütüphanedeki bir öğeye çift tıklayın.
            </div>
          </div>
        )}
      </div>

      {/* 3. Transport Bar & Mark Controls */}
      {clip && (
        <div className="px-3 py-1.5 bg-[#10141d] border-t border-[#222733] flex flex-col gap-1.5 flex-shrink-0">
          {/* Mini Scrubber Track with In/Out Shading */}
          <div
            className="h-3 bg-[#080a0f] rounded relative cursor-pointer group border border-[#1f2638]"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              handleSeek(ratio * duration);
            }}
          >
            {/* Selected In-Out Highlight Region */}
            {inPoint !== null && outPoint !== null && (
              <div
                className="absolute top-0 bottom-0 bg-amber-500/30 border-x border-amber-400"
                style={{
                  left: `${(inPoint / duration) * 100}%`,
                  width: `${((outPoint - inPoint) / duration) * 100}%`,
                }}
              />
            )}
            {/* Playhead Marker */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow group-hover:scale-y-125 transition"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            {/* Left Transport: Step, Play, Mark In, Mark Out */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => stepFrame(-1)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2130] transition"
                title="1 Kare Geri (J / Sol Ok)"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlay}
                className="p-1 rounded text-amber-400 hover:text-amber-300 hover:bg-[#1a2130] transition"
                title={isPlaying ? "Durdur (Space)" : "Oynat (Space)"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>

              <button
                onClick={() => stepFrame(1)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2130] transition"
                title="1 Kare İleri (L / Sağ Ok)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <div className="h-3 w-[1px] bg-[#222733] mx-1" />

              {/* Mark In / Out Buttons */}
              <button
                onClick={setMarkIn}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  inPoint !== null
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-[#141822] text-slate-400 border-[#222733] hover:text-white"
                }`}
                title="Giriş Noktası Belirle (I)"
              >
                [ IN
              </button>

              <button
                onClick={setMarkOut}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  outPoint !== null
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-[#141822] text-slate-400 border-[#222733] hover:text-white"
                }`}
                title="Çıkış Noktası Belirle (O)"
              >
                OUT ]
              </button>

              {(inPoint !== null || outPoint !== null) && (
                <button
                  onClick={clearMarks}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 text-[9px] transition"
                  title="Noktaları Temizle (Alt+X)"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Right Dispatchers: Insert & Overwrite */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onInsertToTimeline?.(inPoint ?? 0, outPoint ?? duration)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 hover:bg-amber-500 text-white shadow transition"
                title="Timeline Playhead Konumuna Ekle (Virgül ,)"
              >
                <Plus className="w-3 h-3" />
                <span>Ekle (,)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
