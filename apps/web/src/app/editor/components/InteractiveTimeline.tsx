"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
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
  Image as ImageIcon,
  Sparkles,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [zoomLevel, setZoomLevel] = useState(28); // pixels per second
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

  // Calculate Snap Points (0s, playhead, and all clip boundaries)
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
    [isSnappingEnabled, currentTime, project.tracks]
  );

  const findNearestSnap = (time: number, snapPoints: number[], thresholdSeconds = 0.25): number => {
    let closest = time;
    let minDiff = thresholdSeconds;
    snapPoints.forEach((pt) => {
      const diff = Math.abs(pt - time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    });
    return closest;
  };

  // --- MOUSE DRAG & TRIM HANDLERS ---

  const handleClipMouseDown = (
    e: React.MouseEvent,
    clip: TimelineClip,
    track: Track,
    mode: DragMode
  ) => {
    if (track.locked) return;
    e.stopPropagation();

    onSelectClip(clip.id);

    if (activeTool === "razor") {
      onSplitClip(clip.id, currentTime);
      return;
    }

    setDraggingClipId(clip.id);
    setDragMode(mode);
    setDragStartX(e.clientX);
    setInitialClipStart(clip.start);
    setInitialClipDuration(clip.duration);
    setInitialClipOffset(clip.offset ?? 0);
    setCurrentDragStart(clip.start);
    setCurrentDragDuration(clip.duration);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbingRuler && rulerRef.current) {
        const rect = rulerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newTime = Math.max(0, Math.min(duration, clickX / zoomLevel));
        onSeek(newTime);
        return;
      }

      if (!draggingClipId || !dragMode) return;

      const deltaPixels = e.clientX - dragStartX;
      const deltaTime = deltaPixels / zoomLevel;
      const snapPoints = getSnapPoints(draggingClipId);

      if (dragMode === "MOVE") {
        let proposedStart = Math.max(0, initialClipStart + deltaTime);
        if (isSnappingEnabled) {
          // Snap start or snap end
          const snappedStart = findNearestSnap(proposedStart, snapPoints);
          if (snappedStart !== proposedStart) {
            proposedStart = snappedStart;
          } else {
            const snappedEnd = findNearestSnap(proposedStart + initialClipDuration, snapPoints);
            if (snappedEnd !== proposedStart + initialClipDuration) {
              proposedStart = Math.max(0, snappedEnd - initialClipDuration);
            }
          }
        }
        setCurrentDragStart(proposedStart);
      } else if (dragMode === "TRIM_LEFT") {
        let proposedStart = Math.max(0, initialClipStart + deltaTime);
        if (isSnappingEnabled) {
          proposedStart = findNearestSnap(proposedStart, snapPoints);
        }
        const deltaStart = proposedStart - initialClipStart;
        const proposedDuration = Math.max(0.2, initialClipDuration - deltaStart);
        const proposedOffset = Math.max(0, initialClipOffset + deltaStart);

        setCurrentDragStart(proposedStart);
        setCurrentDragDuration(proposedDuration);
      } else if (dragMode === "TRIM_RIGHT") {
        let proposedDuration = Math.max(0.2, initialClipDuration + deltaTime);
        const proposedEnd = initialClipStart + proposedDuration;
        if (isSnappingEnabled) {
          const snappedEnd = findNearestSnap(proposedEnd, snapPoints);
          proposedDuration = Math.max(0.2, snappedEnd - initialClipStart);
        }
        setCurrentDragDuration(proposedDuration);
      }
    };

    const handleMouseUp = () => {
      if (isScrubbingRuler) {
        setIsScrubbingRuler(false);
      }

      if (draggingClipId && dragMode) {
        if (dragMode === "MOVE" && currentDragStart !== null) {
          onMoveClip(draggingClipId, currentDragStart);
        } else if (dragMode === "TRIM_LEFT" && currentDragStart !== null && currentDragDuration !== null) {
          const deltaStart = currentDragStart - initialClipStart;
          const newOffset = Math.max(0, initialClipOffset + deltaStart);
          onTrimClip(draggingClipId, currentDragStart, currentDragDuration, newOffset);
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
    isSnappingEnabled,
    getSnapPoints,
    onSeek,
    onMoveClip,
    onTrimClip,
  ]);

  // Handle Ruler Click / Drag
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = Math.max(0, Math.min(duration, clickX / zoomLevel));
    onSeek(newTime);
    setIsScrubbingRuler(true);
  };

  const selectedClip = project.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);

  return (
    <div className="flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden select-none">
      {/* Timeline Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-3 border-b border-border bg-secondary/30 gap-3 text-xs">
        {/* Left: Tools */}
        <div className="flex items-center gap-1.5">
          <Button
            variant={activeTool === "select" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("select")}
            className="h-8 gap-1.5 font-bold"
            title="Seçim Aracı (V)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Seç (V)</span>
          </Button>

          <Button
            variant={activeTool === "razor" ? "destructive" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("razor")}
            className="h-8 gap-1.5 font-bold text-amber-400 hover:text-amber-300"
            title="Klip Kesme / Bölme Aracı (C)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Klip Kes (C)</span>
          </Button>

          <div className="h-5 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedClipId && onSplitClip(selectedClipId, currentTime)}
            disabled={!selectedClipId}
            className="h-8 gap-1.5 font-bold text-slate-300"
            title="Seçili Klibi Oynatıcı Çizgisinde Böl"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Böl</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
            disabled={!selectedClipId}
            className="h-8 gap-1.5 font-bold text-slate-300"
            title="Seçili Klibi Çoğalt (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400" />
            <span>Çoğalt</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            className="h-8 gap-1.5 font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
            title="Seçili Klibi Sil (Delete / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Sil</span>
          </Button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Snapping Toggle */}
          <Button
            variant={isSnappingEnabled ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
            className={`h-8 gap-1.5 font-bold ${
              isSnappingEnabled ? "text-sky-400 border border-sky-500/40" : "text-muted-foreground"
            }`}
            title="Manyetik Yapışma (S)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap (S)</span>
          </Button>

          {/* Add Marker */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddMarker(currentTime)}
            className="h-8 gap-1.5 font-bold text-slate-300"
            title="Oynatıcı Zamanına İşaretçi Ekle (M)"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>İşaretçi (M)</span>
          </Button>
        </div>

        {/* Right: Add Track & Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Add Track dropdown */}
          <div className="flex items-center gap-1 bg-secondary/80 rounded-lg p-0.5 border border-border">
            <span className="text-[11px] font-bold text-muted-foreground px-2">Katman:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTrack("video")}
              className="h-6 px-1.5 text-[11px] font-bold text-sky-400 hover:bg-sky-950/60"
              title="Yeni Video Katmanı (V) Ekle"
            >
              +V
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTrack("audio")}
              className="h-6 px-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-950/60"
              title="Yeni Ses Katmanı (A) Ekle"
            >
              +A
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTrack("graphics")}
              className="h-6 px-1.5 text-[11px] font-bold text-rose-400 hover:bg-rose-950/60"
              title="Yeni Grafik Katmanı (G) Ekle"
            >
              +G
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTrack("text")}
              className="h-6 px-1.5 text-[11px] font-bold text-amber-400 hover:bg-amber-950/60"
              title="Yeni Metin Katmanı (T) Ekle"
            >
              +T
            </Button>
          </div>

          <div className="h-5 w-px bg-border" />

          {/* Zoom Slider */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel((z) => Math.max(10, z - 6))}
              className="h-7 w-7"
            >
              <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>

            <div className="w-20">
              <Slider
                value={zoomLevel}
                min={10}
                max={70}
                step={2}
                onValueChange={(val) => setZoomLevel(val)}
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel((z) => Math.min(70, z + 6))}
              className="h-7 w-7"
            >
              <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>

            <Badge variant="outline" className="font-mono text-[10px] w-14 justify-center">
              {zoomLevel}px/s
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Multi-Track Scrollable Work Area */}
      <div
        ref={timelineContainerRef}
        className="relative flex overflow-x-auto overflow-y-hidden max-h-[380px] bg-[#0A0E18]"
      >
        {/* Left Fixed: Track Headers Column (Width: 200px) */}
        <div className="sticky left-0 z-30 w-52 flex-shrink-0 bg-card/95 backdrop-blur border-r border-border flex flex-col shadow-2xl">
          {/* Header Corner Space matching Ruler */}
          <div className="h-9 border-b border-border px-3 flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider bg-secondary/50">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>KATMANLAR</span>
            </div>
            <span className="text-[10px] font-mono">{project.tracks.length} Kanal</span>
          </div>

          {/* Track Headers */}
          <div className="space-y-2 py-2">
            {project.tracks.map((track) => {
              const isVideo = track.type === "video";
              const isAudio = track.type === "audio";
              const isGraphics = track.type === "graphics";
              const isText = track.type === "text";

              return (
                <div
                  key={track.id}
                  className="h-16 px-3 flex items-center justify-between border-b border-border/40 hover:bg-secondary/40 transition group"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 shadow ${
                        isGraphics
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : isText
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : isVideo
                          ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      }`}
                    >
                      {isGraphics ? "G" : isText ? "T" : isVideo ? "V" : "A"}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate">{track.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {track.clips.length} Klip
                      </div>
                    </div>
                  </div>

                  {/* Track Controls: Mute, Visibility, Lock */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    {/* Mute (for Video/Audio) */}
                    {(isVideo || isAudio) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleTrackMute(track.id)}
                        className={`h-6 w-6 rounded-md ${
                          track.muted ? "bg-rose-500/20 text-rose-400" : "text-muted-foreground hover:text-white"
                        }`}
                        title={track.muted ? "Sesi Aç" : "Sesi Kapat (Mute)"}
                      >
                        {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </Button>
                    )}

                    {/* Visibility */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleTrackVisible(track.id)}
                      className={`h-6 w-6 rounded-md ${
                        track.visible === false ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-white"
                      }`}
                      title={track.visible === false ? "Katmanı Göster" : "Katmanı Gizle"}
                    >
                      {track.visible === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>

                    {/* Lock */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleTrackLock(track.id)}
                      className={`h-6 w-6 rounded-md ${
                        track.locked ? "bg-rose-500/20 text-rose-400" : "text-muted-foreground hover:text-white"
                      }`}
                      title={track.locked ? "Kilidi Aç" : "Katmanı Kilitle"}
                    >
                      {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scrollable: Time Ruler + Multi-track Clips Area */}
        <div className="flex-1 flex flex-col relative" style={{ width: `${timelineWidth}px` }}>
          {/* Time Ruler (Height: 36px) */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="relative h-9 border-b border-border/80 bg-[#070A12] cursor-pointer select-none font-mono text-[10px] text-muted-foreground flex items-center"
          >
            {/* Seconds and Frame Ticks */}
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => {
              const isMajor = sec % 5 === 0;
              return (
                <div
                  key={sec}
                  className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                  style={{ left: `${sec * zoomLevel}px` }}
                >
                  <div
                    className={`border-l ${
                      isMajor ? "border-slate-400 h-3.5" : "border-slate-700/60 h-2"
                    }`}
                  />
                  {isMajor && (
                    <span className="text-[9px] font-bold text-slate-400 pl-1 pb-0.5 leading-none">
                      {sec}s
                    </span>
                  )}
                </div>
              );
            })}

            {/* Markers on Ruler */}
            {project.markers?.map((marker) => (
              <div
                key={marker.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(marker.time);
                }}
                className="absolute top-0 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-md cursor-pointer group"
                style={{
                  left: `${marker.time * zoomLevel}px`,
                  backgroundColor: marker.color || "#38BDF8",
                }}
                title={`${marker.label} (${marker.time.toFixed(1)}s)`}
              >
                <span>{marker.label}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveMarker(marker.id);
                  }}
                  className="hidden group-hover:inline opacity-70 hover:opacity-100 ml-1 text-[8px]"
                >
                  ×
                </span>
              </div>
            ))}
          </div>

          {/* Red Playhead Line across all tracks */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-40 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            style={{ left: `${currentTime * zoomLevel}px` }}
          >
            {/* Playhead Handle Bookmark */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-4 bg-rose-500 rounded-b-md shadow flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </div>

          {/* Tracks and Clips Canvas */}
          <div className="space-y-2 py-2">
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className={`relative h-16 rounded-xl border border-border/40 transition-colors ${
                  track.locked
                    ? "bg-secondary/20 opacity-60"
                    : track.visible === false
                    ? "bg-secondary/10 opacity-40"
                    : "bg-[#0E1424]/60 hover:bg-[#0E1424]/90"
                }`}
              >
                {/* Clips Container */}
                {track.clips.map((clip) => {
                  const isSelected = clip.id === selectedClipId;
                  const isBeingDragged = clip.id === draggingClipId;

                  const clipStart = isBeingDragged && currentDragStart !== null ? currentDragStart : clip.start;
                  const clipDuration = isBeingDragged && currentDragDuration !== null ? currentDragDuration : clip.duration;

                  const clipLeft = clipStart * zoomLevel;
                  const clipWidth = Math.max(16, clipDuration * zoomLevel);

                  const isVideo = clip.type === "video";
                  const isAudio = clip.type === "audio";
                  const isGraphics = clip.type === "graphics";
                  const isText = clip.type === "text";
                  const isImage = clip.type === "image";

                  const clipBg =
                    clip.color ||
                    (isGraphics
                      ? "#DC2626"
                      : isText
                      ? "#D97706"
                      : isVideo
                      ? "#0284C7"
                      : isAudio
                      ? "#059669"
                      : "#7C3AED");

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => handleClipMouseDown(e, clip, track, "MOVE")}
                      className={`absolute top-2 bottom-2 rounded-lg text-white shadow-lg cursor-move flex flex-col justify-between overflow-hidden transition-shadow border select-none group ${
                        isSelected
                          ? "ring-2 ring-white border-white scale-[1.005] z-20"
                          : "border-white/10 hover:border-white/40 hover:brightness-110 z-10"
                      }`}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                        backgroundColor: clipBg,
                      }}
                    >
                      {/* Left Trim Handle */}
                      {!track.locked && (
                        <div
                          onMouseDown={(e) => handleClipMouseDown(e, clip, track, "TRIM_LEFT")}
                          className="absolute left-0 top-0 bottom-0 w-2.5 bg-white/0 hover:bg-white/40 cursor-ew-resize z-30 transition flex items-center justify-center group/trimL"
                          title="Sol Giriş Noktasını Kırp (Trim In)"
                        >
                          <div className="w-0.5 h-4 bg-white/60 rounded" />
                        </div>
                      )}

                      {/* Clip Body Content & Thumbnails / Waveforms */}
                      <div className="px-3 pt-1 flex items-center justify-between text-xs font-bold leading-none pointer-events-none truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          {isGraphics && <Sparkles className="w-3 h-3 text-rose-200 flex-shrink-0" />}
                          {isText && <Type className="w-3 h-3 text-amber-200 flex-shrink-0" />}
                          {isVideo && <Film className="w-3 h-3 text-sky-200 flex-shrink-0" />}
                          {isAudio && <Music className="w-3 h-3 text-emerald-200 flex-shrink-0" />}
                          {isImage && <ImageIcon className="w-3 h-3 text-purple-200 flex-shrink-0" />}
                          <span className="truncate">{clip.name}</span>
                        </div>

                        <span className="text-[10px] font-mono opacity-80 flex-shrink-0 ml-1">
                          {clipDuration.toFixed(1)}s
                        </span>
                      </div>

                      {/* Waveform / Visual Bars Pattern */}
                      <div className="h-3 w-full opacity-30 flex items-end gap-0.5 px-2 pb-1 pointer-events-none overflow-hidden">
                        {isAudio ? (
                          Array.from({ length: Math.min(60, Math.floor(clipWidth / 4)) }).map((_, i) => (
                            <div
                              key={i}
                              className="w-0.5 bg-white rounded-full"
                              style={{ height: `${20 + ((i * 37) % 80)}%` }}
                            />
                          ))
                        ) : (
                          <div className="w-full h-1 bg-white/40 rounded-full" />
                        )}
                      </div>

                      {/* Right Trim Handle */}
                      {!track.locked && (
                        <div
                          onMouseDown={(e) => handleClipMouseDown(e, clip, track, "TRIM_RIGHT")}
                          className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/0 hover:bg-white/40 cursor-ew-resize z-30 transition flex items-center justify-center group/trimR"
                          title="Sağ Çıkış Noktasını Kırp (Trim Out)"
                        >
                          <div className="w-0.5 h-4 bg-white/60 rounded" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Drag Info Tooltip */}
      {draggingClipId && currentDragStart !== null && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl bg-black/90 backdrop-blur border border-sky-500/60 shadow-2xl text-sky-400 font-mono text-xs flex items-center gap-3">
          <div className="font-bold">SÜRÜKLE / TRIM:</div>
          <div>Başlangıç: {currentDragStart.toFixed(2)}s</div>
          {currentDragDuration !== null && <div>Süre: {currentDragDuration.toFixed(2)}s</div>}
        </div>
      )}
    </div>
  );
}
