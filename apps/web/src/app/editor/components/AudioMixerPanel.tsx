"use client";

import React, { useEffect, useState, useRef } from "react";
import { Volume2, VolumeX, Sliders, Music, Radio, Volume1 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { TimelineProject } from "@mcr/schema";
import { audioEngine } from "./AudioEngine";

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

  // Real-time VU meter telemetry state
  const [masterLevels, setMasterLevels] = useState<{ left: number; right: number; peak: number }>({
    left: 0,
    right: 0,
    peak: 0,
  });
  const [trackLevels, setTrackLevels] = useState<Map<string, { left: number; right: number }>>(
    new Map()
  );
  const [trackPans, setTrackPans] = useState<Map<string, number>>(new Map());
  const [trackVols, setTrackVols] = useState<Map<string, number>>(new Map());

  // RAF loop for 60fps audio level sampling
  useEffect(() => {
    let animId: number;

    const updateLevels = () => {
      if (isPlaying) {
        setMasterLevels(audioEngine.getMasterLevel());

        const levels = new Map<string, { left: number; right: number }>();
        audioTracks.forEach((t) => {
          levels.set(t.id, audioEngine.getTrackLevel(t.id));
        });
        setTrackLevels(levels);
      } else {
        setMasterLevels({ left: 0, right: 0, peak: 0 });
        setTrackLevels(new Map());
      }
      animId = requestAnimationFrame(updateLevels);
    };

    animId = requestAnimationFrame(updateLevels);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, audioTracks]);

  const handlePanChange = (trackId: string, panVal: number) => {
    setTrackPans((prev) => new Map(prev).set(trackId, panVal));
    audioEngine.setTrackPan(trackId, panVal);
  };

  const handleVolChange = (trackId: string, volVal: number) => {
    setTrackVols((prev) => new Map(prev).set(trackId, volVal));
    audioEngine.setTrackVolume(trackId, volVal);
    onUpdateTrackVolume?.(trackId, volVal);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0e14] border border-[#1e2538] rounded-lg overflow-hidden select-none">
      {/* 1. Header */}
      <div className="h-8 px-3 bg-[#121722] border-b border-[#1e2538] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            SES MİKSERİ & STEREO VU METRELER
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>48kHz / 24-bit PCM</span>
        </div>
      </div>

      {/* 2. Channel Strips */}
      <div className="flex-1 p-2.5 flex gap-2 overflow-x-auto items-stretch bg-[#080a0f]">
        {/* Track Channels */}
        {audioTracks.map((track, idx) => {
          const isMuted = track.muted;
          const isAudio = track.type === "audio";
          const levels = trackLevels.get(track.id) || { left: 0, right: 0 };
          const pan = trackPans.get(track.id) ?? 0;
          const vol = trackVols.get(track.id) ?? 1.0;

          const lHeight = isMuted ? 0 : Math.min(100, Math.round(levels.left * 100));
          const rHeight = isMuted ? 0 : Math.min(100, Math.round(levels.right * 100));

          return (
            <div
              key={track.id}
              className={`w-28 flex flex-col items-center justify-between p-2 rounded border bg-[#0e1217] flex-shrink-0 ${
                isMuted ? "border-[#1e2538] opacity-50" : "border-[#263047]"
              }`}
            >
              {/* Channel Label */}
              <div className="text-center w-full">
                <span className="text-[10px] font-bold text-slate-200 truncate block">
                  {track.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 uppercase">
                  {isAudio ? `SES CH ${idx + 1}` : "VİDEO SES"}
                </span>
              </div>

              {/* Stereo VU Meter Bars */}
              <div className="flex items-center gap-1 my-1.5 h-28 px-1.5 py-1 rounded bg-black/80 border border-[#1e2538]">
                {/* L Bar */}
                <div className="w-2.5 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-75"
                    style={{ height: `${lHeight}%` }}
                  />
                </div>
                {/* R Bar */}
                <div className="w-2.5 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-75"
                    style={{ height: `${rHeight}%` }}
                  />
                </div>
              </div>

              {/* Pan Slider */}
              <div className="w-full px-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-500 mb-0.5">
                  <span>L</span>
                  <span>{pan === 0 ? "C" : pan < 0 ? `L${Math.round(-pan * 100)}` : `R${Math.round(pan * 100)}`}</span>
                  <span>R</span>
                </div>
                <Slider
                  value={[pan]}
                  min={-1}
                  max={1}
                  step={0.1}
                  onValueChange={(val) => handlePanChange(track.id, val[0])}
                  className="h-3"
                />
              </div>

              {/* Mute Button */}
              <div className="w-full flex flex-col items-center gap-1 mt-1">
                <button
                  onClick={() => onToggleTrackMute(track.id)}
                  className={`w-full py-1 text-[9px] font-bold rounded transition border ${
                    isMuted
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      : "bg-[#161c2b] text-slate-400 border-[#1e2538] hover:text-white"
                  }`}
                >
                  {isMuted ? "MUTED" : "MUTE"}
                </button>
              </div>
            </div>
          );
        })}

        {/* Master Output Channel Strip */}
        <div className="w-28 flex flex-col items-center justify-between p-2 rounded border border-emerald-500/40 bg-[#0c151e] flex-shrink-0 shadow-lg">
          <div className="text-center w-full">
            <span className="text-[10px] font-black text-emerald-400 block tracking-wider">
              MASTER
            </span>
            <span className="text-[8px] font-mono text-slate-400">STEREO L/R</span>
          </div>

          {/* Master VU Meter */}
          <div className="flex items-center gap-1 my-1.5 h-28 px-1.5 py-1 rounded bg-black/90 border border-emerald-500/40 shadow-inner">
            {/* L */}
            <div className="w-3 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500 shadow transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(masterLevels.left * 100))}%` }}
              />
            </div>
            {/* R */}
            <div className="w-3 h-full bg-[#121722] rounded-sm overflow-hidden flex flex-col justify-end">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-yellow-400 to-rose-500 shadow transition-all duration-75"
                style={{ height: `${Math.min(100, Math.round(masterLevels.right * 100))}%` }}
              />
            </div>
          </div>

          <div className="w-full text-center">
            <span className="text-[9px] font-mono font-bold text-emerald-400">
              {isPlaying && masterLevels.peak > 0.05
                ? `${(20 * Math.log10(masterLevels.peak)).toFixed(1)} dB`
                : "-INF dB"}
            </span>
          </div>

          <div className="w-full mt-1">
            <div className="w-full py-1 text-[9px] font-bold text-center rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              0.0 dB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
