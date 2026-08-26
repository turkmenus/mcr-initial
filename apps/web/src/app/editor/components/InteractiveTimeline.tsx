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
  Radio,
  GripVertical,
  Maximize2,
} from "lucide-react";
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
import { AudioWaveformCanvas } from "./AudioWaveformCanvas";

interface InteractiveTimelineProps {
  project: TimelineProject;
  currentTime: number;
  selectedClipId: string | null;
  selectedClipIds?: string[];
  onSelectClip: (clipId: string | null) => void;
  onSelectMultipleClips?: (clipIds: string[]) => void;
  onSeek: (time: number) => void;
  onMoveClip: (clipId: string, newStart: number, targetTrackId?: string) => void;
  onMoveMultipleClips?: (clipIds: string[], deltaTime: number) => void;
  onTrimClip: (clipId: string, newStart: number, newDuration: number, newOffset?: number) => void;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onSplitAllClips?: (time: number) => void;
  onDeleteClip: (clipId: string) => void;
  onRippleDeleteClip?: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onAddTrack: (type: "video" | "audio" | "graphics" | "text") => void;
  onRemoveTrack: (trackId: string) => void;
  onReorderTracks?: (sourceTrackId: string, targetTrackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackVisible: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onAddMarker: (time: number, label?: string) => void;
  onRemoveMarker: (markerId: string) => void;
  onDropMediaToTrack?: (trackId: string, item: any, dropTime: number) => void;
}

type DragMode = "MOVE" | "TRIM_LEFT" | "TRIM_RIGHT" | null;

export function InteractiveTimeline({
  project,
  currentTime,
  selectedClipId,
  selectedClipIds = [],
  onSelectClip,
  onSelectMultipleClips,
  onSeek,
  onMoveClip,
  onMoveMultipleClips,
  onTrimClip,
  onSplitClip,
  onSplitAllClips,
  onDeleteClip,
  onRippleDeleteClip,
  onDuplicateClip,
  onAddTrack,
  onRemoveTrack,
  onReorderTracks,
  onToggleTrackMute,
  onToggleTrackVisible,
  onToggleTrackLock,
  onAddMarker,
  onRemoveMarker,
  onDropMediaToTrack,
}: InteractiveTimelineProps) {
  const [zoomLevel, setZoomLevel] = useState(36); // pixels per second
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<"select" | "razor">("select");

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);

  // Active Multi-Selection Set
  const effectiveSelectedIds = new Set<string>(
    selectedClipIds.length > 0 ? selectedClipIds : selectedClipId ? [selectedClipId] : []
  );

  // Clip Dragging State (2D: Time X + Target Track Y)
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [draggingSourceTrackId, setDraggingSourceTrackId] = useState<string | null>(null);
  const [targetDropTrackId, setTargetDropTrackId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const [initialClipStart, setInitialClipStart] = useState(0);
  const [initialClipDuration, setInitialClipDuration] = useState(0);
  const [initialClipOffset, setInitialClipOffset] = useState(0);
  const [currentDragStart, setCurrentDragStart] = useState<number | null>(null);
  const [currentDragDuration, setCurrentDragDuration] = useState<number | null>(null);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState(false);

  // Marquee Selection Box Dragging State
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  // Track Header Layer Reordering State
  const [headerDragSourceId, setHeaderDragSourceId] = useState<string | null>(null);
  const [headerDragTargetId, setHeaderDragTargetId] = useState<string | null>(null);

  const duration = project.duration || 60;
  const timelineWidth = Math.max(1600, duration * zoomLevel + 400);

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
      (project.markers || []).forEach((m) => points.add(m.time));
      return Array.from(points);
    },
    [project, currentTime, isSnappingEnabled]
  );

  const snapToPoints = useCallback(
    (time: number, snapPoints: number[], thresholdPx = 10): number => {
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
    e.preventDefault();
    setIsScrubbingRuler(true);
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const time = Math.max(0, Math.min(duration, clickX / zoomLevel));
    onSeek(time);
  };

  // Global Mouse Move & Up Handler (2D cross-track drag + marquee)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbingRuler && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const time = Math.max(0, Math.min(duration, clickX / zoomLevel));
        onSeek(time);
      }

      if (isMarqueeSelecting && timelineContainerRef.current) {
        const rect = timelineContainerRef.current.getBoundingClientRect();
        setMarqueeEnd({
          x: e.clientX - rect.left + timelineContainerRef.current.scrollLeft,
          y: e.clientY - rect.top + timelineContainerRef.current.scrollTop,
        });
      }

      if (draggingClipId && dragMode) {
        const deltaX = e.clientX - dragStartX;
        if (Math.abs(deltaX) > 3) {
          setHasMovedDuringDrag(true);
        }
        const deltaTime = deltaX / zoomLevel;
        const snapPoints = getSnapPoints(draggingClipId);

        if (dragMode === "MOVE") {
          const rawNewStart = initialClipStart + deltaTime;
          const snappedStart = snapToPoints(rawNewStart, snapPoints);
          setCurrentDragStart(snappedStart);

          // Find track lane under cursor
          const element = document.elementFromPoint(e.clientX, e.clientY);
          const lane = element?.closest("[data-track-lane-id]");
          if (lane) {
            const laneId = lane.getAttribute("data-track-lane-id");
            if (laneId) setTargetDropTrackId(laneId);
          }
        } else if (dragMode === "TRIM_LEFT") {
          const rawNewStart = Math.min(
            initialClipStart + initialClipDuration - 0.2,
            initialClipStart + deltaTime
          );
          const snappedStart = snapToPoints(rawNewStart, snapPoints);
          const deltaTrim = snappedStart - initialClipStart;
          const newDur = Math.max(0.2, initialClipDuration - deltaTrim);
          setCurrentDragStart(snappedStart);
          setCurrentDragDuration(newDur);
        } else if (dragMode === "TRIM_RIGHT") {
          const rawNewDur = Math.max(0.2, initialClipDuration + deltaTime);
          const rawEnd = initialClipStart + rawNewDur;
          const snappedEnd = snapToPoints(rawEnd, snapPoints);
          const newDur = Math.max(0.2, snappedEnd - initialClipStart);
          setCurrentDragDuration(newDur);
        }
      }
    };

    const handleMouseUp = () => {
      if (isScrubbingRuler) {
        setIsScrubbingRuler(false);
      }

      if (isMarqueeSelecting && marqueeStart && marqueeEnd) {
        // Compute hit tests for intersecting clips
        const minX = Math.min(marqueeStart.x, marqueeEnd.x);
        const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
        const startTime = (minX - 192) / zoomLevel; // minus 192px left header
        const endTime = (maxX - 192) / zoomLevel;

        const selectedIds: string[] = [];
        project.tracks.forEach((t) => {
          t.clips.forEach((c) => {
            const cStart = c.start;
            const cEnd = c.start + c.duration;
            if (cStart < endTime && cEnd > startTime) {
              selectedIds.push(c.id);
            }
          });
        });

        if (selectedIds.length > 0) {
          onSelectMultipleClips?.(selectedIds);
          onSelectClip(selectedIds[0]);
        }
        setIsMarqueeSelecting(false);
        setMarqueeStart(null);
        setMarqueeEnd(null);
      }

      if (draggingClipId && dragMode) {
        if (hasMovedDuringDrag) {
          if (dragMode === "MOVE" && currentDragStart !== null) {
            const deltaTime = currentDragStart - initialClipStart;
            // If multiple clips selected and this clip is part of group
            if (effectiveSelectedIds.size > 1 && effectiveSelectedIds.has(draggingClipId) && onMoveMultipleClips) {
              onMoveMultipleClips(Array.from(effectiveSelectedIds), deltaTime);
            } else {
              onMoveClip(draggingClipId, currentDragStart, targetDropTrackId || undefined);
            }
          } else if (dragMode === "TRIM_LEFT" && currentDragStart !== null && currentDragDuration !== null) {
            const deltaStart = currentDragStart - initialClipStart;
            const newOffset = initialClipOffset + deltaStart;
            onTrimClip(draggingClipId, currentDragStart, currentDragDuration, newOffset);
          } else if (dragMode === "TRIM_RIGHT" && currentDragDuration !== null) {
            onTrimClip(draggingClipId, initialClipStart, currentDragDuration, initialClipOffset);
          }
        }

        setDraggingClipId(null);
        setDraggingSourceTrackId(null);
        setTargetDropTrackId(null);
        setDragMode(null);
        setCurrentDragStart(null);
        setCurrentDragDuration(null);
        setHasMovedDuringDrag(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isScrubbingRuler,
    isMarqueeSelecting,
    marqueeStart,
    marqueeEnd,
    draggingClipId,
    dragMode,
    dragStartX,
    initialClipStart,
    initialClipDuration,
    initialClipOffset,
    currentDragStart,
    currentDragDuration,
    hasMovedDuringDrag,
    effectiveSelectedIds,
    zoomLevel,
    duration,
    project,
    getSnapPoints,
    snapToPoints,
    onSeek,
    onMoveClip,
    onMoveMultipleClips,
    onTrimClip,
    onSelectClip,
    onSelectMultipleClips,
    targetDropTrackId,
  ]);

  // Start Dragging Clip (supporting Shift+Click multi selection)
  const handleClipMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    clip: TimelineClip,
    trackId: string,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Multi-selection with Shift key
    if (e.shiftKey) {
      const nextSet = new Set(effectiveSelectedIds);
      if (nextSet.has(clip.id)) {
        nextSet.delete(clip.id);
      } else {
        nextSet.add(clip.id);
      }
      const arr = Array.from(nextSet);
      onSelectMultipleClips?.(arr);
      onSelectClip(arr[0] || null);
    } else {
      if (!effectiveSelectedIds.has(clip.id)) {
        onSelectMultipleClips?.([clip.id]);
        onSelectClip(clip.id);
      }
    }

    if (activeTool === "razor") {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const splitTime = clip.start + clickX / zoomLevel;
      onSplitClip(clip.id, splitTime);
      return;
    }

    setDraggingClipId(clip.id);
    setDraggingSourceTrackId(trackId);
    setTargetDropTrackId(trackId);
    setDragMode(mode);
    setDragStartX(e.clientX);
    setHasMovedDuringDrag(false);
    setInitialClipStart(clip.start);
    setInitialClipDuration(clip.duration);
    setInitialClipOffset(clip.offset ?? clip.trimStart ?? 0);
    setCurrentDragStart(clip.start);
    setCurrentDragDuration(clip.duration);
  };

  // Handle Track Area Empty Click & Marquee Drag
  const handleTrackLaneMouseDown = (e: React.MouseEvent<HTMLDivElement>, track: Track) => {
    if (e.target === e.currentTarget && !e.shiftKey) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickTime = Math.max(0, Math.min(duration, clickX / zoomLevel));
      onSeek(clickTime);
      onSelectClip(null);
      onSelectMultipleClips?.([]);

      // Start Marquee Selection Box
      if (timelineContainerRef.current) {
        const containerRect = timelineContainerRef.current.getBoundingClientRect();
        setIsMarqueeSelecting(true);
        const startPt = {
          x: e.clientX - containerRect.left + timelineContainerRef.current.scrollLeft,
          y: e.clientY - containerRect.top + timelineContainerRef.current.scrollTop,
        };
        setMarqueeStart(startPt);
        setMarqueeEnd(startPt);
      }
    }
  };

  // Handle Drag and Drop Media from Library or Device onto Track
  const handleTrackDrop = (e: React.DragEvent<HTMLDivElement>, track: Track) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const dropTime = Math.max(0, Math.min(duration, clickX / zoomLevel));

    // Direct OS File Drop from User Device
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onDropMediaToTrack?.(track.id, file, dropTime);
      return;
    }

    // Dragged item from internal Media Library
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const item = JSON.parse(raw);
      onDropMediaToTrack?.(track.id, item, dropTime);
    } catch {}
  };

  // Zoom to fit
  const handleZoomToFit = () => {
    if (!timelineContainerRef.current) return;
    const visibleWidth = timelineContainerRef.current.clientWidth - 192; // track header offset
    if (visibleWidth > 200 && duration > 0) {
      const targetZoom = Math.max(10, Math.min(120, visibleWidth / duration));
      setZoomLevel(targetZoom);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14] border-t border-[#1f2638] select-none overflow-hidden h-full">
      {/* 1. OpenCut NLE Toolbar */}
      <div className="h-8 px-2 bg-[#121622] border-b border-[#1f2638] flex items-center justify-between flex-shrink-0">
        {/* Tool Selectors */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTool("select")}
            className={`p-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
              activeTool === "select"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1a2130]"
            }`}
            title="Seçim Aracı (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="text-[10px]">Seç (V)</span>
          </button>

          <button
            onClick={() => setActiveTool("razor")}
            className={`p-1 rounded text-[11px] font-bold flex items-center gap-1 transition ${
              activeTool === "razor"
                ? "bg-rose-600 text-white shadow-sm animate-pulse"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1a2130]"
            }`}
            title="Jilet / Kesme Aracı (C)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="text-[10px]">Jilet (C)</span>
          </button>

          <div className="h-3 w-[1px] bg-[#222733] mx-1" />

          {/* Magnetic Snapping Toggle */}
          <button
            onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
            className={`p-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
              isSnappingEnabled
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : "text-slate-500 hover:text-slate-300"
            }`}
            title="Mıknatıs / Snapping (S)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap (S)</span>
          </button>

          {/* Add Marker at Playhead */}
          <button
            onClick={() => onAddMarker(currentTime, `İşaretçi ${formatTimecode(currentTime, 50)}`)}
            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-[#1a2130] text-[10px] font-bold flex items-center gap-1 transition"
            title="İşaretçi Ekle (M)"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Marker (M)</span>
          </button>

          {/* Split All Tracks at Playhead (OpenCut All-Tracks Split) */}
          {onSplitAllClips && (
            <button
              onClick={() => onSplitAllClips(currentTime)}
              className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-[#1a2130] text-[10px] font-bold flex items-center gap-1 transition"
              title="Tüm Katmanları Playhead'den Böl (Ctrl+Shift+K)"
            >
              <Scissors className="w-3.5 h-3.5 text-sky-400" />
              <span>Tümünü Böl</span>
            </button>
          )}

          <div className="h-3 w-[1px] bg-[#222733] mx-1" />

          {/* Quick Clip Operations on Selected Clip */}
          {selectedClipId && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onSplitClip(selectedClipId, currentTime)}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#181f2e] text-sky-300 hover:bg-[#202a3d] border border-[#26334d] flex items-center gap-1"
                title="Seçili Klibi Playhead'den Böl (Ctrl+K)"
              >
                <Scissors className="w-3 h-3" />
                <span>Böl</span>
              </button>

              <button
                onClick={() => onDuplicateClip(selectedClipId)}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#181f2e] text-slate-300 hover:bg-[#202a3d] border border-[#26334d] flex items-center gap-1"
                title="Klibi Çoğalt (Ctrl+D)"
              >
                <Copy className="w-3 h-3" />
                <span>Çoğalt</span>
              </button>

              {onRippleDeleteClip && (
                <button
                  onClick={() => onRippleDeleteClip(selectedClipId)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-500/30 flex items-center gap-1"
                  title="Boşluğu Kapatarak Sil (Shift+Delete)"
                >
                  <span>Ripple Sil</span>
                </button>
              )}

              <button
                onClick={() => onDeleteClip(selectedClipId)}
                className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition"
                title="Klibi Sil (Delete / Backspace)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Multi-Selection Counter Indicator */}
          {effectiveSelectedIds.size > 1 && (
            <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-500/40 text-[9px] font-bold">
              {effectiveSelectedIds.size} Klip Seçili (Grup)
            </span>
          )}
        </div>

        {/* Right Controls: Add Tracks & Zoom Slider */}
        <div className="flex items-center gap-2">
          {/* Add Track dropdown */}
          <div className="flex items-center gap-1 bg-[#090b10] p-0.5 rounded border border-[#1f2638]">
            <button
              onClick={() => onAddTrack("video")}
              className="px-1.5 py-0.5 text-[9px] font-bold text-sky-400 hover:bg-sky-500/10 rounded flex items-center gap-0.5"
              title="Yeni Video Katmanı Ekle"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>+V</span>
            </button>
            <button
              onClick={() => onAddTrack("audio")}
              className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 rounded flex items-center gap-0.5"
              title="Yeni Ses Katmanı Ekle"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>+A</span>
            </button>
            <button
              onClick={() => onAddTrack("graphics")}
              className="px-1.5 py-0.5 text-[9px] font-bold text-rose-400 hover:bg-rose-500/10 rounded flex items-center gap-0.5"
              title="Yeni Grafik Katmanı Ekle"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>+G</span>
            </button>
            <button
              onClick={() => onAddTrack("text")}
              className="px-1.5 py-0.5 text-[9px] font-bold text-amber-400 hover:bg-amber-500/10 rounded flex items-center gap-0.5"
              title="Yeni Metin Katmanı Ekle"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>+T</span>
            </button>
          </div>

          <div className="h-3 w-[1px] bg-[#222733]" />

          {/* Fit to View */}
          <button
            onClick={handleZoomToFit}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1a2130] transition text-[10px]"
            title="Ekrana Sığdır (Shift+Z)"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5 w-28">
            <ZoomOut
              className="w-3 h-3 text-slate-500 cursor-pointer hover:text-slate-300"
              onClick={() => setZoomLevel((z) => Math.max(10, z - 8))}
            />
            <Slider
              value={[zoomLevel]}
              min={10}
              max={100}
              step={2}
              onValueChange={(val) => setZoomLevel(val[0])}
              className="h-3"
            />
            <ZoomIn
              className="w-3 h-3 text-slate-500 cursor-pointer hover:text-slate-300"
              onClick={() => setZoomLevel((z) => Math.min(100, z + 8))}
            />
          </div>
        </div>
      </div>

      {/* 2. Timeline Workspace (Left Headers + Right Tracks Surface) */}
      <div ref={timelineContainerRef} className="flex-1 flex overflow-auto relative">
        {/* A. Fixed Left Track Headers (Z-Order Composite Stacks) */}
        <div className="w-48 bg-[#0e121a] border-r border-[#1f2638] flex flex-col flex-shrink-0 z-20 sticky left-0 shadow-md">
          {/* Header Spacer (Matching Ruler Height) */}
          <div className="h-6 bg-[#131722] border-b border-[#1f2638] px-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>KATMANLAR</span>
            </div>
            <span className="text-[8px] font-mono text-slate-500">{project.tracks.length} KANAL</span>
          </div>

          {/* Track Header Rows (Draggable for Layer Reordering) */}
          <div className="flex-1 flex flex-col">
            {project.tracks.map((track) => {
              const isVideo = track.type === "video";
              const isAudio = track.type === "audio";
              const isGraphics = track.type === "graphics";
              const isText = track.type === "text";
              const isTargetHover = headerDragTargetId === track.id;

              return (
                <div
                  key={track.id}
                  draggable
                  onDragStart={(e) => {
                    setHeaderDragSourceId(track.id);
                    e.dataTransfer.setData("text/plain", track.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (headerDragSourceId && headerDragSourceId !== track.id) {
                      setHeaderDragTargetId(track.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (headerDragTargetId === track.id) setHeaderDragTargetId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (headerDragSourceId && headerDragSourceId !== track.id) {
                      onReorderTracks?.(headerDragSourceId, track.id);
                    }
                    setHeaderDragSourceId(null);
                    setHeaderDragTargetId(null);
                  }}
                  className={`h-14 border-b border-[#1f2638] px-2 flex items-center justify-between transition cursor-grab active:cursor-grabbing ${
                    isTargetHover
                      ? "bg-sky-950/80 border-t-2 border-t-sky-400"
                      : "bg-[#0e121a] hover:bg-[#131824]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[9px] flex-shrink-0 ${
                        isGraphics
                          ? "bg-rose-500/20 text-rose-400"
                          : isText
                          ? "bg-amber-500/20 text-amber-400"
                          : isVideo
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {isGraphics ? "G" : isText ? "T" : isVideo ? "V" : "A"}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 truncate">
                      {track.name}
                    </span>
                  </div>

                  {/* Track Action Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Lock Toggle */}
                    <button
                      onClick={() => onToggleTrackLock(track.id)}
                      className={`p-1 rounded text-slate-500 hover:text-slate-300 ${
                        track.locked ? "text-amber-400 bg-amber-950/30" : ""
                      }`}
                      title={track.locked ? "Katman Kilidini Aç" : "Katmanı Kilitle"}
                    >
                      {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    {/* Mute (Audio) or Eye (Video/GFX) */}
                    {isAudio ? (
                      <button
                        onClick={() => onToggleTrackMute(track.id)}
                        className={`p-1 rounded text-slate-500 hover:text-slate-300 ${
                          track.muted ? "text-rose-400 bg-rose-950/30" : ""
                        }`}
                        title={track.muted ? "Sesi Aç" : "Sesi Kapat"}
                      >
                        {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggleTrackVisible(track.id)}
                        className={`p-1 rounded text-slate-500 hover:text-slate-300 ${
                          track.visible === false ? "text-rose-400 bg-rose-950/30" : ""
                        }`}
                        title={track.visible === false ? "Katmanı Göster" : "Katmanı Gizle"}
                      >
                        {track.visible === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* B. Scrollable Timeline Canvas Surface */}
        <div
          style={{ width: `${timelineWidth}px` }}
          className="flex-1 flex flex-col relative bg-[#090b10]"
        >
          {/* 1. Timecode Ruler Bar */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-6 bg-[#131722] border-b border-[#1f2638] relative cursor-pointer group flex-shrink-0"
          >
            {/* Second Interval Tick Marks */}
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => {
              const leftPos = sec * zoomLevel;
              const isMajor = sec % 5 === 0;
              return (
                <div
                  key={sec}
                  style={{ left: `${leftPos}px` }}
                  className="absolute top-0 bottom-0 pointer-events-none"
                >
                  <div
                    className={`w-[1px] ${
                      isMajor ? "h-full bg-slate-500" : "h-2 bg-slate-700"
                    }`}
                  />
                  {isMajor && (
                    <span className="absolute left-1 top-0.5 text-[9px] font-mono text-slate-400">
                      {sec}s
                    </span>
                  )}
                </div>
              );
            })}

            {/* Timeline Markers */}
            {(project.markers || []).map((marker) => (
              <div
                key={marker.id}
                style={{ left: `${marker.time * zoomLevel}px` }}
                className="absolute top-0 bottom-0 z-30 flex flex-col items-center pointer-events-auto cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(marker.time);
                }}
              >
                <div
                  className="w-2.5 h-2.5 rotate-45 border border-white/40 shadow-sm"
                  style={{ backgroundColor: marker.color || "#38BDF8" }}
                />
                <div className="opacity-0 group-hover:opacity-100 absolute -top-5 px-1 py-0.5 rounded bg-black/90 text-[8px] font-mono text-white whitespace-nowrap transition pointer-events-none border border-[#1f2638]">
                  {marker.label}
                </div>
              </div>
            ))}
          </div>

          {/* 2. Track Lanes Container */}
          <div className="flex-1 flex flex-col relative">
            {project.tracks.map((track) => {
              const isAudio = track.type === "audio";
              const isTargetHover = targetDropTrackId === track.id && draggingClipId !== null;

              return (
                <div
                  key={track.id}
                  data-track-lane-id={track.id}
                  onMouseDown={(e) => handleTrackLaneMouseDown(e, track)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleTrackDrop(e, track)}
                  className={`h-14 border-b border-[#1f2638] relative transition ${
                    isTargetHover
                      ? "bg-[#141b2c] ring-1 ring-inset ring-sky-400"
                      : "bg-[#090b10] hover:bg-[#0c0f16]"
                  }`}
                >
                  {/* Clips on this Track */}
                  {track.clips.map((clip) => {
                    const isSelected = effectiveSelectedIds.has(clip.id);
                    const isCurrentlyDragging = draggingClipId === clip.id;

                    const displayStart =
                      isCurrentlyDragging && currentDragStart !== null
                        ? currentDragStart
                        : clip.start;
                    const displayDuration =
                      isCurrentlyDragging && currentDragDuration !== null
                        ? currentDragDuration
                        : clip.duration;

                    const leftPx = displayStart * zoomLevel;
                    const widthPx = Math.max(20, displayDuration * zoomLevel);

                    const isVideoClip = clip.type === "video";
                    const isAudioClip = clip.type === "audio";
                    const isGfxClip = clip.type === "graphics";
                    const isTxtClip = clip.type === "text";

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, "MOVE")}
                        style={{
                          left: `${leftPx}px`,
                          width: `${widthPx}px`,
                          backgroundColor:
                            clip.color ||
                            (isGfxClip
                              ? "#C8102E"
                              : isTxtClip
                              ? "#D97706"
                              : isVideoClip
                              ? "#0284C7"
                              : "#059669"),
                        }}
                        className={`absolute top-1 bottom-1 rounded border flex flex-col justify-between overflow-hidden cursor-grab active:cursor-grabbing transition-shadow ${
                          isSelected
                            ? "ring-2 ring-white border-white shadow-lg z-10 brightness-110"
                            : "border-black/30 hover:brightness-105"
                        } ${isCurrentlyDragging ? "opacity-90 shadow-2xl scale-[1.01]" : ""}`}
                      >
                        {/* Clip Top Header Label */}
                        <div className="px-1.5 py-0.5 flex items-center justify-between text-[10px] font-bold text-white drop-shadow truncate pointer-events-none z-10">
                          <span className="truncate">{clip.name}</span>
                          <span className="text-[8px] font-mono opacity-80 pl-1">
                            {displayDuration.toFixed(1)}s
                          </span>
                        </div>

                        {/* Real OpenCut Audio Waveform Canvas for Audio / Video Clips */}
                        {(isAudioClip || isVideoClip) && clip.src && (
                          <div className="absolute inset-0 top-3 bottom-0 px-0.5 pointer-events-none opacity-80">
                            <AudioWaveformCanvas
                              src={clip.src}
                              clipStart={clip.start}
                              clipDuration={clip.duration}
                              clipOffset={clip.offset || clip.trimStart || 0}
                              pixelsPerSecond={zoomLevel}
                              color={isAudioClip ? "rgba(255, 255, 255, 0.75)" : "rgba(186, 230, 253, 0.6)"}
                            />
                          </div>
                        )}

                        {/* Trim Left Handle */}
                        <div
                          onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, "TRIM_LEFT")}
                          className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-white/0 hover:bg-white/40 cursor-ew-resize transition-all z-20"
                          title="Girişi Kırp (Trim Left)"
                        />

                        {/* Trim Right Handle */}
                        <div
                          onMouseDown={(e) => handleClipMouseDown(e, clip, track.id, "TRIM_RIGHT")}
                          className="absolute right-0 top-0 bottom-0 w-2 hover:w-3 bg-white/0 hover:bg-white/40 cursor-ew-resize transition-all z-20"
                          title="Çıkışı Kırp (Trim Right)"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* 3. Marquee Selection Box Overlay */}
          {isMarqueeSelecting && marqueeStart && marqueeEnd && (
            <div
              style={{
                left: `${Math.min(marqueeStart.x, marqueeEnd.x)}px`,
                top: `${Math.min(marqueeStart.y, marqueeEnd.y)}px`,
                width: `${Math.abs(marqueeEnd.x - marqueeStart.x)}px`,
                height: `${Math.abs(marqueeEnd.y - marqueeStart.y)}px`,
              }}
              className="absolute border-2 border-sky-400 border-dashed bg-sky-500/15 pointer-events-none z-30 shadow-sm"
            />
          )}

          {/* 4. Global Playhead Line (CTI) */}
          <div
            style={{ left: `${currentTime * zoomLevel}px` }}
            className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center"
          >
            {/* Playhead Head Icon */}
            <div className="w-3.5 h-3.5 bg-rose-500 rotate-45 -mt-1.5 shadow-md border border-white" />
            {/* Vertical Line */}
            <div className="w-[2px] h-full bg-rose-500 shadow-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
