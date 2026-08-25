"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Film,
  Play,
  Pause,
  Scissors,
  Download,
  ChevronRight,
  ChevronLeft,
  Undo2,
  Redo2,
  Keyboard,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TimelineProject,
  TimelineClip,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
  TextClip,
  ImageClip,
  Track,
} from "@mcr/schema";
import {
  createDefaultTimelineProject,
  addClipToTrack,
  removeClip,
  moveClip,
  duplicateClip,
  updateClipProperties,
  splitClip,
  trimClip,
  addTrack,
  removeTrack,
  updateTrack,
  addMarker,
  removeMarker,
  formatTimecode,
} from "@mcr/timeline";
import { MediaAsset } from "@mcr/db";
import { ProgramMonitor } from "./components/ProgramMonitor";
import { InteractiveTimeline } from "./components/InteractiveTimeline";
import { MediaLibraryPanel } from "./components/MediaLibraryPanel";
import { ClipInspector } from "./components/ClipInspector";
import { ExportModal } from "./components/ExportModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { audioEngine } from "./components/AudioEngine";
import { SampleMediaItem } from "./data/sampleMedia";

export default function EditorPage() {
  // 1. Initial Rich Timeline Project
  const [project, setProject] = useState<TimelineProject>(() => {
    const p = createDefaultTimelineProject("Bülten Master Kurgusu");
    p.duration = 45;

    // G1 Graphics Track
    p.tracks[0].clips = [
      {
        id: "clip_g1",
        name: "Alt Bant: Ahmet Yılmaz",
        type: "graphics",
        templateId: "lower-third.standard",
        start: 2,
        duration: 6,
        offset: 0,
        inDuration: 0.6,
        outDuration: 0.4,
        data: {
          title: "Ahmet Yılmaz",
          subtitle: "Dış Politika Uzmanı • Canlı",
          category: "RÖPORTAJ",
          accent: "#C8102E",
        },
        color: "#DC2626",
      },
    ];

    // T1 Text Track
    p.tracks[1].clips = [
      {
        id: "clip_t1",
        name: "Manşet: Gündem",
        type: "text",
        text: "TÜRKİYE & BÖLGE GÜNDEMİ",
        start: 0,
        duration: 5,
        offset: 0,
        fontSize: 44,
        textColor: "#FFFFFF",
        backgroundColor: "rgba(10, 15, 29, 0.85)",
        textAlign: "center",
        color: "#D97706",
      },
    ];

    // V1 Video Track
    p.tracks[2].clips = [
      {
        id: "clip_v1",
        name: "Ana Haber Stüdyosu (Canlı)",
        type: "video",
        src: "synthetic://studio",
        start: 0,
        duration: 12,
        offset: 0,
        volume: 1,
        speed: 1,
        scale: 1,
        opacity: 1,
        color: "#0284C7",
      },
      {
        id: "clip_v2",
        name: "Şehir & Trafik B-Roll",
        type: "video",
        src: "synthetic://city",
        start: 12,
        duration: 16,
        offset: 0,
        volume: 1,
        speed: 1,
        scale: 1,
        opacity: 1,
        color: "#0EA5E9",
      },
    ];

    // A1 Main Audio Track
    p.tracks[3].clips = [
      {
        id: "clip_a1",
        name: "Muhabir Seslendirme (VO)",
        type: "audio",
        src: "synthetic://audio_voice",
        start: 0,
        duration: 28,
        offset: 0,
        volume: 0.9,
        fadeIn: 0.5,
        fadeOut: 1.0,
        color: "#10B981",
      },
    ];

    // A2 Music Audio Track
    p.tracks[4].clips = [
      {
        id: "clip_a2",
        name: "Haber Açılış Jingle",
        type: "audio",
        src: "synthetic://audio_jingle",
        start: 0,
        duration: 6,
        offset: 0,
        volume: 0.7,
        fadeIn: 0.2,
        fadeOut: 1.5,
        color: "#059669",
      },
    ];

    return p;
  });

  // 2. History Stack
  const [history, setHistory] = useState<TimelineProject[]>([]);
  const [redoStack, setRedoStack] = useState<TimelineProject[]>([]);

  const pushStateToHistory = useCallback((newProject: TimelineProject) => {
    setHistory((prev) => [...prev.slice(-20), project]);
    setRedoStack([]);
    setProject(newProject);
  }, [project]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [project, ...prev]);
    setProject(previous);
  }, [history, project]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setHistory((prev) => [...prev, project]);
    setProject(next);
  }, [redoStack, project]);

  // 3. Playback State
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [selectedClipId, setSelectedClipId] = useState<string | null>("clip_g1");

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // MAM Media State
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const canvasRefInstance = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Fetch Media Assets on Load
  const fetchMediaAssets = async () => {
    try {
      const res = await fetch("/api/media/list");
      if (res.ok) {
        const data = await res.json();
        setMediaAssets(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchMediaAssets();
  }, []);

  // Playback Loop
  useEffect(() => {
    const projDuration = project.duration ?? 60;
    if (isPlaying) {
      audioEngine.resume();
      lastTickRef.current = Date.now();
      const loop = () => {
        const now = Date.now();
        const delta = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;

        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= projDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, project.duration]);

  // Handle File Upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(`Yükleniyor: ${file.name}...`);

    try {
      const blobUrl = URL.createObjectURL(file);
      const localAsset: MediaAsset = {
        id: `media_${Date.now()}`,
        filename: file.name,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        durationSeconds: 10,
        width: 1920,
        height: 1080,
        fps: 50,
        thumbnailUrl: blobUrl,
        filePath: blobUrl,
        createdAt: Date.now(),
      };

      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          await fetch("/api/media/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originalName: file.name,
              mimeType: file.type,
              base64Data: base64,
            }),
          });
          fetchMediaAssets();
        };
        reader.readAsDataURL(file);
      } catch {}

      setMediaAssets((prev) => [localAsset, ...prev]);
      setUploadProgress("Dosya hazır!");
      setTimeout(() => setUploadProgress(""), 2000);
      setIsUploading(false);
    } catch {
      setIsUploading(false);
      setUploadProgress("Yükleme hatası");
    }
  };

  // Add Asset to Timeline
  const handleAddAsset = (asset: MediaAsset) => {
    const isAudio = asset.mimeType.startsWith("audio");
    let targetTrack = project.tracks.find((t) => (isAudio ? t.type === "audio" : t.type === "video"));
    if (!targetTrack) targetTrack = project.tracks[0];

    const newClip: TimelineClip = isAudio
      ? {
          id: `clip_a_${Date.now()}`,
          name: asset.originalName,
          type: "audio",
          src: asset.filePath,
          start: currentTime,
          duration: asset.durationSeconds || 10,
          offset: 0,
          volume: 1,
          color: "#059669",
        }
      : {
          id: `clip_v_${Date.now()}`,
          name: asset.originalName,
          type: "video",
          src: asset.filePath,
          start: currentTime,
          duration: asset.durationSeconds || 10,
          offset: 0,
          volume: 1,
          scale: 1,
          opacity: 1,
          color: "#2563EB",
        };

    const nextProject = addClipToTrack(project, targetTrack.id, newClip);
    pushStateToHistory(nextProject);
    setSelectedClipId(newClip.id);
  };

  const handleAddStockMedia = (item: SampleMediaItem) => {
    let targetTrack = project.tracks.find((t) => t.type === item.type);
    if (!targetTrack) targetTrack = project.tracks[0];

    const newClip: TimelineClip =
      item.type === "video"
        ? {
            id: `clip_v_${Date.now()}`,
            name: item.name,
            type: "video",
            src: item.src,
            start: currentTime,
            duration: item.duration,
            offset: 0,
            volume: 1,
            scale: 1,
            opacity: 1,
            color: "#2563EB",
          }
        : {
            id: `clip_a_${Date.now()}`,
            name: item.name,
            type: "audio",
            src: item.src,
            start: currentTime,
            duration: item.duration,
            offset: 0,
            volume: 0.8,
            color: "#059669",
          };

    const nextProject = addClipToTrack(project, targetTrack.id, newClip);
    pushStateToHistory(nextProject);
    setSelectedClipId(newClip.id);
  };

  const handleAddOGrafTemplate = (tmpl: any) => {
    let targetTrack = project.tracks.find((t) => t.type === "graphics");
    if (!targetTrack) targetTrack = project.tracks[0];

    const newClip: GraphicsOverlayClip = {
      id: `clip_g_${Date.now()}`,
      name: tmpl.name,
      type: "graphics",
      templateId: tmpl.templateId,
      start: currentTime,
      duration: tmpl.duration,
      offset: 0,
      inDuration: 0.5,
      outDuration: 0.5,
      data: {
        title: "Konuk İsim Soyisim",
        subtitle: "Uzman Ünvan / Canlı Bağlantı",
        category: "CANLI",
        accent: "#C8102E",
      },
      color: "#DC2626",
    };

    const nextProject = addClipToTrack(project, targetTrack.id, newClip);
    pushStateToHistory(nextProject);
    setSelectedClipId(newClip.id);
  };

  const handleAddTextPreset = (preset: any) => {
    let targetTrack = project.tracks.find((t) => t.type === "text");
    if (!targetTrack) targetTrack = project.tracks[0];

    const newClip: TextClip = {
      id: `clip_t_${Date.now()}`,
      name: preset.name,
      type: "text",
      text: preset.text,
      start: currentTime,
      duration: preset.duration,
      offset: 0,
      fontSize: preset.fontSize,
      textColor: "#FFFFFF",
      backgroundColor: "rgba(10, 15, 29, 0.85)",
      textAlign: "center",
      color: "#D97706",
    };

    const nextProject = addClipToTrack(project, targetTrack.id, newClip);
    pushStateToHistory(nextProject);
    setSelectedClipId(newClip.id);
  };

  // Timeline Mutations
  const handleMoveClip = (clipId: string, newStart: number, targetTrackId?: string) => {
    const nextProject = moveClip(project, clipId, newStart, targetTrackId);
    pushStateToHistory(nextProject);
  };

  const handleTrimClip = (clipId: string, newStart: number, newDuration: number, newOffset?: number) => {
    const nextProject = trimClip(project, clipId, newStart, newDuration, newOffset);
    pushStateToHistory(nextProject);
  };

  const handleSplitClip = (clipId: string, splitTime: number) => {
    const nextProject = splitClip(project, clipId, splitTime);
    pushStateToHistory(nextProject);
  };

  const handleDeleteClip = (clipId: string) => {
    const nextProject = removeClip(project, clipId);
    pushStateToHistory(nextProject);
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  const handleDuplicateClip = (clipId: string) => {
    const nextProject = duplicateClip(project, clipId);
    pushStateToHistory(nextProject);
  };

  const handleUpdateClip = (clipId: string, partial: any) => {
    const nextProject = updateClipProperties(project, clipId, partial);
    pushStateToHistory(nextProject);
  };

  const handleAddTrack = (type: "video" | "audio" | "graphics" | "text") => {
    const nextProject = addTrack(project, type);
    pushStateToHistory(nextProject);
  };

  const handleRemoveTrack = (trackId: string) => {
    const nextProject = removeTrack(project, trackId);
    pushStateToHistory(nextProject);
  };

  const handleToggleTrackMute = (trackId: string) => {
    const tr = project.tracks.find((t) => t.id === trackId);
    if (!tr) return;
    const nextProject = updateTrack(project, trackId, { muted: !tr.muted });
    pushStateToHistory(nextProject);
  };

  const handleToggleTrackVisible = (trackId: string) => {
    const tr = project.tracks.find((t) => t.id === trackId);
    if (!tr) return;
    const nextProject = updateTrack(project, trackId, { visible: !tr.visible });
    pushStateToHistory(nextProject);
  };

  const handleToggleTrackLock = (trackId: string) => {
    const tr = project.tracks.find((t) => t.id === trackId);
    if (!tr) return;
    const nextProject = updateTrack(project, trackId, { locked: !tr.locked });
    pushStateToHistory(nextProject);
  };

  const handleAddMarker = (time: number, label?: string) => {
    const nextProject = addMarker(project, time, label || "İşaret", "#F59E0B");
    pushStateToHistory(nextProject);
  };

  const handleRemoveMarker = (markerId: string) => {
    const nextProject = removeMarker(project, markerId);
    pushStateToHistory(nextProject);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 1 / 50));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentTime((t) => Math.min(project.duration ?? 60, t + 1 / 50));
      } else if (e.code === "Home") {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.code === "End") {
        e.preventDefault();
        setCurrentTime(project.duration ?? 60);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        if (selectedClipId) {
          e.preventDefault();
          handleSplitClip(selectedClipId, currentTime);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, project.duration, selectedClipId, currentTime, handleUndo, handleRedo]);

  const selectedClip = project.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId) || null;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#07090e] overflow-hidden select-none">
      {/* 1. Top Compact Header & Transport Bar */}
      <div className="h-11 px-3 bg-[#0e1217] border-b border-[#1e2538] flex items-center justify-between flex-shrink-0 z-20">
        {/* Left: Project Title & Timecode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-sky-400" />
            <input
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
              className="bg-transparent text-xs font-bold text-slate-200 border-b border-transparent hover:border-[#1e2538] focus:border-sky-500 focus:outline-none px-1 py-0.5"
            />
          </div>

          <div className="h-4 w-px bg-[#1e2538]" />

          {/* Timecode SMPTE Display */}
          <div className="px-2.5 py-0.5 rounded bg-black/60 border border-[#1e2538] font-mono flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold">TC</span>
            <span className="text-base font-bold text-sky-400 tracking-wider">
              {formatTimecode(currentTime, 50)}
            </span>
          </div>

          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            / {formatTimecode(project.duration || 60, 50)}
          </span>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="Başa Dön (Home)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentTime((t) => Math.max(0, t - 1 / 50))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="1 Kare Geri (←)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            )}
            <span>{isPlaying ? "DUR" : "OYNAT"}</span>
          </button>
          <button
            onClick={() => setCurrentTime((t) => Math.min(project.duration ?? 60, t + 1 / 50))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="1 Kare İleri (→)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentTime(project.duration ?? 60)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="Sona Git (End)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: History, Shortcuts, Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0b0e14] p-0.5 rounded border border-[#1e2538]">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="Geri Al (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="İleri Al (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="Klavye Kısayolları"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          <Button
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="h-7 text-xs font-semibold gap-1.5 bg-sky-600 hover:bg-sky-500 text-white shadow"
          >
            <Download className="w-3 h-3" />
            <span>EXPORT</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Half: 3-Panel Studio Workspace (Media | Monitor | Inspector) */}
      <div className="h-[52%] grid grid-cols-12 gap-1.5 p-1.5 overflow-hidden">
        {/* Left 3 Cols: Media Library */}
        <div className="col-span-3 h-full overflow-hidden">
          <MediaLibraryPanel
            mediaAssets={mediaAssets}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            onUploadFile={handleFileUpload}
            onAddStockMedia={handleAddStockMedia}
            onAddOGrafTemplate={handleAddOGrafTemplate}
            onAddTextPreset={handleAddTextPreset}
            onAddAsset={handleAddAsset}
          />
        </div>

        {/* Center 6 Cols: Program Monitor */}
        <div className="col-span-6 h-full overflow-hidden flex flex-col">
          <ProgramMonitor
            project={project}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            canvasRefCallback={(c) => {
              canvasRefInstance.current = c;
            }}
          />
        </div>

        {/* Right 3 Cols: Clip Inspector */}
        <div className="col-span-3 h-full overflow-hidden">
          <ClipInspector clip={selectedClip} onUpdateClip={handleUpdateClip} />
        </div>
      </div>

      {/* 3. Bottom Half: Multi-Track Interactive Timeline */}
      <div className="h-[48%] p-1.5 pt-0 overflow-hidden flex flex-col">
        <InteractiveTimeline
          project={project}
          currentTime={currentTime}
          selectedClipId={selectedClipId}
          onSelectClip={setSelectedClipId}
          onSeek={setCurrentTime}
          onMoveClip={handleMoveClip}
          onTrimClip={handleTrimClip}
          onSplitClip={handleSplitClip}
          onDeleteClip={handleDeleteClip}
          onDuplicateClip={handleDuplicateClip}
          onAddTrack={handleAddTrack}
          onRemoveTrack={handleRemoveTrack}
          onToggleTrackMute={handleToggleTrackMute}
          onToggleTrackVisible={handleToggleTrackVisible}
          onToggleTrackLock={handleToggleTrackLock}
          onAddMarker={handleAddMarker}
          onRemoveMarker={handleRemoveMarker}
        />
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        canvas={canvasRefInstance.current}
        onSeek={setCurrentTime}
        onSetIsPlaying={setIsPlaying}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
