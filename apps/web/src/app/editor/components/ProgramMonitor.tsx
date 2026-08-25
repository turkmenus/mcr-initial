"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface ProgramMonitorProps {
  project: TimelineProject;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  onAspectRatioChange?: (ratio: "16:9" | "9:16" | "1:1") => void;
  canvasRefCallback?: (canvas: HTMLCanvasElement | null) => void;
}

export function ProgramMonitor({
  project,
  currentTime,
  isPlaying,
  onTogglePlay,
  aspectRatio = "16:9",
  onAspectRatioChange,
  canvasRefCallback,
}: ProgramMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
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
  }, [activeFrame.videoClips, isPlaying, currentTime]);

  // Canvas Compositing Loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 1920;
    const height = 1080;

    // 1. Clear & Background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#070B14";
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Video Layers
    if (activeFrame.videoClips.length > 0) {
      activeFrame.videoClips.forEach(({ clip, localTime }) => {
        ctx.save();

        const scale = clip.scale ?? 1.0;
        const posX = clip.x ?? 0;
        const posY = clip.y ?? 0;
        const rot = ((clip.rotation ?? 0) * Math.PI) / 180;
        const opacity = clip.opacity ?? 1.0;

        ctx.globalAlpha = opacity;
        ctx.translate(width / 2 + posX, height / 2 + posY);
        ctx.rotate(rot);
        ctx.scale(scale, scale);

        // Apply Color Grading Filters
        const brightness = clip.brightness ?? 1.0;
        const contrast = clip.contrast ?? 1.0;
        const saturation = clip.saturation ?? 1.0;
        const blur = clip.blur ?? 0;
        ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${blur}px)`;

        const videoEl = videoElementsRef.current.get(clip.src);
        if (videoEl && videoEl.readyState >= 2) {
          // Draw real HTML5 video frame
          ctx.drawImage(videoEl, -width / 2, -height / 2, width, height);
        } else {
          // Draw High Quality Synthetic Broadcast Footage
          drawSyntheticVideoFrame(ctx, clip, localTime, width, height);
        }

        ctx.restore();
      });
    } else {
      // Broadcast SMPTE Color Bars / No Signal Test Pattern
      drawTestPattern(ctx, width, height, currentTime);
    }

    // 3. Draw Image Layers
    activeFrame.imageClips.forEach(({ clip }) => {
      ctx.save();
      const scale = clip.scale ?? 1.0;
      const posX = clip.x ?? 0;
      const posY = clip.y ?? 0;
      const rot = ((clip.rotation ?? 0) * Math.PI) / 180;
      const opacity = clip.opacity ?? 1.0;

      ctx.globalAlpha = opacity;
      ctx.translate(width / 2 + posX, height / 2 + posY);
      ctx.rotate(rot);
      ctx.scale(scale, scale);

      let img = imagesRef.current.get(clip.src);
      if (!img) {
        img = new Image();
        img.src = clip.src;
        imagesRef.current.set(clip.src, img);
      }
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      }
      ctx.restore();
    });

    // 4. Draw Text / Title Layers
    activeFrame.textClips.forEach(({ clip, status, inProgress, outProgress }) => {
      ctx.save();
      let alpha = 1.0;
      let translateY = 0;

      if (status === "IN") {
        alpha = inProgress;
        translateY = (1 - inProgress) * 30;
      } else if (status === "OUT") {
        alpha = 1 - outProgress;
        translateY = outProgress * 30;
      }

      ctx.globalAlpha = alpha;
      const fontSize = clip.fontSize ?? 48;
      const fontFamily = clip.fontFamily ?? "sans-serif";
      const fontWeight = clip.fontWeight ?? "bold";

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = clip.textAlign ?? "center";
      ctx.textBaseline = "middle";

      const textX = width / 2 + (clip.x ?? 0);
      const textY = height / 2 + (clip.y ?? 0) + translateY;

      // Background box
      const metrics = ctx.measureText(clip.text || "Haber");
      const paddingX = 24;
      const paddingY = 16;
      const boxW = metrics.width + paddingX * 2;
      const boxH = fontSize + paddingY * 2;

      ctx.fillStyle = clip.backgroundColor ?? "rgba(10, 15, 29, 0.85)";
      let boxX = textX - boxW / 2;
      if (clip.textAlign === "left") boxX = textX - paddingX;
      if (clip.textAlign === "right") boxX = textX - boxW + paddingX;

      ctx.beginPath();
      ctx.roundRect(boxX, textY - boxH / 2, boxW, boxH, 8);
      ctx.fill();

      // Text Shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      // Text Content
      ctx.fillStyle = clip.textColor ?? "#FFFFFF";
      ctx.fillText(clip.text || "", textX, textY);

      ctx.restore();
    });

    // 5. Draw OGraf Broadcast Graphics Overlays
    activeFrame.graphicsClips.forEach(({ clip, status, inProgress, outProgress }) => {
      drawOGrafOverlay(ctx, clip, status, inProgress, outProgress, width, height);
    });

    // 6. Draw Safe Zones & Crosshair
    if (showSafeZones) {
      drawSafeZones(ctx, width, height);
    }
  }, [activeFrame, currentTime, showSafeZones]);

  // Request Animation Frame Render
  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-2xl ${
        isFullscreen ? "p-0 rounded-none w-screen h-screen" : "p-4"
      }`}
    >
      {/* Monitor Header Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-border/80 text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Tv className="w-4 h-4 text-sky-400" />
            <span>PROGRAM MONİTÖRÜ</span>
          </div>
          <Badge variant="info" className="font-mono text-[11px] px-2 py-0.5">
            1920x1080 @ 50fps EDL
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Safe Zones Toggle */}
          <Button
            variant={showSafeZones ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowSafeZones(!showSafeZones)}
            className="h-7 text-xs font-semibold gap-1"
            title="Güvenli Alanlar (Safe Zones 80/90%)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Kılavuzlar</span>
          </Button>

          {/* Aspect Ratio Switcher */}
          {onAspectRatioChange && (
            <div className="flex items-center rounded-lg bg-secondary/80 p-0.5 border border-border text-[11px] font-bold">
              <button
                onClick={() => onAspectRatioChange("16:9")}
                className={`px-2 py-0.5 rounded ${
                  aspectRatio === "16:9" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-white"
                }`}
              >
                16:9
              </button>
              <button
                onClick={() => onAspectRatioChange("9:16")}
                className={`px-2 py-0.5 rounded ${
                  aspectRatio === "9:16" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-white"
                }`}
              >
                9:16
              </button>
              <button
                onClick={() => onAspectRatioChange("1:1")}
                className={`px-2 py-0.5 rounded ${
                  aspectRatio === "1:1" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-white"
                }`}
              >
                1:1
              </button>
            </div>
          )}

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-7 w-7 text-muted-foreground hover:text-white"
            title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-3 bg-black/90 min-h-[360px] max-h-[560px]">
        <div
          className={`relative max-w-full max-h-full rounded-xl overflow-hidden shadow-2xl border border-border/60 bg-black flex items-center justify-center ${
            aspectRatio === "16:9" ? "aspect-video" : aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-square"
          }`}
          style={{ width: aspectRatio === "16:9" ? "100%" : aspectRatio === "9:16" ? "42%" : "65%" }}
          onClick={onTogglePlay}
        >
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Play/Pause Center Indicator Overlay on Hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-black/80 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-2xl">
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
            </div>
          </div>

          {/* Live On-Screen Timecode Corner Watermark */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur border border-white/10 font-mono text-xs font-bold text-sky-400 shadow pointer-events-none">
            {formatTimecode(currentTime, 50)}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SYNTHETIC VIDEO & GRAPHICS RENDERERS ---

function drawSyntheticVideoFrame(
  ctx: CanvasRenderingContext2D,
  clip: VideoClip,
  localTime: number,
  width: number,
  height: number
) {
  const t = localTime;

  if (clip.src.includes("studio") || clip.name.toLowerCase().includes("studio") || clip.name.toLowerCase().includes("haber")) {
    // 1. Studio News Anchor Background Simulation
    const grad = ctx.createRadialGradient(
      width * 0.5 + Math.sin(t * 0.4) * 100,
      height * 0.4,
      50,
      width * 0.5,
      height * 0.5,
      width * 0.7
    );
    grad.addColorStop(0, "#1E3A8A");
    grad.addColorStop(0.5, "#0F172A");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Studio Grid floor
    ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
    ctx.lineWidth = 2;
    for (let x = -width / 2; x <= width / 2; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x * 2.2, height / 2);
      ctx.stroke();
    }

    // Anchor Silhouette & Desk
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.beginPath();
    ctx.ellipse(0, height / 2 - 40, width * 0.45, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    // Studio Video Wall Animation
    const wallX = -width * 0.35;
    const wallY = -height * 0.32;
    const wallW = width * 0.7;
    const wallH = height * 0.45;
    ctx.fillStyle = "rgba(2, 6, 23, 0.9)";
    ctx.fillRect(wallX, wallY, wallW, wallH);
    ctx.strokeStyle = "#0284C7";
    ctx.lineWidth = 3;
    ctx.strokeRect(wallX, wallY, wallW, wallH);

    // World Map Dots on Video Wall
    ctx.fillStyle = "#38BDF8";
    for (let i = 0; i < 30; i++) {
      const dotX = wallX + 40 + ((i * 37 + t * 40) % (wallW - 80));
      const dotY = wallY + 40 + ((i * 23) % (wallH - 80));
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Anchor Header
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MCR HABER MERKEZİ • CANLI YAYIN", 0, -height * 0.18);
  } else if (clip.src.includes("city") || clip.name.toLowerCase().includes("broll")) {
    // 2. Cityscape / B-Roll Simulation
    const grad = ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    grad.addColorStop(0, "#0F172A");
    grad.addColorStop(0.6, "#1E293B");
    grad.addColorStop(1, "#090D16");
    ctx.fillStyle = grad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // City Skyline Buildings
    ctx.fillStyle = "#020617";
    const bCount = 14;
    for (let i = 0; i < bCount; i++) {
      const bW = width / bCount;
      const bH = 200 + ((i * 83) % 320);
      const bX = -width / 2 + i * bW;
      const bY = height / 2 - bH;
      ctx.fillRect(bX, bY, bW - 4, bH);

      // Windows with light flicker
      ctx.fillStyle = ((i + Math.floor(t * 2)) % 3 === 0) ? "#FDE047" : "rgba(255,255,255,0.2)";
      for (let wy = bY + 20; wy < height / 2 - 20; wy += 25) {
        ctx.fillRect(bX + 15, wy, 8, 12);
        ctx.fillRect(bX + 35, wy, 8, 12);
      }
      ctx.fillStyle = "#020617";
    }

    // Traffic light streaks (Long exposure effect)
    ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
    ctx.fillRect(-width / 2, height / 2 - 30, width, 4);
    ctx.fillStyle = "rgba(254, 240, 138, 0.9)";
    ctx.fillRect(-width / 2, height / 2 - 18, width, 4);
  } else if (clip.src.includes("breaking") || clip.name.toLowerCase().includes("stinger")) {
    // 3. High Energy Breaking News Background
    const grad = ctx.createRadialGradient(0, 0, 100, 0, 0, width * 0.7);
    grad.addColorStop(0, "#DC2626");
    grad.addColorStop(0.5, "#991B1B");
    grad.addColorStop(1, "#450A0A");
    ctx.fillStyle = grad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Dynamic rotating rays
    ctx.save();
    ctx.rotate(t * 0.5);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 8;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * width, Math.sin(a) * width);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SON DAKİKA", 0, 10);
  } else {
    // Default Clean Broadcast Gradient with Media Name
    const grad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
    grad.addColorStop(0, "#0F172A");
    grad.addColorStop(1, "#1E293B");
    ctx.fillStyle = grad;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(clip.name || "Video Klip", 0, -20);
    ctx.font = "mono 20px sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(`Kare Süresi: ${localTime.toFixed(2)}s`, 0, 25);
  }
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
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, height * 0.7, width, height * 0.3);

  // Timecode Box
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(width * 0.35, height * 0.75, width * 0.3, 70);
  ctx.strokeStyle = "#38BDF8";
  ctx.lineWidth = 2;
  ctx.strokeRect(width * 0.35, height * 0.75, width * 0.3, 70);

  ctx.fillStyle = "#38BDF8";
  ctx.font = "bold 36px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatTimecode(time, 50), width * 0.5, height * 0.75 + 35);
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
  const posY = height * 0.78;

  // Badge
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(posX, posY - 36, 140, 36, [6, 6, 0, 0]);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 16px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(category.toUpperCase(), posX + 16, posY - 18);

  // Main Box
  ctx.fillStyle = "rgba(10, 15, 29, 0.95)";
  ctx.beginPath();
  ctx.roundRect(posX, posY, 640, 96, [0, 8, 8, 8]);
  ctx.fill();

  // Accent Left Stripe
  ctx.fillStyle = accent;
  ctx.fillRect(posX, posY, 8, 96);

  // Title Text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 32px sans-serif";
  ctx.fillText(title, posX + 28, posY + 36);

  // Subtitle Text
  ctx.fillStyle = "#94A3B8";
  ctx.font = "500 20px sans-serif";
  ctx.fillText(subtitle, posX + 28, posY + 70);

  ctx.restore();
}

function drawSafeZones(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.lineWidth = 1.5;

  // 1. Action Safe (90%)
  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);

  // 2. Title Safe (80%)
  ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
  ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

  // 3. Center Crosshair
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  const cx = width / 2;
  const cy = height / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy);
  ctx.lineTo(cx + 20, cy);
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx, cy + 20);
  ctx.stroke();

  ctx.restore();
}
