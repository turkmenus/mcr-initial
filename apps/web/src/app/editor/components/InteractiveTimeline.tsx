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
  onSelectClip,
  onSeek,
  onMoveClip,
  onTrimClip,
  onSplitClip,
  onDeleteClip,
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
  const [zoomLevel, setZoomLevel] = useState(32); // pixels per second
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [activeTool, setActiveTool] = useState<"select" | "razor">("select");

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);

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

  // Global Mouse Move & Up Handler (2D cross-track drag)
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
        if (Math.abs(deltaX) > 3) {
          setHasMovedDuringDrag(true);
        }
        const deltaTime = deltaX / zoomLevel;
        const snapPoints = getSnapPoints(draggingClipId);

        // Detect vertical track lane hover
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

      if (draggingClipId && dragMode && hasMovedDuringDrag) {
        if (dragMode === "MOVE" && currentDragStart !== null) {
          onMoveClip(draggingClipId, currentDragStart, targetDropTrackId || undefined);
        } else if (dragMode === "TRIM_LEFT" && currentDragStart !== null && currentDragDuration !== null) {
          const deltaOffset = currentDragStart - initialClipStart;
          onTrimClip(draggingClipId, currentDragStart, currentDragDuration, initialClipOffset + deltaOffset);
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
    targetDropTrackId,
    dragMode,
    dragStartX,
    hasMovedDuringDrag,
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
    trackId: string,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Select immediately
    onSelectClip(clip.id);

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
    setInitialClipOffset(clip.offset ?? 0);
    setCurrentDragStart(clip.start);
    setCurrentDragDuration(clip.duration);
  };

  // Handle Track Area Empty Click
  const handleTrackLaneClick = (e: React.MouseEvent<HTMLDivElement>, track: Track) => {
    if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickTime = Math.max(0, Math.min(duration, clickX / zoomLevel));
      onSeek(clickTime);
      onSelectClip(null);
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

  return (
    <div className="flex-1 flex flex-col bg-[#111318] border-t border-[#222733] select-none overflow-hidden h-full">
      {/* 1. OpenCut NLE Toolbar */}
      <div className="h-8 px-2 bg-[#161a23] border-b border-[#222733] flex items-center justify-between flex-shrink-0">
        {/* Left Tools */}
        <div className="flex items-center gap-1">
          {/* Tool Selector */}
          <div className="flex items-center bg-[#0d1017] p-0.5 rounded border border-[#262d3d]">
            <button
              onClick={() => setActiveTool("select")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition ${
                activeTool === "select"
                  ? "bg-[#2563eb] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Seçim Aracı (V)"
            >
              <MousePointer className="w-3 h-3" />
              <span>V</span>
            </button>
            <button
              onClick={() => setActiveTool("razor")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition ${
                activeTool === "razor"
                  ? "bg-[#2563eb] text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Kesme Aracı (C)"
            >
              <Scissors className="w-3 h-3" />
              <span>C</span>
            </button>
          </div>

          <div className="h-3.5 w-px bg-[#262d3d] mx-1" />

          {/* Operations */}
          <button
            onClick={() => selectedClipId && onSplitClip(selectedClipId, currentTime)}
            disabled={!selectedClipId}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#222733] disabled:opacity-30 transition"
            title="Playhead Konumunda Böl (Ctrl+K)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#222733] disabled:opacity-30 transition"
            title="Klibi Çoğalt (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-[#222733] disabled:opacity-30 transition"
            title="Klibi Sil (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onAddMarker(currentTime)}
            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-[#222733] transition"
            title="Marker Ekle (M)"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[#262d3d] mx-1" />

          {/* Snapping */}
          <button
            onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition ${
              isSnappingEnabled
                ? "bg-[#2563eb]/20 text-sky-400 border-[#2563eb]/40"
                : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"
            }`}
            title="Manyetik Yapışma (S)"
          >
            <Magnet className="w-3 h-3" />
            <span>SNAP</span>
          </button>
        </div>

        {/* Right Zoom & Track Add */}
        <div className="flex items-center gap-2">
          {/* Zoom Slider */}
          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={() => setZoomLevel((z) => Math.max(10, z - 5))}
              className="p-0.5 hover:text-white"
              title="Uzaklaş (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <div className="w-16">
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
              className="p-0.5 hover:text-white"
              title="Yakınlaş (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-[#262d3d] mx-1" />

          {/* Add Track Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddTrack("video")}
              className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-[#1f2533] hover:bg-[#2a3346] text-sky-400 border border-[#2c374d] transition"
            >
              +V
            </button>
            <button
              onClick={() => onAddTrack("audio")}
              className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-[#1f2533] hover:bg-[#2a3346] text-emerald-400 border border-[#2c374d] transition"
            >
              +A
            </button>
            <button
              onClick={() => onAddTrack("graphics")}
              className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-[#1f2533] hover:bg-[#2a3346] text-rose-400 border border-[#2c374d] transition"
            >
              +G
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tracks & Timeline Scroll Container */}
      <div
        ref={timelineContainerRef}
        className="flex-1 flex overflow-x-auto overflow-y-auto relative bg-[#0a0c10]"
      >
        {/* Left Fixed Track Headers Column (Layer Drag & Drop) */}
        <div className="w-40 flex-shrink-0 sticky left-0 z-20 bg-[#12151d] border-r border-[#222733] shadow-lg flex flex-col">
          {/* Header corner */}
          <div className="h-6 bg-[#161a23] border-b border-[#222733] px-2 flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
            <span>KATMANLAR (LAYERS)</span>
            <span className="text-[8px] text-slate-600">DRAG</span>
          </div>

          {/* Draggable Track Headers */}
          <div className="flex-1 flex flex-col">
            {project.tracks.map((track, idx) => {
              const isVideo = track.type === "video";
              const isAudio = track.type === "audio";
              const isGraphics = track.type === "graphics";
              const isText = track.type === "text";
              const isDragSource = headerDragSourceId === track.id;
              const isDropTarget = headerDragTargetId === track.id;

              return (
                <div
                  key={track.id}
                  draggable={!track.locked}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-track-id", track.id);
                    setHeaderDragSourceId(track.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (headerDragTargetId !== track.id) {
                      setHeaderDragTargetId(track.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (headerDragTargetId === track.id) {
                      setHeaderDragTargetId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const srcId = e.dataTransfer.getData("application/x-track-id");
                    if (srcId && srcId !== track.id && onReorderTracks) {
                      onReorderTracks(srcId, track.id);
                    }
                    setHeaderDragSourceId(null);
                    setHeaderDragTargetId(null);
                  }}
                  onDragEnd={() => {
                    setHeaderDragSourceId(null);
                    setHeaderDragTargetId(null);
                  }}
                  className={`h-12 px-1.5 border-b border-[#222733] flex items-center justify-between bg-[#12151d] hover:bg-[#161a24] transition cursor-grab active:cursor-grabbing ${
                    isDragSource ? "opacity-40" : ""
                  } ${isDropTarget ? "border-t-2 border-t-[#00e5ff] bg-[#1e2738]" : ""}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <GripVertical className="w-3 h-3 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                    <span
                      className="text-[10px] font-mono font-black px-1 py-0.5 rounded"
                      style={{
                        backgroundColor: isGraphics
                          ? "rgba(220,38,38,0.2)"
                          : isText
                          ? "rgba(217,119,6,0.2)"
                          : isVideo
                          ? "rgba(37,99,235,0.2)"
                          : "rgba(5,150,105,0.2)",
                        color: isGraphics
                          ? "#EF4444"
                          : isText
                          ? "#F59E0B"
                          : isVideo
                          ? "#38BDF8"
                          : "#34D399",
                      }}
                    >
                      {track.name.slice(0, 2)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-300 truncate">
                      {track.name}
                    </span>
                  </div>

                  {/* Header Toggles */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTrackVisible(track.id);
                      }}
                      className={`p-0.5 rounded text-[10px] transition ${
                        track.visible ? "text-slate-500 hover:text-slate-300" : "text-rose-400"
                      }`}
                      title={track.visible ? "Katmanı Gizle" : "Katmanı Göster"}
                    >
                      {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>

                    {isAudio && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTrackMute(track.id);
                        }}
                        className={`p-0.5 rounded text-[10px] transition ${
                          track.muted ? "text-rose-400" : "text-slate-500 hover:text-slate-300"
                        }`}
                        title={track.muted ? "Sesi Aç" : "Katmanı Sustur (Mute)"}
                      >
                        {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTrackLock(track.id);
                      }}
                      className={`p-0.5 rounded text-[10px] transition ${
                        track.locked ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                      }`}
                      title={track.locked ? "Kilidi Aç" : "Katmanı Kilitle"}
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
            className="h-6 bg-[#161a23] border-b border-[#222733] sticky top-0 z-10 cursor-ew-resize select-none flex items-end overflow-hidden"
          >
            {renderRulerTicks(duration, zoomLevel)}

            {/* Markers */}
            {(project.markers || []).map((m) => (
              <div
                key={m.id}
                style={{ left: `${m.time * zoomLevel}px` }}
                className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-auto cursor-pointer group z-20"
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
                  className="w-2 h-2 rotate-45 rounded-sm shadow"
                  style={{ backgroundColor: m.color || "#F59E0B" }}
                />
              </div>
            ))}
          </div>

          {/* Track Lanes */}
          <div className="flex-1 flex flex-col relative">
            {project.tracks.map((track) => {
              const isTargetTrack = draggingClipId !== null && targetDropTrackId === track.id;

              return (
                <div
                  key={track.id}
                  data-track-lane-id={track.id}
                  onClick={(e) => handleTrackLaneClick(e, track)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleTrackDrop(e, track)}
                  className={`h-12 border-b border-[#1c212c] relative transition ${
                    isTargetTrack
                      ? "bg-[#182338] ring-1 ring-inset ring-[#00e5ff]/50"
                      : "bg-[#0d1016] hover:bg-[#10141c]"
                  }`}
                >
                  {/* Clips in Track */}
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
                    const clipWidth = Math.max(6, displayDuration * zoomLevel);

                    const isGraphics = clip.type === "graphics";
                    const isText = clip.type === "text";
                    const isAudio = clip.type === "audio";
                    const isVideo = clip.type === "video";

                    const clipColor = isGraphics
                      ? "#991B1B"
                      : isText
                      ? "#B45309"
                      : isAudio
                      ? "#065F46"
                      : "#1D4ED8";

                    return (
                      <div
                        key={clip.id}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${clipWidth}px`,
                          backgroundColor: clipColor,
                        }}
                        onMouseDown={(e) => startClipDrag(e, clip, track.id, "MOVE")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                        }}
                        className={`absolute top-1 bottom-1 rounded-sm text-white flex items-center justify-between px-1.5 cursor-grab active:cursor-grabbing select-none transition-all overflow-hidden ${
                          isSelected
                            ? "ring-2 ring-[#00e5ff] z-10 shadow-lg border border-white/40"
                            : "border border-black/40 hover:brightness-110"
                        } ${isDragging ? "opacity-75 z-20 shadow-2xl scale-[1.01]" : ""}`}
                      >
                        {/* OpenCut Waveform Visualization for Audio Clips */}
                        {isAudio && (
                          <div className="absolute inset-0 opacity-40 overflow-hidden pointer-events-none flex items-center justify-around px-1 z-0">
                            {Array.from({ length: Math.min(80, Math.floor(clipWidth / 4)) }).map((_, waveIdx) => {
                              const h = 25 + Math.sin(waveIdx * 0.4) * 20 + ((waveIdx * 13) % 25);
                              return (
                                <div
                                  key={waveIdx}
                                  style={{ height: `${h}%` }}
                                  className="w-0.5 bg-emerald-200 rounded-full"
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* OpenCut Filmstrip Ribbon for Video Clips */}
                        {isVideo && (
                          <div className="absolute inset-0 opacity-20 overflow-hidden pointer-events-none flex items-center justify-start gap-4 pl-1 z-0">
                            {Array.from({ length: Math.min(30, Math.floor(clipWidth / 48)) }).map((_, fIdx) => (
                              <div
                                key={fIdx}
                                className="w-9 h-7 border border-sky-300/40 rounded-xs bg-black/40 flex items-center justify-center"
                              >
                                <Film className="w-3 h-3 text-sky-200 opacity-70" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Left Trim Handle */}
                        <div
                          onMouseDown={(e) => startClipDrag(e, clip, track.id, "TRIM_LEFT")}
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50 rounded-l-sm z-10"
                        />

                        {/* Clip Title & Duration */}
                        <div className="min-w-0 flex items-center gap-1 overflow-hidden pointer-events-none z-10">
                          <span className="text-[10px] font-semibold truncate leading-none drop-shadow">
                            {clip.name}
                          </span>
                          <span className="text-[8px] font-mono opacity-70 drop-shadow">
                            {displayDuration.toFixed(1)}s
                          </span>
                        </div>

                        {/* Right Trim Handle */}
                        <div
                          onMouseDown={(e) => startClipDrag(e, clip, track.id, "TRIM_RIGHT")}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/50 rounded-r-sm z-10"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Playhead Scrubbing Line & Needle */}
            <div
              style={{ left: `${currentTime * zoomLevel}px` }}
              className="absolute top-0 bottom-0 w-px bg-[#00e5ff] z-30 pointer-events-none shadow-[0_0_6px_rgba(0,229,255,0.9)]"
            >
              <div className="w-2.5 h-2.5 bg-[#00e5ff] rounded-b-sm -ml-1 shadow-md flex items-center justify-center">
                <div className="w-0.5 h-0.5 bg-black rounded-full" />
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
        <span className="text-[8px] font-mono text-slate-500 pl-1 -translate-y-1">
          {formatTimecode(sec, 50).slice(3, 8)}
        </span>
        <div className="w-px h-1.5 bg-[#2b3345]" />
      </div>
    );
  }
  return elements;
}
