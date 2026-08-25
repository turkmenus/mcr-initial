"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  Zap,
  Server,
  Film,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineProject } from "@mcr/schema";
import { getPresetList, getPreset } from "@mcr/presets";
import { audioEngine } from "./AudioEngine";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: TimelineProject;
  canvas: HTMLCanvasElement | null;
  onSeek: (time: number) => void;
  onSetIsPlaying: (playing: boolean) => void;
}

export function ExportModal({
  isOpen,
  onClose,
  project,
  canvas,
  onSeek,
  onSetIsPlaying,
}: ExportModalProps) {
  const [exportMode, setExportMode] = useState<"client" | "server">("client");
  const [selectedPresetId, setSelectedPresetId] = useState("broadcast-16:9");

  // Client-Side Export State
  const [isClientExporting, setIsClientExporting] = useState(false);
  const [clientProgress, setClientProgress] = useState(0);
  const [clientDownloadUrl, setClientDownloadUrl] = useState<string | null>(null);

  // Server-Side Export State
  const [isServerExporting, setIsServerExporting] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [serverDownloadUrl, setServerDownloadUrl] = useState<string | null>(null);

  // Handle Client-Side Fast Draft Export
  const handleClientSideExport = async () => {
    if (!canvas) return;
    setIsClientExporting(true);
    setClientProgress(0);
    setClientDownloadUrl(null);

    try {
      const stream = canvas.captureStream(50);
      const audioStream = audioEngine.getMediaStream();
      if (audioStream) {
        audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setClientDownloadUrl(url);
        setIsClientExporting(false);
        setClientProgress(100);
        onSetIsPlaying(false);
      };

      // Play through timeline
      const totalDuration = project.duration || 15;
      const startTime = Date.now();

      recorder.start(100);
      onSeek(0);
      onSetIsPlaying(true);

      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(99, Math.round((elapsed / totalDuration) * 100));
        setClientProgress(progress);

        if (elapsed >= totalDuration) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 200);
    } catch (err: any) {
      console.error(err);
      setIsClientExporting(false);
    }
  };

  // Handle Server-Side Master Render (FFmpeg Worker)
  const handleServerExport = async () => {
    setIsServerExporting(true);
    setServerStatus("FFmpeg render kuyruğuna gönderiliyor...");
    setServerDownloadUrl(null);

    try {
      const res = await fetch("/api/render/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, presetId: selectedPresetId }),
      });

      if (!res.ok) {
        throw new Error("Render sunucusu yanıt vermedi");
      }

      const data = await res.json();
      if (data.jobId) {
        setServerStatus(`Render Başlatıldı (İş No: ${data.jobId}). FFmpeg işleniyor...`);

        const interval = setInterval(async () => {
          try {
            const check = await fetch(`/api/render/jobs/${data.jobId}`);
            if (check.ok) {
              const jobData = await check.json();
              if (jobData.status === "COMPLETED") {
                clearInterval(interval);
                setIsServerExporting(false);
                setServerStatus("Master Render Başarıyla Tamamlandı!");
                setServerDownloadUrl(jobData.outputPath);
              } else if (jobData.status === "FAILED") {
                clearInterval(interval);
                setIsServerExporting(false);
                setServerStatus(`Hata: ${jobData.error}`);
              }
            }
          } catch {}
        }, 1500);
      }
    } catch {
      setIsServerExporting(false);
      setServerStatus("FFmpeg Worker çevrimdışı — Tarayıcı içi hızlı export önerilir.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Download className="w-5 h-5 text-emerald-400" />
            <span>Video Dışa Aktar (Export & Render)</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Kurgunuzu tarayıcı içinde hızlı taslak olarak veya sunucuda FFmpeg master kalitesinde render edin.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={exportMode}
          onValueChange={(val) => setExportMode(val as "client" | "server")}
          className="space-y-4 pt-2"
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="client" className="text-xs font-bold gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Hızlı Tarayıcı Export</span>
            </TabsTrigger>
            <TabsTrigger value="server" className="text-xs font-bold gap-1.5">
              <Server className="w-3.5 h-3.5 text-sky-400" />
              <span>Sunucu FFmpeg Master Render</span>
            </TabsTrigger>
          </TabsList>

          {/* Mode 1: Client-Side Fast Draft */}
          <TabsContent value="client" className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Anında Tarayıcı Render (WebCodecs / Canvas Capture)</span>
              </div>
              <div className="text-muted-foreground text-[11px] leading-relaxed">
                Sunucuya yükleme yapmadan kurguyu doğrudan tarayıcınızda WebM/MP4 olarak kaydeder. Hızlı taslak önizleme ve sosyal medya paylaşımları için idealdir.
              </div>
            </div>

            {isClientExporting && (
              <div className="space-y-2 p-3 bg-secondary/50 rounded-xl border border-border">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    İşleniyor & Kaydediliyor...
                  </span>
                  <span className="font-mono text-sky-400">{clientProgress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-200"
                    style={{ width: `${clientProgress}%` }}
                  />
                </div>
              </div>
            )}

            {clientDownloadUrl && (
              <a
                href={clientDownloadUrl}
                download={`${project.name.replace(/\s+/g, "_")}_draft.webm`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl transition"
              >
                <Download className="w-4 h-4" />
                <span>Hazır Taslak Videoyu İndir (.webm)</span>
              </a>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isClientExporting}>
                İptal
              </Button>
              <Button
                variant="broadcastTake"
                onClick={handleClientSideExport}
                disabled={isClientExporting}
                className="gap-1.5 font-bold"
              >
                <Zap className="w-4 h-4" />
                <span>{isClientExporting ? "Kayıt Yapılıyor..." : "Hemen Dışa Aktar"}</span>
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Mode 2: Server-Side FFmpeg Master Render */}
          <TabsContent value="server" className="space-y-4">
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300">Yayın / Export Profili</label>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {getPresetList().map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      selectedPresetId === preset.id
                        ? "bg-primary/20 border-primary text-white"
                        : "bg-secondary/40 border-border text-muted-foreground hover:border-slate-500"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{preset.name}</div>
                      <div className="text-[10px] text-muted-foreground">{preset.description}</div>
                    </div>
                    <Badge variant="info" className="font-mono text-[10px]">
                      {preset.width}x{preset.height}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {serverStatus && (
              <div className="p-3 bg-secondary/80 rounded-xl border border-border text-xs font-mono text-sky-400">
                {serverStatus}
              </div>
            )}

            {serverDownloadUrl && (
              <a
                href={serverDownloadUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl transition"
              >
                <Download className="w-4 h-4" />
                <span>Master Video Dosyasını İndir (.mp4)</span>
              </a>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isServerExporting}>
                İptal
              </Button>
              <Button
                variant="broadcastSuccess"
                onClick={handleServerExport}
                disabled={isServerExporting}
                className="gap-1.5 font-bold"
              >
                <Server className="w-4 h-4" />
                <span>{isServerExporting ? "Render Sürüyor..." : "Master Render Başlat"}</span>
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
