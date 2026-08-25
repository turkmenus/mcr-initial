"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Scissors,
  Copy,
  Trash2,
  Magnet,
  BookmarkPlus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Plus,
  Tv,
  Film,
  Music,
  Type,
  MousePointer,
  Sparkles,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  TimelineProject,
  Track,
  TimelineClip,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
  TextClip,
  ImageClip,
  Marker,
} from "@mcr/schema";
import { formatTimecode } from "@mcr/timeline";

interface InteractiveTimelineProps {
  project: TimelineProject;
  currentTime: number;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (time: number) => void;
  onMoveClip: (clipId: string, newStart: number, targetTrackId?: string) => void;
  onTrimClip: (clipId: string, newStart: number, newDuration: number, newOffset?: number) => void;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onAddTrack: (type: "video" | "audio" | "graphics" | "text") => void;
  onRemoveTrack: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackVisible: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onAddMarker: (time: number, label?: string) => void;
  onRemoveMarker: (markerId: string) => void;
}

type DragMode = "MOVE" | "TRIM_LEFT" | "TRIM_RIGHT" | null;

export function InteractiveTimeline({
  project,
  currentTime,
  selectedClipId,
  onSelectClip,
  onSeek,
  onMoveClip,
  onTrimClip,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onAddTrack,
  onRemoveTrack,
  onToggleTrackMute,
  onToggleTrackVisible,
  onToggleTrackLock,
  onAddMarker,
  onRemoveMarker,
}: InteractiveTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(30); // pixels per second
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<"select" | "razor">("select");

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);

  // Dragging State
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialClipStart, setInitialClipStart] = useState(0);
  const [initialClipDuration, setInitialClipDuration] = useState(0);
  const [initialClipOffset, setInitialClipOffset] = useState(0);
  const [currentDragStart, setCurrentDragStart] = useState<number | null>(null);
  const [currentDragDuration, setCurrentDragDuration] = useState<number | null>(null);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);

  const duration = project.duration || 60;
  const timelineWidth = Math.max(1200, duration * zoomLevel);

  // Snap Points
  const getSnapPoints = useCallback(
    (excludeClipId?: string): number[] => {
      if (!isSnappingEnabled) return [];
      const points = new Set<number>([0, currentTime]);
      project.tracks.forEach((t) => {
        t.clips.forEach((c) => {
          if (c.id !== excludeClipId) {
            points.add(c.start);
            points.add(c.start + c.duration);
          }
        });
      });
      return Array.from(points);
    },
    [project, currentTime, isSnappingEnabled]
  );

  const snapToPoints = useCallback(
    (time: number, snapPoints: number[], thresholdPx = 8): number => {
      if (!isSnappingEnabled) return Math.max(0, time);
      const thresholdTime = thresholdPx / zoomLevel;
      let closest = time;
      let minDiff = thresholdTime;

      for (const p of snapPoints) {
        const diff = Math.abs(time - p);
        if (diff < minDiff) {
          minDiff = diff;
          closest = p;
        }
      }
      return Math.max(0, closest);
    },
    [zoomLevel, isSnappingEnabled]
  );

  // Ruler Scrubbing
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbingRuler(true);
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, clickX / zoomLevel));
    onSeek(time);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbingRuler && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const time = Math.max(0, Math.min(duration, clickX / zoomLevel));
        onSeek(time);
      }

      if (draggingClipId && dragMode) {
        const deltaX = e.clientX - dragStartX;
        const deltaTime = deltaX / zoomLevel;
        const snapPoints = getSnapPoints(draggingClipId);

        if (dragMode === "MOVE") {
          const rawNewStart = initialClipStart + deltaTime;
          const snappedStart = snapToPoints(rawNewStart, snapPoints);
          setCurrentDragStart(snappedStart);
        } else if (dragMode === "TRIM_LEFT") {
          const rawNewStart = Math.min(
            initialClipStart + initialClipDuration - 0.2,
            initialClipStart + deltaTime
          );
          const snappedStart = snapToPoints(rawNewStart, snapPoints);
          const newDur = initialClipDuration - (snappedStart - initialClipStart);
          setCurrentDragStart(snappedStart);
          setCurrentDragDuration(Math.max(0.2, newDur));
        } else if (dragMode === "TRIM_RIGHT") {
          const rawNewEnd = initialClipStart + initialClipDuration + deltaTime;
          const snappedEnd = snapToPoints(rawNewEnd, snapPoints);
          const newDur = Math.max(0.2, snappedEnd - initialClipStart);
          setCurrentDragDuration(newDur);
        }
      }
    };

    const handleMouseUp = () => {
      if (isScrubbingRuler) setIsScrubbingRuler(false);

      if (draggingClipId && dragMode) {
        if (dragMode === "MOVE" && currentDragStart !== null) {
          onMoveClip(draggingClipId, currentDragStart);
        } else if (dragMode === "TRIM_LEFT" && currentDragStart !== null && currentDragDuration !== null) {
          const deltaOffset = currentDragStart - initialClipStart;
          onTrimClip(draggingClipId, currentDragStart, currentDragDuration, initialClipOffset + deltaOffset);
        } else if (dragMode === "TRIM_RIGHT" && currentDragDuration !== null) {
          onTrimClip(draggingClipId, initialClipStart, currentDragDuration, initialClipOffset);
        }
      }

      setDraggingClipId(null);
      setDragMode(null);
      setCurrentDragStart(null);
      setCurrentDragDuration(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isScrubbingRuler,
    draggingClipId,
    dragMode,
    dragStartX,
    initialClipStart,
    initialClipDuration,
    initialClipOffset,
    currentDragStart,
    currentDragDuration,
    zoomLevel,
    duration,
    getSnapPoints,
    snapToPoints,
    onSeek,
    onMoveClip,
    onTrimClip,
  ]);

  // Clip Interaction Initiator
  const startClipDrag = (
    e: React.MouseEvent,
    clip: TimelineClip,
    mode: DragMode
  ) => {
    e.stopPropagation();

    if (activeTool === "razor") {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const splitTime = clip.start + clickX / zoomLevel;
      onSplitClip(clip.id, splitTime);
      return;
    }

    onSelectClip(clip.id);
    setDraggingClipId(clip.id);
    setDragMode(mode);
    setDragStartX(e.clientX);
    setInitialClipStart(clip.start);
    setInitialClipDuration(clip.duration);
    setInitialClipOffset(clip.offset ?? 0);
    setCurrentDragStart(clip.start);
    setCurrentDragDuration(clip.duration);
  };

  const selectedClip = project.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14] border border-[#1e2538] rounded-lg overflow-hidden select-none shadow-xl">
      {/* Timeline Toolbar */}
      <div className="h-9 px-3 bg-[#121722] border-b border-[#1e2538] flex items-center justify-between">
        {/* Left Tools */}
        <div className="flex items-center gap-1.5">
          {/* Tool Modes */}
          <div className="flex items-center bg-[#0b0e14] p-0.5 rounded border border-[#1e2538]">
            <button
              onClick={() => setActiveTool("select")}
              className={`p-1 px-2 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                activeTool === "select"
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Seçim Aracı (V)"
            >
              <MousePointer className="w-3 h-3" />
              <span>Seç (V)</span>
            </button>
            <button
              onClick={() => setActiveTool("razor")}
              className={`p-1 px-2 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                activeTool === "razor"
                  ? "bg-sky-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Kesme / Razor Aracı (C)"
            >
              <Scissors className="w-3 h-3" />
              <span>Kes (C)</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#1e2538]" />

          {/* Quick Actions */}
          <button
            onClick={() => selectedClipId && onSplitClip(selectedClipId, currentTime)}
            disabled={!selectedClipId}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1e2538] disabled:opacity-30 transition"
            title="Playhead Konumunda Böl (Ctrl+K)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1e2538] disabled:opacity-30 transition"
            title="Klibi Çoğalt (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-[#1e2538] disabled:opacity-30 transition"
            title="Seçili Klibi Sil (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onAddMarker(currentTime)}
            className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-[#1e2538] transition"
            title="Marker Ekle (M)"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-[#1e2538]" />

          {/* Snapping Toggle */}
          <button
            onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
            className={`p-1 px-2 rounded text-[11px] font-semibold flex items-center gap-1 border transition ${
              isSnappingEnabled
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"
            }`}
            title="Manyetik Yapışma (S)"
          >
            <Magnet className="w-3 h-3" />
            <span>Snap (S)</span>
          </button>
        </div>

        {/* Right Tools: Zoom & Track Adders */}
        <div className="flex items-center gap-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={() => setZoomLevel((z) => Math.max(10, z - 5))}
              className="p-1 hover:text-slate-200 transition"
              title="Uzaklaş (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="w-20">
              <Slider
                value={[zoomLevel]}
                min={10}
                max={100}
                step={2}
                onValueChange={(val) => setZoomLevel(val[0])}
              />
            </div>
            <button
              onClick={() => setZoomLevel((z) => Math.min(100, z + 5))}
              className="p-1 hover:text-slate-200 transition"
              title="Yakınlaş (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#1e2538]" />

          {/* Add Track */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddTrack("video")}
              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#161b24] hover:bg-[#1e2538] text-sky-400 border border-[#262d3d] transition"
            >
              + Video
            </button>
            <button
              onClick={() => onAddTrack("audio")}
              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#161b24] hover:bg-[#1e2538] text-emerald-400 border border-[#262d3d] transition"
            >
              + Audio
            </button>
            <button
              onClick={() => onAddTrack("graphics")}
              className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#161b24] hover:bg-[#1e2538] text-rose-400 border border-[#262d3d] transition"
            >
              + OGraf
            </button>
          </div>
        </div>
      </div>

      {/* Main Track & Timeline Area */}
      <div
        ref={timelineContainerRef}
        className="flex-1 flex overflow-x-auto overflow-y-auto relative bg-[#090c12]"
        onClick={() => onSelectClip(null)}
      >
        {/* Left Fixed Track Headers */}
        <div className="w-44 flex-shrink-0 sticky left-0 z-30 bg-[#0e1217] border-r border-[#1e2538] shadow-md flex flex-col">
          {/* Empty Header corner aligned with ruler */}
          <div className="h-7 bg-[#121722] border-b border-[#1e2538] flex items-center px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Kanallar
          </div>

          {/* Track Headers List */}
          <div className="flex-1 flex flex-col">
            {project.tracks.map((track) => {
              const isVideo = track.type === "video";
              const isAudio = track.type === "audio";
              const isGraphics = track.type === "graphics";
              const isText = track.type === "text";

              return (
                <div
                  key={track.id}
                  className="h-14 px-2 border-b border-[#1e2538] flex items-center justify-between bg-[#0e1217] hover:bg-[#131822] transition"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: isGraphics
                          ? "rgba(244,63,94,0.15)"
                          : isText
                          ? "rgba(245,158,11,0.15)"
                          : isVideo
                          ? "rgba(56,189,248,0.15)"
                          : "rgba(52,211,153,0.15)",
                        color: isGraphics
                          ? "#F43F5E"
                          : isText
                          ? "#F59E0B"
                          : isVideo
                          ? "#38BDF8"
                          : "#34D399",
                      }}
                    >
                      {track.name.slice(0, 2)}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 truncate">
                      {track.name}
                    </span>
                  </div>

                  {/* Track Controls */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTrackVisible(track.id);
                      }}
                      className={`p-1 rounded text-[10px] transition ${
                        track.visible ? "text-slate-400 hover:text-slate-200" : "text-rose-400"
                      }`}
                      title={track.visible ? "Kanalı Gizle" : "Kanalı Göster"}
                    >
                      {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    {isAudio && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTrackMute(track.id);
                        }}
                        className={`p-1 rounded text-[10px] transition ${
                          track.muted ? "text-rose-400" : "text-slate-400 hover:text-slate-200"
                        }`}
                        title={track.muted ? "Sesi Aç" : "Kanalı Sustur (Mute)"}
                      >
                        {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTrackLock(track.id);
                      }}
                      className={`p-1 rounded text-[10px] transition ${
                        track.locked ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                      }`}
                      title={track.locked ? "Kilidi Aç" : "Kanalı Kilitle"}
                    >
                      {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scrollable Timeline Canvas */}
        <div
          className="flex-1 flex flex-col relative"
          style={{ width: `${timelineWidth}px` }}
        >
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-7 bg-[#121722] border-b border-[#1e2538] sticky top-0 z-20 cursor-ew-resize select-none flex items-end overflow-hidden"
          >
            {renderRulerTicks(duration, zoomLevel)}

            {/* Markers */}
            {(project.markers || []).map((m) => (
              <div
                key={m.id}
                style={{ left: `${m.time * zoomLevel}px` }}
                className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-auto cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(m.time);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onRemoveMarker(m.id);
                }}
                title={`${m.label || "Marker"} (${m.time.toFixed(2)}s) — Çift tıkla sil`}
              >
                <div
                  className="w-2.5 h-2.5 rotate-45 rounded-sm shadow-sm"
                  style={{ backgroundColor: m.color || "#F59E0B" }}
                />
              </div>
            ))}
          </div>

          {/* Tracks Lanes Container */}
          <div className="flex-1 flex flex-col relative">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 border-b border-[#1e2538]/60 relative bg-[#090c12] hover:bg-[#0d1017] transition"
              >
                {/* Clips in this track */}
                {track.clips.map((clip) => {
                  const isSelected = clip.id === selectedClipId;
                  const isDragging = clip.id === draggingClipId;

                  const displayStart =
                    isDragging && currentDragStart !== null ? currentDragStart : clip.start;
                  const displayDuration =
                    isDragging && currentDragDuration !== null
                      ? currentDragDuration
                      : clip.duration;

                  const clipLeft = displayStart * zoomLevel;
                  const clipWidth = Math.max(8, displayDuration * zoomLevel);

                  const isGraphics = clip.type === "graphics";
                  const isText = clip.type === "text";
                  const isAudio = clip.type === "audio";

                  const baseBg = isGraphics
                    ? "#991B1B"
                    : isText
                    ? "#B45309"
                    : isAudio
                    ? "#065F46"
                    : "#1E40AF";

                  return (
                    <div
                      key={clip.id}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                        backgroundColor: baseBg,
                      }}
                      onMouseDown={(e) => startClipDrag(e, clip, "MOVE")}
                      className={`absolute top-1.5 bottom-1.5 rounded text-white flex items-center justify-between px-2 cursor-pointer select-none transition-shadow ${
                        isSelected
                          ? "ring-2 ring-sky-400 z-10 shadow-lg"
                          : "border border-black/30 hover:brightness-110"
                      } ${isDragging ? "opacity-80" : ""}`}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => startClipDrag(e, clip, "TRIM_LEFT")}
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-l"
                      />

                      {/* Clip Label */}
                      <div className="min-w-0 flex items-center gap-1.5 overflow-hidden pointer-events-none">
                        <span className="text-[11px] font-semibold truncate leading-tight">
                          {clip.name}
                        </span>
                        <span className="text-[9px] opacity-75 font-mono">
                          {displayDuration.toFixed(1)}s
                        </span>
                      </div>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => startClipDrag(e, clip, "TRIM_RIGHT")}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-r"
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead Line & Needle */}
            <div
              style={{ left: `${currentTime * zoomLevel}px` }}
              className="absolute top-0 bottom-0 w-px bg-sky-400 z-30 pointer-events-none shadow-[0_0_8px_rgba(56,189,248,0.8)]"
            >
              {/* Playhead needle cap */}
              <div className="w-3 h-3 bg-sky-400 rounded-b-sm -ml-1.5 shadow-md flex items-center justify-center">
                <div className="w-1 h-1 bg-black rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Ruler Helper
// -------------------------------------------------------------
function renderRulerTicks(totalSeconds: number, pxPerSec: number) {
  const stepSec = pxPerSec > 50 ? 1 : pxPerSec > 25 ? 5 : 10;
  const tickCount = Math.ceil(totalSeconds / stepSec);
  const elements = [];

  for (let i = 0; i <= tickCount; i++) {
    const sec = i * stepSec;
    const leftPx = sec * pxPerSec;
    elements.push(
      <div
        key={sec}
        style={{ left: `${leftPx}px` }}
        className="absolute bottom-0 flex flex-col items-start pointer-events-none"
      >
        <span className="text-[9px] font-mono text-slate-400 pl-1 -translate-y-1">
          {formatTimecode(sec, 50).slice(3, 8)}
        </span>
        <div className="w-px h-2 bg-[#2d3748]" />
      </div>
    );
  }
  return elements;
}
