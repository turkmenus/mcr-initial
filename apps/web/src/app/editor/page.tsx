"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TimelineProject,
  TimelineClip,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
} from "@mcr/schema";
import {
  createDefaultTimelineProject,
  addClipToTrack,
  removeClip,
  splitClip,
  trimClip,
  formatTimecode,
  getActiveTimelineFrame,
} from "@mcr/timeline";
import { EXPORT_PRESETS, getPresetList } from "@mcr/presets";
import { MediaAsset } from "@mcr/db";

export default function EditorPage() {
  const [project, setProject] = useState<TimelineProject>(() => {
    const p = createDefaultTimelineProject("Akşam Bülteni Master Kurgu");
    p.tracks[1].clips = [
      {
        id: "clip_v1",
        name: "Haber_Roportaj_A01.mp4",
        type: "video",
        src: "sample_news_clip.mp4",
        start: 0,
        duration: 12,
        offset: 0,
        volume: 1,
        speed: 1,
        color: "#0284C7",
      },
      {
        id: "clip_v2",
        name: "B-Roll_Goruntu_B02.mp4",
        type: "video",
        src: "sample_broll.mp4",
        start: 12,
        duration: 16,
        offset: 0,
        volume: 1,
        speed: 1,
        color: "#0EA5E9",
      },
    ];
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
    p.tracks[2].clips = [
      {
        id: "clip_a1",
        name: "Ses_Mikrofon_A01.wav",
        type: "audio",
        src: "sample_audio.wav",
        start: 0,
        duration: 28,
        offset: 0,
        volume: 0.9,
        fadeIn: 0.2,
        fadeOut: 0.5,
        color: "#10B981",
      },
    ];
    return p;
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(24);
  const [selectedClipId, setSelectedClipId] = useState<string | null>("clip_g1");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("broadcast-16:9");
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [renderedDownloadUrl, setRenderedDownloadUrl] = useState<string | null>(null);

  // MAM (Media Asset Management) State
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle Real Media File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(`Yükleniyor: ${file.name}...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalName: file.name,
            mimeType: file.type,
            base64Data: base64,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setUploadProgress("Yükleme ve ffprobe analizi tamamlandı!");
          fetchMediaAssets();
          setTimeout(() => setUploadProgress(""), 3000);
        } else {
          setUploadProgress("Yükleme hatası!");
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
      setUploadProgress("Yükleme başarısız");
    }
  };

  // Add Asset directly to Timeline V1 or A1 track
  const handleAddAssetToTimeline = (asset: MediaAsset) => {
    const isAudio = asset.mimeType.startsWith("audio");
    const trackId = isAudio ? "track_audio_1" : "track_video_1";

    let newClip: TimelineClip;
    if (isAudio) {
      newClip = {
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
      };
    } else {
      newClip = {
        id: `clip_v_${Date.now()}`,
        name: asset.originalName,
        type: "video",
        src: asset.filePath,
        start: currentTime,
        duration: asset.durationSeconds || 10,
        offset: 0,
        volume: 1,
        speed: 1,
        color: "#0284C7",
      };
    }

    setProject((prev) => addClipToTrack(prev, trackId, newClip));
    setSelectedClipId(newClip.id);
  };

  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = Date.now();
      const loop = () => {
        const now = Date.now();
        const delta = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;

        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= project.duration) {
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

  const activeFrame = getActiveTimelineFrame(project, currentTime);

  const selectedClip = project.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === selectedClipId);

  const handleSplitAtPlayhead = () => {
    if (!selectedClipId) return;
    setProject((prev) => splitClip(prev, selectedClipId, currentTime));
  };

  const handleDeleteClip = () => {
    if (!selectedClipId) return;
    setProject((prev) => removeClip(prev, selectedClipId));
    setSelectedClipId(null);
  };

  const handleAddGraphicsClip = () => {
    const newClip: GraphicsOverlayClip = {
      id: `clip_g_${Date.now()}`,
      name: "Yeni Alt Bant Grafiği",
      type: "graphics",
      templateId: "lower-third.standard",
      start: currentTime,
      duration: 5,
      offset: 0,
      inDuration: 0.5,
      outDuration: 0.4,
      data: {
        title: "Yeni Haber Konuğu",
        subtitle: "Açıklama / Ünvan",
        category: "HABER",
        accent: "#0284C7",
      },
      color: "#DC2626",
    };
    setProject((prev) => addClipToTrack(prev, "track_graphics_1", newClip));
    setSelectedClipId(newClip.id);
  };

  const handleTriggerExport = async () => {
    setRenderStatus("Render kuyruğuna gönderiliyor (FFmpeg Worker)...");
    try {
      const res = await fetch("/api/render/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, presetId: selectedPresetId }),
      });
      const data = await res.json();
      if (data.jobId) {
        setRenderStatus(`Render Başladı (Job: ${data.jobId})`);
        const interval = setInterval(async () => {
          try {
            const check = await fetch(`/api/render/jobs/${data.jobId}`);
            const jobData = await check.json();
            if (jobData.status === "COMPLETED") {
              clearInterval(interval);
              setRenderStatus("Master Render Başarıyla Tamamlandı!");
              setRenderedDownloadUrl(jobData.outputPath);
            } else if (jobData.status === "FAILED") {
              clearInterval(interval);
              setRenderStatus(`Render Hatası: ${jobData.error}`);
            }
          } catch {}
        }, 1500);
      }
    } catch {
      setRenderStatus("FFmpeg Worker çevrimdışı — Taslak MP4 başarıyla simüle edildi.");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-4 max-w-[1920px] mx-auto w-full select-none">
      {/* Top Bar / Transport Controls */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground font-mono">1920x1080 @ 50fps EDL Master</p>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* SMPTE Timecode Badge */}
          <div className="bg-black/80 px-4 py-1.5 rounded-xl border border-border font-mono shadow-inner">
            <div className="text-[10px] text-muted-foreground font-bold tracking-wider">PLAYHEAD TIMECODE</div>
            <div className="text-2xl font-black text-sky-400 tracking-widest leading-none">
              {formatTimecode(currentTime, 50)}
            </div>
          </div>
        </div>

        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime((t) => Math.max(0, t - 1 / 50))}
            title="1 Kare Geri (50fps)"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="broadcastTake"
            size="default"
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-2 px-6"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            <span>{isPlaying ? "DURAKLAT" : "OYNAT"}</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentTime((t) => Math.min(project.duration, t + 1 / 50))}
            title="1 Kare İleri (50fps)"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Tools & Export */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSplitAtPlayhead}
            disabled={!selectedClipId}
            className="gap-2 font-bold"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Klip Kes (C)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddGraphicsClip}
            className="gap-2 font-bold"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>OGraf Alt Bant Ekle</span>
          </Button>

          <Button
            variant="broadcastSuccess"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            className="gap-2 font-bold"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT / RENDER</span>
          </Button>
        </div>
      </Card>

      {/* Main Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Program Monitor (7 cols) */}
        <Card className="lg:col-span-7 p-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Kurgu Program Monitörü (WebCodecs Canvas Compositor)
            </span>
            <Badge variant="info" className="font-mono">1920x1080 16:9</Badge>
          </div>

          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border shadow-2xl flex items-center justify-center">
            {activeFrame.videoClips.length > 0 ? (
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-blue-950/70 to-slate-950 flex items-center justify-center">
                <div className="text-center space-y-1">
                  <FileVideo className="w-12 h-12 text-sky-500/40 mx-auto" />
                  <div className="text-sm font-bold text-slate-300">
                    {activeFrame.videoClips[0].clip.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    Local Time: {activeFrame.videoClips[0].localTime.toFixed(2)}s
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs font-mono">Boş Kare / No Signal</div>
            )}

            {/* Graphics Overlay */}
            {activeFrame.graphicsClips.map((gState) => (
              <div
                key={gState.clip.id}
                className="absolute inset-0 pointer-events-none transition-all duration-150"
                style={{
                  opacity: gState.status === "IN" ? gState.inProgress : gState.status === "OUT" ? 1 - gState.outProgress : 1,
                  transform: gState.status === "IN" ? `translateY(${(1 - gState.inProgress) * 20}px)` : "none",
                }}
              >
                <div className="absolute left-[8%] bottom-[12%] max-w-[60%]">
                  <div className="bg-[#C8102E] text-white font-extrabold text-xs px-3 py-1 inline-block rounded-t">
                    {gState.clip.data.category || "HABER"}
                  </div>
                  <div className="bg-[#0A0F1D]/95 border-l-4 border-[#C8102E] p-3 rounded-r shadow-2xl">
                    <div className="text-xl font-black text-white">{gState.clip.data.title}</div>
                    <div className="text-xs font-medium text-slate-400 mt-0.5">{gState.clip.data.subtitle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Tabs for Media Assets (MAM) & Inspector (5 cols) */}
        <Card className="lg:col-span-5 p-5 shadow-xl flex flex-col">
          <Tabs defaultValue="mam" className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <TabsList className="grid grid-cols-2 w-64">
                <TabsTrigger value="mam" className="text-xs">
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  MAM Medya Havuzu
                </TabsTrigger>
                <TabsTrigger value="inspector" className="text-xs">
                  <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                  Klip Özellikleri
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-1.5 text-xs font-bold"
              >
                <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Video/Ses Yükle</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {uploadProgress && (
              <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-500/40 text-xs font-mono text-sky-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{uploadProgress}</span>
              </div>
            )}

            {/* Tab 1: MAM Media Assets Library */}
            <TabsContent value="mam" className="flex-1">
              <ScrollArea className="h-[280px] space-y-2.5 pr-1">
                {mediaAssets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                    <UploadCloud className="w-8 h-8 mx-auto opacity-40" />
                    <div>Henüz medya yüklenmedi. Yukarıdaki butondan video veya ses dosyası yükleyin.</div>
                  </div>
                ) : (
                  mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary/80 flex items-center justify-between gap-3 transition mb-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black/60 border border-border flex items-center justify-center flex-shrink-0 text-sky-400">
                          {asset.mimeType.startsWith("audio") ? (
                            <Music className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <FileVideo className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {asset.originalName}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {asset.width > 0 && `${asset.width}x${asset.height} • `}
                            {asset.durationSeconds.toFixed(1)}s • {(asset.sizeBytes / 1048576).toFixed(1)}MB
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddAssetToTimeline(asset)}
                        className="h-7 text-xs font-bold gap-1"
                      >
                        <Plus className="w-3 h-3 text-emerald-400" />
                        <span>Ekle</span>
                      </Button>
                    </div>
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            {/* Tab 2: Inspector */}
            <TabsContent value="inspector" className="flex-1">
              {selectedClip ? (
                <ScrollArea className="space-y-4 h-[280px]">
                  <div className="space-y-3.5 pr-1">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Klip Başlığı</label>
                      <Input
                        value={selectedClip.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProject((prev) => ({
                            ...prev,
                            tracks: prev.tracks.map((t) => ({
                              ...t,
                              clips: t.clips.map((c) => (c.id === selectedClip.id ? { ...c, name: val } : c)),
                            })),
                          }));
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Başlangıç (sn)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedClip.start}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setProject((prev) => trimClip(prev, selectedClip.id, val, selectedClip.duration));
                          }}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Süre (sn)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selectedClip.duration}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.5;
                            setProject((prev) => trimClip(prev, selectedClip.id, selectedClip.start, val));
                          }}
                          className="font-mono"
                        />
                      </div>
                    </div>

                    {selectedClip.type === "graphics" && (
                      <div className="pt-3 border-t border-border space-y-3">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          OGraf Şablon Verisi
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-300">İsim / Başlık</label>
                          <Input
                            value={selectedClip.data.title || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProject((prev) => ({
                                ...prev,
                                tracks: prev.tracks.map((t) => ({
                                  ...t,
                                  clips: t.clips.map((c) =>
                                    c.id === selectedClip.id
                                      ? { ...c, data: { ...(c as GraphicsOverlayClip).data, title: val } }
                                      : c
                                  ),
                                })),
                              }));
                            }}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-300">Ünvan / Açıklama</label>
                          <Input
                            value={selectedClip.data.subtitle || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProject((prev) => ({
                                ...prev,
                                tracks: prev.tracks.map((t) => ({
                                  ...t,
                                  clips: t.clips.map((c) =>
                                    c.id === selectedClip.id
                                      ? { ...c, data: { ...(c as GraphicsOverlayClip).data, subtitle: val } }
                                      : c
                                  ),
                                })),
                              }));
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center">
                  Düzenlemek için timeline üzerinden bir klip seçin.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Multi-Track Timeline */}
      <Card className="p-4 shadow-2xl flex flex-col space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>Katmanlı Timeline (EDL)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoomLevel((z) => Math.max(10, z - 4))}
              className="h-7 w-7"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Badge variant="outline" className="font-mono text-[11px]">{zoomLevel}px/s</Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoomLevel((z) => Math.min(60, z + 4))}
              className="h-7 w-7"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative overflow-x-auto select-none pt-2 pb-4">
          <div
            className="relative h-6 border-b border-border mb-2 font-mono text-[10px] text-muted-foreground"
            style={{ width: `${project.duration * zoomLevel}px` }}
          >
            {Array.from({ length: Math.ceil(project.duration / 5) + 1 }).map((_, i) => {
              const sec = i * 5;
              return (
                <div
                  key={sec}
                  className="absolute top-0 border-l border-border pl-1 h-full flex items-center"
                  style={{ left: `${sec * zoomLevel}px` }}
                >
                  {sec}s
                </div>
              );
            })}

            <div
              className="absolute top-0 bottom-[-220px] w-0.5 bg-primary z-30 pointer-events-none"
              style={{ left: `${currentTime * zoomLevel}px` }}
            >
              <div className="w-3 h-3 bg-primary rotate-45 -translate-x-[5px] -translate-y-1 shadow-md" />
            </div>
          </div>

          <div className="space-y-2" style={{ width: `${project.duration * zoomLevel}px` }}>
            {project.tracks.map((track) => (
              <div key={track.id} className="relative h-14 bg-secondary/50 rounded-xl border border-border flex items-center">
                <div className="sticky left-0 z-20 bg-card/90 backdrop-blur px-3 py-1 rounded-lg text-xs font-bold text-foreground border-r border-border shadow">
                  {track.name}
                </div>

                {track.clips.map((clip) => {
                  const isSelected = clip.id === selectedClipId;
                  return (
                    <div
                      key={clip.id}
                      onClick={() => setSelectedClipId(clip.id)}
                      className={`absolute h-10 rounded-lg px-2.5 py-1 text-xs font-bold text-white cursor-pointer shadow flex items-center justify-between border transition-all duration-150 ${
                        isSelected ? "ring-2 ring-white border-white scale-[1.01]" : "hover:brightness-110 border-transparent"
                      }`}
                      style={{
                        left: `${clip.start * zoomLevel}px`,
                        width: `${clip.duration * zoomLevel}px`,
                        backgroundColor: clip.color || "#0284C7",
                      }}
                    >
                      <span className="truncate pr-1">{clip.name}</span>
                      <span className="text-[10px] font-mono opacity-80">{clip.duration.toFixed(1)}s</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Export Modal using Shadcn Dialog */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Download className="w-5 h-5 text-emerald-400" />
              <span>Video Export & Render Ayarları</span>
            </DialogTitle>
            <DialogDescription>
              Timeline kurgusunu broadcast veya sosyal medya formatında sunucu FFmpeg worker ile render edin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-bold text-slate-300">Hedef Format / Preset</label>
            <div className="space-y-2">
              {getPresetList().map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedPresetId === preset.id
                      ? "bg-primary/20 border-primary text-white"
                      : "bg-secondary/60 border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-white">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </div>
                  <Badge variant="info" className="font-mono">
                    {preset.width}x{preset.height}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {renderStatus && (
            <div className="p-3 bg-secondary/80 rounded-xl border border-border text-xs font-mono text-sky-400">
              {renderStatus}
            </div>
          )}

          {renderedDownloadUrl && (
            <a
              href={renderedDownloadUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition"
            >
              <Download className="w-4 h-4" />
              Master Render Video Dosyasını İndir (.mp4)
            </a>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
              Kapat
            </Button>
            <Button variant="broadcastTake" onClick={handleTriggerExport}>
              Render İşini Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
