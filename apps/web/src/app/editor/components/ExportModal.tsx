"use client";

import React, { useState } from "react";
import {
  Download,
  Zap,
  Server,
  RefreshCw,
  Film,
  CheckCircle,
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
import { TimelineProject } from "@mcr/schema";
import { getPresetList } from "@mcr/presets";
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
  const [exportMode, setExportMode] = useState<"client" | "server">("server");
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
    setServerStatus("FFmpeg render sunucusuna gönderiliyor...");
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
      setServerStatus("Render sunucusuna ulaşılamadı. Lütfen renderer servisinin çalıştığından emin olun.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#0e1217] border-[#1e2538] text-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-white">
            <Download className="w-4 h-4 text-sky-400" />
            <span>Video Dışa Aktar (Export)</span>
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-400">
            Kurgunuzu FFmpeg master kalitesinde veya hızlı tarayıcı taslağı olarak dışa aktarın.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#0b0e14] rounded border border-[#1e2538]">
          <button
            onClick={() => setExportMode("server")}
            className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition ${
              exportMode === "server"
                ? "bg-[#1e2538] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5 text-sky-400" />
            <span>FFmpeg Master (MP4)</span>
          </button>
          <button
            onClick={() => setExportMode("client")}
            className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition ${
              exportMode === "client"
                ? "bg-[#1e2538] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Hızlı Taslak (WebM)</span>
          </button>
        </div>

        {/* Mode 1: Server FFmpeg */}
        {exportMode === "server" && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Export Profili
              </span>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {getPresetList().map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`p-2 rounded border cursor-pointer transition flex items-center justify-between ${
                      selectedPresetId === preset.id
                        ? "bg-sky-500/10 border-sky-500/50 text-white"
                        : "bg-[#121722] border-[#1e2538] text-slate-400 hover:bg-[#161c2b]"
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">{preset.name}</div>
                      <div className="text-[9px] text-slate-500">{preset.description}</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-sky-400">
                      {preset.width}x{preset.height}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {serverStatus && (
              <div className="p-2 bg-[#121722] rounded border border-[#1e2538] text-[11px] font-mono text-sky-400">
                {serverStatus}
              </div>
            )}

            {serverDownloadUrl && (
              <a
                href={serverDownloadUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Master Dosyasını İndir (.mp4)</span>
              </a>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isServerExporting}
                className="h-8 text-xs bg-[#121722] border-[#1e2538]"
              >
                İptal
              </Button>
              <Button
                size="sm"
                onClick={handleServerExport}
                disabled={isServerExporting}
                className="h-8 text-xs font-semibold gap-1.5 bg-sky-600 hover:bg-sky-500 text-white"
              >
                <Server className="w-3.5 h-3.5" />
                <span>{isServerExporting ? "Render Sürüyor..." : "Master Render Başlat"}</span>
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Mode 2: Client Draft */}
        {exportMode === "client" && (
          <div className="space-y-3 pt-1">
            <div className="p-2.5 rounded bg-[#121722] border border-[#1e2538] text-[11px] text-slate-400">
              Kurguyu sunucuya gitmeden doğrudan tarayıcı belleğinde WebM olarak kaydeder.
            </div>

            {isClientExporting && (
              <div className="space-y-1.5 p-2 bg-[#121722] rounded border border-[#1e2538]">
                <div className="flex justify-between text-[11px] font-mono text-slate-300">
                  <span>Kaydediliyor...</span>
                  <span className="text-sky-400">{clientProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0b0e14] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 transition-all duration-150"
                    style={{ width: `${clientProgress}%` }}
                  />
                </div>
              </div>
            )}

            {clientDownloadUrl && (
              <a
                href={clientDownloadUrl}
                download={`${project.name.replace(/\s+/g, "_")}_draft.webm`}
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Taslak Videoyu İndir (.webm)</span>
              </a>
            )}

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isClientExporting}
                className="h-8 text-xs bg-[#121722] border-[#1e2538]"
              >
                İptal
              </Button>
              <Button
                size="sm"
                onClick={handleClientSideExport}
                disabled={isClientExporting}
                className="h-8 text-xs font-semibold gap-1.5 bg-sky-600 hover:bg-sky-500 text-white"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isClientExporting ? "Kayıt Yapılıyor..." : "Hemen Dışa Aktar"}</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
