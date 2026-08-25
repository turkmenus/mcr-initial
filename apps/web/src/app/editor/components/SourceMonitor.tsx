"use client";

import React, { useState } from "react";
import { Film, Play, Pause, Plus, Eye, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineClip } from "@mcr/schema";

interface SourceMonitorProps {
  clip: TimelineClip | null;
  onInsertToTimeline?: () => void;
}

export function SourceMonitor({ clip, onInsertToTimeline }: SourceMonitorProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e14] border border-[#1e2538] rounded-lg overflow-hidden select-none shadow-lg">
      {/* Header */}
      <div className="h-8 px-3 bg-[#121722] border-b border-[#1e2538] flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Film className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider truncate">
            Kaynak Önizleme (Source)
          </span>
        </div>
        {clip && (
          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
            {clip.name}
          </span>
        )}
      </div>

      {/* Surface */}
      <div className="flex-1 bg-[#05070a] flex items-center justify-center p-2 relative">
        {clip ? (
          <div className="aspect-video w-full max-h-full bg-black rounded shadow-2xl flex flex-col items-center justify-center relative overflow-hidden border border-[#1e2538]">
            <div className="text-center p-4">
              <Film className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-80" />
              <div className="text-xs font-bold text-white">{clip.name}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Süre: {clip.duration.toFixed(1)}s • Tip: {clip.type.toUpperCase()}
              </div>
            </div>

            {/* Quick Insert Overlay */}
            {onInsertToTimeline && (
              <div className="absolute bottom-2 right-2">
                <Button
                  size="sm"
                  onClick={onInsertToTimeline}
                  className="h-7 text-[10px] font-bold gap-1 bg-amber-600 hover:bg-amber-500 text-white shadow"
                >
                  <Plus className="w-3 h-3" />
                  <span>Timeline&apos;a Ekle</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500">
            <Eye className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-amber-400" />
            <div className="text-xs font-semibold text-slate-400">Kaynak Klip Seçilmedi</div>
            <div className="text-[10px] text-slate-600 max-w-[180px] mt-0.5">
              Önizlemek için kütüphaneden bir öğe seçin.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
