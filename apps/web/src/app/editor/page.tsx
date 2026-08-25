"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
  Tv,
  LayoutGrid,
  Sliders,
  FolderOpen,
  Sparkles,
  Type,
  Music,
  ExternalLink,
  Layers,
  Monitor,
  Columns,
  Maximize,
  SlidersHorizontal,
  ChevronDown,
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
import { SourceMonitor } from "./components/SourceMonitor";
import { AudioMixerPanel } from "./components/AudioMixerPanel";
import { InteractiveTimeline } from "./components/InteractiveTimeline";
import { MediaLibraryPanel } from "./components/MediaLibraryPanel";
import { ClipInspector } from "./components/ClipInspector";
import { ExportModal } from "./components/ExportModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { audioEngine } from "./components/AudioEngine";
import { SampleMediaItem } from "./data/sampleMedia";

type WorkspaceMode = "edit" | "dual" | "cinema" | "audio";

export default function EditorPage() {
  // 1. Initial Timeline Project
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

  // 2. Workspace Layout Modes
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("edit");
  const [activeSideDrawer, setActiveSideDrawer] = useState<"media" | "inspector" | null>("media");
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false);

  // 3. History Stack
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

  // 4. Playback State
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
        setMediaAssets(Array.isArray(data) ? data : []);
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
    <div className="flex-1 flex flex-col h-screen w-screen bg-[#07090e] overflow-hidden select-none">
      {/* 1. Ultra-Thin Integrated NLE Master Bar (34px) */}
      <div className="h-9 px-2 bg-[#0d1017] border-b border-[#1e2538] flex items-center justify-between flex-shrink-0 z-30">
        {/* Left: App Switcher Dropdown & Project Title */}
        <div className="flex items-center gap-2">
          {/* Module Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAppMenuOpen(!isAppMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#161c2b] hover:bg-[#1f283d] text-white font-black text-xs border border-[#263047] transition shadow-sm"
            >
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              <span>MCR EDITÖR</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isAppMenuOpen && (
              <div
                className="absolute left-0 top-8 w-48 bg-[#0e131d] border border-[#263047] rounded-lg shadow-2xl p-1.5 z-50 space-y-1"
                onMouseLeave={() => setIsAppMenuOpen(false)}
              >
                <Link
                  href="/control"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-300 hover:bg-[#1a2233] hover:text-white transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-400" />
                  <span>Canlı Yayın Grafikleri</span>
                </Link>
                <Link
                  href="/ticker"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-300 hover:bg-[#1a2233] hover:text-white transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ticker Operatörü</span>
                </Link>
                <Link
                  href="/weather"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold text-slate-300 hover:bg-[#1a2233] hover:text-white transition"
                >
                  <Tv className="w-3.5 h-3.5 text-teal-400" />
                  <span>Meteoroloji Stüdyosu</span>
                </Link>
                <div className="h-px bg-[#1e2538] my-1" />
                <button
                  onClick={() => window.open("/output", "MCROutputWindow", "width=1920,height=1080")}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold text-sky-400 hover:bg-sky-950/40 transition text-left"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Çıkış Penceresi (Output)</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#1e2538]" />

          {/* Project Title Input */}
          <input
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            className="bg-transparent text-xs font-semibold text-slate-300 border-b border-transparent hover:border-[#1e2538] focus:border-sky-500 focus:outline-none px-1 py-0.5 max-w-[160px] truncate"
          />

          {/* SMPTE Timecode Counter */}
          <div className="px-2 py-0.5 rounded bg-black/70 border border-[#1e2538] font-mono flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 font-bold">TC</span>
            <span className="text-xs font-black text-sky-400 tracking-wider">
              {formatTimecode(currentTime, 50)}
            </span>
          </div>
        </div>

        {/* Center: Frame Transport Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="En Başa Dön (Home)"
          >
            <SkipBack className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCurrentTime((t) => Math.max(0, t - 1 / 50))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="1 Kare Geri (←)"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 shadow transition"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-white" />
            ) : (
              <Play className="w-3 h-3 fill-white ml-0.5" />
            )}
            <span>{isPlaying ? "DUR" : "OYNAT"}</span>
          </button>
          <button
            onClick={() => setCurrentTime((t) => Math.min(project.duration ?? 60, t + 1 / 50))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="1 Kare İleri (→)"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCurrentTime(project.duration ?? 60)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="En Sona Git (End)"
          >
            <SkipForward className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Workspace Layout Mode Switcher & Export */}
        <div className="flex items-center gap-2">
          {/* Workspace Layout Mode Tabs */}
          <div className="flex items-center bg-[#07090e] p-0.5 rounded border border-[#1e2538]">
            <button
              onClick={() => setWorkspaceMode("edit")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition ${
                workspaceMode === "edit"
                  ? "bg-[#1e2538] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Klasik Kurgu Düzeni"
            >
              <LayoutGrid className="w-3 h-3 text-sky-400" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setWorkspaceMode("dual")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition ${
                workspaceMode === "dual"
                  ? "bg-[#1e2538] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="İkili Monitör (Kaynak + Program)"
            >
              <Columns className="w-3 h-3 text-amber-400" />
              <span>Dual</span>
            </button>
            <button
              onClick={() => setWorkspaceMode("cinema")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition ${
                workspaceMode === "cinema"
                  ? "bg-[#1e2538] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Büyük Monitör / QC Önizleme"
            >
              <Maximize className="w-3 h-3 text-rose-400" />
              <span>Cinema</span>
            </button>
            <button
              onClick={() => setWorkspaceMode("audio")}
              className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 transition ${
                workspaceMode === "audio"
                  ? "bg-[#1e2538] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Ses Mikseri & VU Göstergeleri"
            >
              <Sliders className="w-3 h-3 text-emerald-400" />
              <span>Audio</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#1e2538]" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="Geri Al (Ctrl+Z)"
            >
              <Undo2 className="w-3 h-3" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="İleri Al (Ctrl+Y)"
            >
              <Redo2 className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1e2538] transition"
            title="Klavye Kısayolları (?)"
          >
            <Keyboard className="w-3 h-3" />
          </button>

          {/* Export Button */}
          <Button
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="h-6 text-[11px] font-bold px-2.5 gap-1 bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
          >
            <Download className="w-3 h-3" />
            <span>EXPORT</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Workstation Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Far-Left Vertical Activity Dock */}
        <div className="w-10 bg-[#0a0d14] border-r border-[#1e2538] flex flex-col items-center py-2 gap-2 flex-shrink-0 z-20">
          <button
            onClick={() => setActiveSideDrawer(activeSideDrawer === "media" ? null : "media")}
            className={`p-2 rounded-lg transition ${
              activeSideDrawer === "media"
                ? "bg-sky-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#161c2b]"
            }`}
            title="Medya & Varlık Kütüphanesi"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveSideDrawer(activeSideDrawer === "inspector" ? null : "inspector")}
            className={`p-2 rounded-lg transition ${
              activeSideDrawer === "inspector"
                ? "bg-sky-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#161c2b]"
            }`}
            title="Klip Özellikleri (Inspector)"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Center Workstation View (Split Grid by Workspace Mode) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Half: Monitors & Side Drawers */}
          <div
            className={`flex-1 grid gap-1.5 p-1.5 overflow-hidden transition-all ${
              workspaceMode === "cinema"
                ? "h-[70%]"
                : "h-[54%]"
            }`}
            style={{
              gridTemplateColumns:
                activeSideDrawer === "media" && workspaceMode === "edit"
                  ? "280px 1fr 300px"
                  : activeSideDrawer === "media"
                  ? "280px 1fr"
                  : activeSideDrawer === "inspector"
                  ? "1fr 300px"
                  : "1fr",
            }}
          >
            {/* Drawer 1: Media Library (if open) */}
            {activeSideDrawer === "media" && (
              <div className="h-full overflow-hidden">
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
            )}

            {/* Central Monitor Surface based on Layout Mode */}
            <div className="h-full overflow-hidden flex gap-1.5">
              {/* Dual Monitor Mode: Left Source Preview */}
              {workspaceMode === "dual" && (
                <div className="flex-1 h-full overflow-hidden">
                  <SourceMonitor
                    clip={selectedClip}
                    onInsertToTimeline={() => selectedClip && handleAddAsset(selectedClip as any)}
                  />
                </div>
              )}

              {/* Master Program Monitor */}
              <div className="flex-1 h-full overflow-hidden flex flex-col">
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

              {/* Audio Mixer Mode: Right Mixer Strips */}
              {workspaceMode === "audio" && (
                <div className="flex-1 h-full overflow-hidden">
                  <AudioMixerPanel
                    project={project}
                    isPlaying={isPlaying}
                    onToggleTrackMute={handleToggleTrackMute}
                  />
                </div>
              )}
            </div>

            {/* Drawer 2: Clip Inspector (if open and in Edit mode) */}
            {(activeSideDrawer === "inspector" || (activeSideDrawer === "media" && workspaceMode === "edit")) && (
              <div className="h-full overflow-hidden">
                <ClipInspector clip={selectedClip} onUpdateClip={handleUpdateClip} />
              </div>
            )}
          </div>

          {/* Bottom Half: Multi-Track Interactive Timeline */}
          <div
            className={`p-1.5 pt-0 overflow-hidden flex flex-col transition-all ${
              workspaceMode === "cinema" ? "h-[30%]" : "h-[46%]"
            }`}
          >
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
        </div>
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
