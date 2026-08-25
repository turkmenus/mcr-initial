"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Grid,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Tv,
  Film,
  Sparkles,
  Monitor,
  SkipBack,
  SkipForward,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TimelineProject,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
  TextClip,
  ImageClip,
} from "@mcr/schema";
import { getActiveTimelineFrame, formatTimecode } from "@mcr/timeline";
import { audioEngine } from "./AudioEngine";
import { TransformHandles } from "./TransformHandles";

interface ProgramMonitorProps {
  project: TimelineProject;
  currentTime: number;
  isPlaying: boolean;
  selectedClip?: TimelineClip | null;
  onUpdateClipTransform?: (clipId: string, partial: { scale?: number; x?: number; y?: number; rotation?: number }) => void;
  onTogglePlay: () => void;
  onSeek?: (time: number) => void;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  onAspectRatioChange?: (ratio: "16:9" | "9:16" | "1:1") => void;
  canvasRefCallback?: (canvas: HTMLCanvasElement | null) => void;
}

export function ProgramMonitor({
  project,
  currentTime,
  isPlaying,
  selectedClip,
  onUpdateClipTransform,
  onTogglePlay,
  onSeek,
  aspectRatio = "16:9",
  onAspectRatioChange,
  canvasRefCallback,
}: ProgramMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportBoxRef = useRef<HTMLDivElement | null>(null);
  const [viewportDims, setViewportDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Pass canvas ref up for client-side draft export
  useEffect(() => {
    if (canvasRefCallback) {
      canvasRefCallback(canvasRef.current);
    }
  }, [canvasRefCallback]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Frame resolution
  const activeFrame = getActiveTimelineFrame(project, currentTime);

  // Sync real video elements
  useEffect(() => {
    activeFrame.videoClips.forEach(({ clip, localTime }) => {
      if (clip.src && (clip.src.startsWith("/") || clip.src.startsWith("blob:") || clip.src.startsWith("http"))) {
        let videoEl = videoElementsRef.current.get(clip.src);
        if (!videoEl) {
          videoEl = document.createElement("video");
          videoEl.src = clip.src;
          videoEl.crossOrigin = "anonymous";
          videoEl.muted = true;
          videoEl.preload = "auto";
          videoElementsRef.current.set(clip.src, videoEl);
        }

        if (Math.abs(videoEl.currentTime - localTime) > 0.15) {
          videoEl.currentTime = localTime;
        }
        if (isPlaying && videoEl.paused) {
          videoEl.play().catch(() => {});
        } else if (!isPlaying && !videoEl.paused) {
          videoEl.pause();
        }
      }
    });

    if (!isPlaying) {
      videoElementsRef.current.forEach((el) => {
        if (!el.paused) el.pause();
      });
    }
  }, [activeFrame, isPlaying]);

  // Sync Audio Engine
  useEffect(() => {
    if (isMuted) {
      audioEngine.setMasterVolume(0);
    } else {
      audioEngine.setMasterVolume(1);
    }
    audioEngine.syncTimelineAudio(project, currentTime, isPlaying);
  }, [project, currentTime, isPlaying, isMuted]);

  // Step 1 Frame
  const handleStepFrame = (deltaFrames: number) => {
    if (!onSeek) return;
    const frameTime = 1 / (project.fps || 50);
    const newTime = Math.max(0, Math.min(project.duration || 60, currentTime + deltaFrames * frameTime));
    onSeek(newTime);
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Clear Frame
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // 2. Render Video Tracks (Bottom to Top)
    const sortedVideos = [...activeFrame.videoClips].reverse();
    if (sortedVideos.length > 0) {
      sortedVideos.forEach(({ clip, localTime }) => {
        drawVideoClip(ctx, clip, localTime, width, height, videoElementsRef.current);
      });
    } else {
      drawTestPattern(ctx, width, height, currentTime);
    }

    // 3. Render Graphics Overlays (OGraf)
    activeFrame.graphicsClips.forEach(({ clip, status, inProgress, outProgress }) => {
      drawOGrafOverlay(ctx, clip, status, inProgress, outProgress, width, height);
    });

    // 4. Render Text Clips
    activeFrame.textClips.forEach(({ clip }) => {
      drawTextClip(ctx, clip, width, height);
    });

    // 5. Draw Broadcast Safe Zones (if enabled)
    if (showSafeZones) {
      drawSafeZones(ctx, width, height);
    }
  }, [activeFrame, currentTime, showSafeZones]);

  // Aspect ratio styling
  const aspectClass =
    aspectRatio === "9:16"
      ? "aspect-[9/16] max-h-[440px]"
      : aspectRatio === "1:1"
      ? "aspect-square max-h-[440px]"
      : "aspect-video w-full";

  // Monitor viewport resize observer
  useEffect(() => {
    if (!viewportBoxRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(viewportBoxRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-[#0b0e14] border border-[#1e2538] rounded-lg overflow-hidden select-none shadow-lg h-full"
    >
      {/* 1. Header Toolbar */}
      <div className="h-8 px-3 bg-[#121722] border-b border-[#1e2538] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            PROGRAM MONİTÖRÜ (MASTER)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-sky-400 border border-sky-500/30">
            {formatTimecode(currentTime, project.fps || 50)}
          </span>
        </div>

        {/* Aspect Ratio Switcher & Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[#0b0e14] p-0.5 rounded border border-[#1e2538]">
            {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => onAspectRatioChange?.(ratio)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
                  aspectRatio === ratio
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSafeZones(!showSafeZones)}
            className={`p-1 rounded text-[10px] flex items-center gap-1 transition ${
              showSafeZones
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Safe Title / Safe Action Kılavuzları"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1 rounded transition ${
              isMuted ? "text-rose-400" : "text-slate-400 hover:text-slate-200"
            }`}
            title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition"
            title="Tam Ekran Monitör"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Monitor Display Surface */}
      <div className="flex-1 bg-[#05070a] flex items-center justify-center p-2 relative overflow-hidden">
        <div
          ref={viewportBoxRef}
          className={`relative max-w-full max-h-full flex items-center justify-center shadow-2xl bg-black rounded overflow-hidden ${aspectClass}`}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onTogglePlay}
          />

          {/* OpenCut Interactive Direct Transform Handles Overlay */}
          {selectedClip && onUpdateClipTransform && viewportDims.width > 0 && (
            <TransformHandles
              clip={selectedClip}
              canvasWidth={1920}
              canvasHeight={1080}
              containerWidth={viewportDims.width}
              containerHeight={viewportDims.height}
              onUpdateTransform={onUpdateClipTransform}
            />
          )}
        </div>
      </div>

      {/* 3. Transport Bar Controls */}
      <div className="h-8 px-3 bg-[#10141d] border-t border-[#1e2538] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleStepFrame(-1)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2130] transition"
            title="1 Kare Geri (Sol Ok)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-1 rounded text-sky-400 hover:text-sky-300 hover:bg-[#1a2130] transition"
            title={isPlaying ? "Durdur (Space)" : "Oynat (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={() => handleStepFrame(1)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2130] transition"
            title="1 Kare İleri (Sağ Ok)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">
            {formatTimecode(currentTime, project.fps || 50)} / {formatTimecode(project.duration || 60, project.fps || 50)}
          </span>
          <span className="text-[9px] font-mono text-emerald-400 px-1 py-0.2 rounded bg-emerald-950/40 border border-emerald-500/30">
            50 FPS
          </span>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Canvas Drawing Helper Functions
// -------------------------------------------------------------

function drawVideoClip(
  ctx: CanvasRenderingContext2D,
  clip: VideoClip,
  localTime: number,
  width: number,
  height: number,
  videoCache: Map<string, HTMLVideoElement>
) {
  ctx.save();

  const scale = clip.scale ?? 1;
  const x = clip.x ?? 0;
  const y = clip.y ?? 0;
  const rotation = (clip.rotation ?? 0) * (Math.PI / 180);
  const opacity = clip.opacity ?? 1;

  ctx.globalAlpha = opacity;
  ctx.translate(width / 2 + x, height / 2 + y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  // Filters & Color Grading
  const filters: string[] = [];
  if (clip.brightness && clip.brightness !== 100) filters.push(`brightness(${clip.brightness}%)`);
  if (clip.contrast && clip.contrast !== 100) filters.push(`contrast(${clip.contrast}%)`);
  if (clip.saturation && clip.saturation !== 100) filters.push(`saturate(${clip.saturation}%)`);
  if (clip.blur && clip.blur > 0) filters.push(`blur(${clip.blur}px)`);

  if (filters.length > 0) ctx.filter = filters.join(" ");

  const videoEl = videoCache.get(clip.src);
  if (videoEl && videoEl.readyState >= 2) {
    ctx.drawImage(videoEl, -width / 2, -height / 2, width, height);
  } else {
    // High-definition backdrop
    const grad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    grad.addColorStop(0, "#090d16");
    grad.addColorStop(0.5, "#0f172a");
    grad.addColorStop(1, "#0284c7");
    ctx.fillStyle = grad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(clip.name || "Video Klip", 0, -10);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Kare Süresi: ${localTime.toFixed(2)}s`, 0, 25);
  }

  ctx.restore();
}

function drawTestPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  // SMPTE Color Bars
  const colors = ["#FFFFFF", "#EAB308", "#06B6D4", "#22C55E", "#EC4899", "#EF4444", "#3B82F6"];
  const barW = width / colors.length;
  colors.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.fillRect(idx * barW, 0, barW, height * 0.7);
  });

  // Lower Section
  ctx.fillStyle = "#0B0E14";
  ctx.fillRect(0, height * 0.7, width, height * 0.3);

  // Timecode Box
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(width * 0.35, height * 0.76, width * 0.3, 60);
  ctx.strokeStyle = "#38BDF8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(width * 0.35, height * 0.76, width * 0.3, 60);

  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 32px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatTimecode(time, 50), width * 0.5, height * 0.76 + 30);
}

function drawOGrafOverlay(
  ctx: CanvasRenderingContext2D,
  clip: GraphicsOverlayClip,
  status: "IN" | "SHOWING" | "OUT",
  inProgress: number,
  outProgress: number,
  width: number,
  height: number
) {
  ctx.save();

  let alpha = 1.0;
  let translateX = 0;
  let translateY = 0;

  if (status === "IN") {
    alpha = Math.min(1, inProgress * 1.5);
    translateX = (1 - inProgress) * -60;
  } else if (status === "OUT") {
    alpha = Math.max(0, 1 - outProgress * 1.5);
    translateX = outProgress * -60;
  }

  ctx.globalAlpha = alpha;
  ctx.translate(translateX, translateY);

  const title = clip.data?.title || clip.name || "Haber Konuğu";
  const subtitle = clip.data?.subtitle || "Açıklama / Ünvan";
  const category = clip.data?.category || "HABER";
  const accent = clip.data?.accent || "#C8102E";

  const posX = width * 0.08;
  const posY = height * 0.8;

  // Category Tag
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(posX, posY - 32, 120, 32, [4, 4, 0, 0]);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(category.toUpperCase(), posX + 12, posY - 16);

  // Main Banner
  ctx.fillStyle = "rgba(11, 14, 20, 0.95)";
  ctx.beginPath();
  ctx.roundRect(posX, posY, 580, 84, [0, 6, 6, 6]);
  ctx.fill();

  // Accent Left Stripe
  ctx.fillStyle = accent;
  ctx.fillRect(posX, posY, 6, 84);

  // Title Text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(title, posX + 22, posY + 32);

  // Subtitle Text
  ctx.fillStyle = "#94A3B8";
  ctx.font = "18px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(subtitle, posX + 22, posY + 62);

  ctx.restore();
}

function drawTextClip(
  ctx: CanvasRenderingContext2D,
  clip: TextClip,
  width: number,
  height: number
) {
  ctx.save();

  const fontSize = clip.fontSize ?? 48;
  const textColor = clip.textColor ?? "#FFFFFF";
  const bgColor = clip.backgroundColor;
  const textAlign = clip.textAlign ?? "center";

  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "middle";

  const posX = textAlign === "left" ? width * 0.1 : textAlign === "right" ? width * 0.9 : width / 2;
  const posY = height / 2;

  const textMetrics = ctx.measureText(clip.text);
  const textWidth = textMetrics.width;

  if (bgColor && bgColor !== "transparent") {
    ctx.fillStyle = bgColor;
    const padding = 16;
    const rectX =
      textAlign === "left"
        ? posX - padding
        : textAlign === "right"
        ? posX - textWidth - padding
        : posX - textWidth / 2 - padding;
    ctx.fillRect(rectX, posY - fontSize / 2 - padding, textWidth + padding * 2, fontSize + padding * 2);
  }

  ctx.fillStyle = textColor;
  ctx.fillText(clip.text, posX, posY);

  ctx.restore();
}

function drawSafeZones(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.lineWidth = 1;

  // 1. Action Safe (90%)
  ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
  ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);

  // 2. Title Safe (80%)
  ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
  ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

  // 3. Center Crosshair
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  const cx = width / 2;
  const cy = height / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy);
  ctx.lineTo(cx + 15, cy);
  ctx.moveTo(cx, cy - 15);
  ctx.lineTo(cx, cy + 15);
  ctx.stroke();

  ctx.restore();
}
