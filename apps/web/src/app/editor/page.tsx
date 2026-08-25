"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Film,
  Play,
  Pause,
  Scissors,
  Plus,
  Trash2,
  Download,
  Layers,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  FileVideo,
  Settings2,
  UploadCloud,
  FolderOpen,
  Music,
  CheckCircle2,
  RefreshCw,
  Undo2,
  Redo2,
  Keyboard,
  SkipBack,
  SkipForward,
  Sparkles,
  Tv,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    const p = createDefaultTimelineProject("Akşam Bülteni Master Kurgu");
    p.duration = 60;

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
        name: "Manşet: Kritik Zirve",
        type: "text",
        text: "TÜRKİYE & BÖLGE GÜNDEMİ",
        start: 0,
        duration: 4,
        offset: 0,
        fontSize: 48,
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

    // A2 Music / Jingle Audio Track
    p.tracks[4].clips = [
      {
        id: "clip_a2",
        name: "Ana Haber Açılış Jingle",
        type: "audio",
        src: "synthetic://audio_jingle",
        start: 0,
        duration: 8,
        offset: 0,
        volume: 0.7,
        fadeIn: 0.2,
        fadeOut: 1.5,
        color: "#059669",
      },
    ];

    return p;
  });

  // 2. Undo / Redo History Stack
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
  const [rightTab, setRightTab] = useState<"mam" | "inspector">("mam");

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

  // Handle Playback Loop
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

  // Handle File Upload (Real Video/Audio/Image)
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(`Yükleniyor: ${file.name}...`);

    try {
      const blobUrl = URL.createObjectURL(file);
      const isAudio = file.type.startsWith("audio");
      const isImage = file.type.startsWith("image");

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

      // Also try uploading to server MAM
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
      setUploadProgress("Dosya hazır! Timeline'a eklenebilir.");
      setTimeout(() => setUploadProgress(""), 3000);
      setIsUploading(false);
    } catch {
      setIsUploading(false);
      setUploadProgress("Yükleme hatası");
    }
  };

  // Add Asset directly to Timeline
  const handleAddAsset = (asset: MediaAsset) => {
    const isAudio = asset.mimeType.startsWith("audio");
    const isImage = asset.mimeType.startsWith("image");

    let targetTrack = project.tracks.find((t) => (isAudio ? t.type === "audio" : isImage ? t.type === "video" : t.type === "video"));
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
          fadeIn: 0,
          fadeOut: 0,
          color: "#10B981",
        }
      : isImage
      ? {
          id: `clip_img_${Date.now()}`,
          name: asset.originalName,
          type: "image",
          src: asset.filePath,
          start: currentTime,
          duration: 6,
          offset: 0,
          scale: 1,
          opacity: 1,
          color: "#7C3AED",
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
          speed: 1,
          scale: 1,
          opacity: 1,
          color: "#0284C7",
        };

    pushStateToHistory(addClipToTrack(project, targetTrack.id, newClip));
    setSelectedClipId(newClip.id);
    setRightTab("inspector");
  };

  // Add Stock Media Item
  const handleAddStockMedia = (item: SampleMediaItem) => {
    const isAudio = item.type === "audio";
    let targetTrack = project.tracks.find((t) => (isAudio ? t.type === "audio" : t.type === "video"));
    if (!targetTrack) targetTrack = project.tracks[0];

    const newClip: TimelineClip = isAudio
      ? {
          id: `clip_a_${Date.now()}`,
          name: item.name,
          type: "audio",
          src: item.src || "synthetic://audio",
          start: currentTime,
          duration: item.duration,
          offset: 0,
          volume: 1,
          fadeIn: 0.2,
          fadeOut: 0.5,
          color: item.color || "#10B981",
        }
      : {
          id: `clip_v_${Date.now()}`,
          name: item.name,
          type: "video",
          src: item.src || "synthetic://video",
          start: currentTime,
          duration: item.duration,
          offset: 0,
          volume: 1,
          speed: 1,
          scale: 1,
          opacity: 1,
          color: item.color || "#0284C7",
        };

    pushStateToHistory(addClipToTrack(project, targetTrack.id, newClip));
    setSelectedClipId(newClip.id);
    setRightTab("inspector");
  };

  // Add OGraf Template Clip
  const handleAddOGrafTemplate = (template: any) => {
    let targetTrack = project.tracks.find((t) => t.type === "graphics");
    if (!targetTrack) targetTrack = project.tracks[0];

    const newClip: GraphicsOverlayClip = {
      id: `clip_g_${Date.now()}`,
      name: template.name,
      type: "graphics",
      templateId: template.templateId,
      start: currentTime,
      duration: template.duration || 6,
      offset: 0,
      inDuration: 0.5,
      outDuration: 0.4,
      data: template.defaultData || {},
      color: template.color || "#DC2626",
    };

    pushStateToHistory(addClipToTrack(project, targetTrack.id, newClip));
    setSelectedClipId(newClip.id);
    setRightTab("inspector");
  };

  // Add Text Preset Clip
  const handleAddTextPreset = (preset: any) => {
    let targetTrack = project.tracks.find((t) => t.type === "text");
    if (!targetTrack) targetTrack = project.tracks[0];

    const newClip: TextClip = {
      id: `clip_t_${Date.now()}`,
      name: preset.name,
      type: "text",
      text: preset.text,
      start: currentTime,
      duration: preset.duration || 5,
      offset: 0,
      fontSize: preset.fontSize || 48,
      fontWeight: preset.fontWeight || "bold",
      textColor: preset.textColor || "#FFFFFF",
      backgroundColor: preset.backgroundColor || "rgba(10,15,29,0.9)",
      textAlign: preset.textAlign || "center",
      color: "#D97706",
    };

    pushStateToHistory(addClipToTrack(project, targetTrack.id, newClip));
    setSelectedClipId(newClip.id);
    setRightTab("inspector");
  };

  // Timeline Handlers
  const handleMoveClip = (clipId: string, newStart: number, targetTrackId?: string) => {
    pushStateToHistory(moveClip(project, clipId, newStart, targetTrackId));
  };

  const handleTrimClip = (clipId: string, newStart: number, newDuration: number, newOffset?: number) => {
    pushStateToHistory(trimClip(project, clipId, newStart, newDuration, newOffset));
  };

  const handleSplitClip = (clipId: string, splitTime: number) => {
    pushStateToHistory(splitClip(project, clipId, splitTime));
  };

  const handleDeleteClip = (clipId: string) => {
    pushStateToHistory(removeClip(project, clipId));
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  const handleDuplicateClip = (clipId: string) => {
    pushStateToHistory(duplicateClip(project, clipId));
  };

  const handleUpdateClip = (clipId: string, partial: Partial<TimelineClip> | Record<string, any>) => {
    pushStateToHistory(updateClipProperties(project, clipId, partial));
  };

  const handleAddTrack = (type: "video" | "audio" | "graphics" | "text") => {
    pushStateToHistory(addTrack(project, type));
  };

  const handleRemoveTrack = (trackId: string) => {
    pushStateToHistory(removeTrack(project, trackId));
  };

  const handleToggleTrackMute = (trackId: string) => {
    const track = project.tracks.find((t) => t.id === trackId);
    if (!track) return;
    pushStateToHistory(updateTrack(project, trackId, { muted: !track.muted }));
  };

  const handleToggleTrackVisible = (trackId: string) => {
    const track = project.tracks.find((t) => t.id === trackId);
    if (!track) return;
    pushStateToHistory(updateTrack(project, trackId, { visible: track.visible === false ? true : false }));
  };

  const handleToggleTrackLock = (trackId: string) => {
    const track = project.tracks.find((t) => t.id === trackId);
    if (!track) return;
    pushStateToHistory(updateTrack(project, trackId, { locked: !track.locked }));
  };

  const handleAddMarker = (time: number, label = "İşaretçi") => {
    pushStateToHistory(addMarker(project, time, label));
  };

  const handleRemoveMarker = (markerId: string) => {
    pushStateToHistory(removeMarker(project, markerId));
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input / textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "KeyC") {
        e.preventDefault();
        if (selectedClipId) handleSplitClip(selectedClipId, currentTime);
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      } else if (e.ctrlKey && e.code === "KeyD") {
        e.preventDefault();
        if (selectedClipId) handleDuplicateClip(selectedClipId);
      } else if (e.ctrlKey && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.ctrlKey && e.code === "KeyY") {
        e.preventDefault();
        handleRedo();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 1 / 50;
        setCurrentTime((t) => Math.max(0, t - step));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const step = e.shiftKey ? 1.0 : 1 / 50;
        const dur = project.duration ?? 60;
        setCurrentTime((t) => Math.min(dur, t + step));
      } else if (e.code === "Home") {
        e.preventDefault();
        setCurrentTime(0);
      } else if (e.code === "End") {
        e.preventDefault();
        setCurrentTime(project.duration ?? 60);
      } else if (e.code === "KeyM") {
        e.preventDefault();
        handleAddMarker(currentTime);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipId, currentTime, project.duration, handleUndo, handleRedo]);

  const selectedClip = project.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId) || null;

  return (
    <div className="flex-1 flex flex-col p-5 space-y-4 max-w-[1920px] mx-auto w-full select-none">
      {/* Top Transport & Action Bar */}
      <Card className="p-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl border-border bg-card/90 backdrop-blur">
        {/* Left: Project Info & SMPTE Timecode */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground font-mono">1920x1080 @ 50fps EDL Master</p>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Timecode SMPTE readout */}
          <div className="bg-black/90 px-4 py-1.5 rounded-xl border border-border font-mono shadow-inner">
            <div className="text-[9px] text-muted-foreground font-bold tracking-wider">
              PLAYHEAD TIMECODE
            </div>
            <div className="text-2xl font-black text-sky-400 tracking-widest leading-none">
              {formatTimecode(currentTime, 50)}
            </div>
          </div>
        </div>

        {/* Center: Playback Transport Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime(0)}
            className="h-9 w-9 text-muted-foreground hover:text-white"
            title="En Başa Dön (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime((t) => Math.max(0, t - 1 / 50))}
            className="h-9 w-9"
            title="1 Kare Geri (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="broadcastTake"
            size="default"
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-2 px-6 h-9 font-bold shadow-lg"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
            <span>{isPlaying ? "DURDUR" : "OYNAT"}</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime((t) => Math.min(project.duration ?? 60, t + 1 / 50))}
            className="h-9 w-9"
            title="1 Kare İleri (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime(project.duration ?? 60)}
            className="h-9 w-9 text-muted-foreground hover:text-white"
            title="En Sona Git (End)"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Right: History, Shortcuts, Export */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-0.5 border border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="h-8 w-8 text-muted-foreground hover:text-white"
              title="Geri Al (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="h-8 w-8 text-muted-foreground hover:text-white"
              title="İleri Al (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="h-9 gap-1.5 font-bold text-slate-300"
            title="Klavye Kısayolları"
          >
            <Keyboard className="w-4 h-4 text-sky-400" />
            <span>Kısayollar</span>
          </Button>

          <Button
            variant="broadcastSuccess"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="h-9 gap-2 font-bold px-4 shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT / RENDER</span>
          </Button>
        </div>
      </Card>

      {/* Main Workspace (Top Grid: Monitor & Media Library / Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 Columns: Program Monitor */}
        <div className="lg:col-span-7 flex flex-col">
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

        {/* Right 5 Columns: MAM Media Library & Clip Inspector */}
        <Card className="lg:col-span-5 p-4 shadow-2xl flex flex-col border-border bg-card/95">
          <Tabs
            value={rightTab}
            onValueChange={(v) => setRightTab(v as "mam" | "inspector")}
            className="flex-1 flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <TabsList className="grid grid-cols-2 w-72 h-8">
                <TabsTrigger value="mam" className="text-xs font-bold gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>Medya & Şablonlar</span>
                </TabsTrigger>
                <TabsTrigger value="inspector" className="text-xs font-bold gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Klip Özellikleri</span>
                </TabsTrigger>
              </TabsList>

              {selectedClip && (
                <Badge variant="outline" className="font-mono text-[10px] text-slate-300">
                  {selectedClip.name}
                </Badge>
              )}
            </div>

            <TabsContent value="mam" className="flex-1 flex flex-col mt-0">
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
            </TabsContent>

            <TabsContent value="inspector" className="flex-1 flex flex-col mt-0">
              <ClipInspector clip={selectedClip} onUpdateClip={handleUpdateClip} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Bottom Section: Multi-Track Interactive Timeline */}
      <InteractiveTimeline
        project={project}
        currentTime={currentTime}
        selectedClipId={selectedClipId}
        onSelectClip={(id) => {
          setSelectedClipId(id);
          if (id) setRightTab("inspector");
        }}
        onSeek={(t) => setCurrentTime(t)}
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

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        canvas={canvasRefInstance.current}
        onSeek={(t) => setCurrentTime(t)}
        onSetIsPlaying={(p) => setIsPlaying(p)}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
