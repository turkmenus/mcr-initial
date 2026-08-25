"use client";

import React from "react";
import { Volume2, VolumeX, Sliders, Music, Radio } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { TimelineProject } from "@mcr/schema";

interface AudioMixerPanelProps {
  project: TimelineProject;
  isPlaying: boolean;
  onUpdateTrackVolume?: (trackId: string, volume: number) => void;
  onToggleTrackMute: (trackId: string) => void;
}

export function AudioMixerPanel({
  project,
  isPlaying,
  onUpdateTrackVolume,
  onToggleTrackMute,
}: AudioMixerPanelProps) {
  const audioTracks = project.tracks.filter((t) => t.type === "audio" || t.type === "video");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] border border-[#1e2538] rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div className="h-8 px-3 bg-[#121722] border-b border-[#1e2538] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
            Audio Mixer & VU Meters
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>48kHz / 24-bit</span>
        </div>
      </div>

      {/* Mixer Channel Strips */}
      <div className="flex-1 p-3 grid grid-cols-5 gap-2 overflow-x-auto items-stretch bg-[#080a0f]">
        {/* Track Channels */}
        {audioTracks.map((track, idx) => {
          const isMuted = track.muted;
          const isAudio = track.type === "audio";

          return (
            <div
              key={track.id}
              className={`flex flex-col items-center justify-between p-2 rounded border bg-[#0e1217] ${
                isMuted ? "border-[#1e2538] opacity-50" : "border-[#263047]"
              }`}
            >
              {/* Channel Label */}
              <div className="text-center">
                <span className="text-[10px] font-bold text-slate-300 truncate block max-w-[70px]">
                  {track.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 uppercase">
                  {isAudio ? `CH ${idx + 1}` : "VID"}
                </span>
              </div>

              {/* VU Meter Bars (Stereo L/R) */}
              <div className="flex items-center gap-1 my-2 h-32 px-1 py-1 rounded bg-black/60 border border-[#1e2538]">
                {/* Left Meter */}
                <div className="w-2.5 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
                  <div
                    className={`w-full rounded-sm transition-all duration-75 ${
                      isMuted
                        ? "h-0"
                        : isPlaying
                        ? "h-[65%] bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
                        : "h-[10%] bg-emerald-600/40"
                    }`}
                  />
                </div>
                {/* Right Meter */}
                <div className="w-2.5 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
                  <div
                    className={`w-full rounded-sm transition-all duration-75 ${
                      isMuted
                        ? "h-0"
                        : isPlaying
                        ? "h-[60%] bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500"
                        : "h-[10%] bg-emerald-600/40"
                    }`}
                  />
                </div>
              </div>

              {/* Mute Button & Pan */}
              <div className="w-full flex flex-col items-center gap-1.5">
                <button
                  onClick={() => onToggleTrackMute(track.id)}
                  className={`w-full py-0.5 text-[9px] font-bold rounded transition border ${
                    isMuted
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      : "bg-[#161c2b] text-slate-400 border-[#1e2538] hover:text-white"
                  }`}
                >
                  MUTE
                </button>

                <span className="text-[8px] font-mono text-slate-500">0.0 dB</span>
              </div>
            </div>
          );
        })}

        {/* Master Output Channel Strip */}
        <div className="flex flex-col items-center justify-between p-2 rounded border border-emerald-500/30 bg-[#0c141d]">
          <div className="text-center">
            <span className="text-[10px] font-extrabold text-emerald-400 block">
              MASTER
            </span>
            <span className="text-[8px] font-mono text-slate-400">OUT L/R</span>
          </div>

          {/* Master VU Meter */}
          <div className="flex items-center gap-1 my-2 h-32 px-1 py-1 rounded bg-black/80 border border-emerald-500/40 shadow-inner">
            <div className="w-3 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
              <div
                className={`w-full rounded-sm transition-all duration-75 ${
                  isPlaying
                    ? "h-[75%] bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 shadow-sm"
                    : "h-[8%] bg-emerald-600/40"
                }`}
              />
            </div>
            <div className="w-3 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
              <div
                className={`w-full rounded-sm transition-all duration-75 ${
                  isPlaying
                    ? "h-[70%] bg-gradient-to-t from-emerald-500 via-yellow-400 to-red-500 shadow-sm"
                    : "h-[8%] bg-emerald-600/40"
                }`}
              />
            </div>
          </div>

          <div className="w-full text-center">
            <span className="text-[9px] font-mono font-bold text-emerald-400">
              {isPlaying ? "-6.2 dB" : "-INF"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
