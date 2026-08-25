"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  buildWaveformSampleBuckets,
  sampleWaveformRange,
  SourceWaveformSummary,
} from "@mcr/timeline";

// Global in-memory cache for decoded audio summaries to prevent re-decoding
const waveformCache = new Map<string, SourceWaveformSummary>();
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  return sharedAudioCtx;
}

interface AudioWaveformCanvasProps {
  src: string;
  clipStart: number;
  clipDuration: number;
  clipOffset?: number;
  pixelsPerSecond?: number;
  color?: string;
  burnColor?: string;
  className?: string;
}

export function AudioWaveformCanvas({
  src,
  clipStart,
  clipDuration,
  clipOffset = 0,
  pixelsPerSecond = 36,
  color = "rgba(255, 255, 255, 0.75)",
  burnColor = "rgba(245, 158, 11, 0.9)",
  className = "",
}: AudioWaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<SourceWaveformSummary | null>(() => {
    return waveformCache.get(src) || null;
  });

  // Decode audio data when src changes
  useEffect(() => {
    if (!src) return;

    const cached = waveformCache.get(src);
    if (cached) {
      setSummary(cached);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const decodeAudio = async () => {
      try {
        const audioCtx = getSharedAudioContext();
        if (!audioCtx) return;

        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (isCancelled) return;

        const channelData = decodedBuffer.getChannelData(0);
        const computedSummary = buildWaveformSampleBuckets(
          channelData,
          decodedBuffer.sampleRate,
          1000
        );

        waveformCache.set(src, computedSummary);
        setSummary(computedSummary);
        setIsLoading(false);
      } catch (err) {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    decodeAudio();

    return () => {
      isCancelled = true;
    };
  }, [src]);

  // Render waveform bars onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !summary) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = Math.max(10, Math.floor(clipDuration * pixelsPerSecond));
    const height = canvas.clientHeight || 28;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const sampled = sampleWaveformRange(summary, clipOffset, clipDuration, width / 2);
    const numBars = sampled.peaks.length;
    const centerY = height / 2;

    for (let i = 0; i < numBars; i++) {
      const peak = sampled.peaks[i] || 0;
      const rms = sampled.rms[i] || 0;
      const x = i * 2;

      // Peak amplitude bar height (mirrored center)
      const barHeight = Math.max(2, peak * (height * 0.88));
      const topY = centerY - barHeight / 2;

      // Draw Peak bar
      ctx.fillStyle = peak > 0.95 ? burnColor : color;
      ctx.fillRect(x, topY, 1.2, barHeight);

      // Draw RMS dense inner core
      if (rms > 0.05) {
        const rmsHeight = Math.max(1, rms * (height * 0.5));
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(x, centerY - rmsHeight / 2, 1.2, rmsHeight);
      }
    }
  }, [summary, clipOffset, clipDuration, pixelsPerSecond, color, burnColor]);

  return (
    <div className={`w-full h-full flex items-center overflow-hidden pointer-events-none ${className}`}>
      {isLoading && !summary && (
        <div className="w-full h-1 bg-white/20 animate-pulse rounded" />
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover opacity-85"
      />
    </div>
  );
}
