"use client";

import React, { useState, useRef } from "react";
import {
  Film,
  Music,
  Sparkles,
  Type,
  Plus,
  Play,
  Upload,
  Search,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SAMPLE_STOCK_MEDIA,
  STOCK_OGRAF_TEMPLATES,
  STOCK_TEXT_PRESETS,
  SampleMediaItem,
} from "../data/sampleMedia";
import { audioEngine } from "./AudioEngine";
import { MediaAsset } from "@mcr/db";

interface MediaLibraryPanelProps {
  mediaAssets: MediaAsset[];
  isUploading: boolean;
  uploadProgress: string;
  onUploadFile: (file: File) => void;
  onAddStockMedia: (item: SampleMediaItem) => void;
  onAddOGrafTemplate: (template: any) => void;
  onAddTextPreset: (preset: any) => void;
  onAddAsset: (asset: MediaAsset) => void;
}

export function MediaLibraryPanel({
  mediaAssets,
  isUploading,
  uploadProgress,
  onUploadFile,
  onAddStockMedia,
  onAddOGrafTemplate,
  onAddTextPreset,
  onAddAsset,
}: MediaLibraryPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"media" | "ograf" | "text" | "audio">("media");
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadFile(files[0]);
    }
  };

  const filteredStock = SAMPLE_STOCK_MEDIA.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOgraf = STOCK_OGRAF_TEMPLATES.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredText = STOCK_TEXT_PRESETS.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[#0b0e14]">
      {/* Category Tabs */}
      <div className="flex items-center justify-between border-b border-[#1e2538] px-3 py-2 bg-[#121722]">
        <div className="flex items-center gap-1 bg-[#0b0e14] p-0.5 rounded border border-[#1e2538]">
          <button
            onClick={() => setActiveTab("media")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 transition ${
              activeTab === "media"
                ? "bg-[#1e2538] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Film className="w-3 h-3 text-sky-400" />
            <span>Medya</span>
          </button>
          <button
            onClick={() => setActiveTab("ograf")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 transition ${
              activeTab === "ograf"
                ? "bg-[#1e2538] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>OGraf</span>
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 transition ${
              activeTab === "text"
                ? "bg-[#1e2538] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Type className="w-3 h-3 text-amber-400" />
            <span>Yazı</span>
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center gap-1.5 transition ${
              activeTab === "audio"
                ? "bg-[#1e2538] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Music className="w-3 h-3 text-emerald-400" />
            <span>Ses FX</span>
          </button>
        </div>

        {/* Upload Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-7 text-[11px] font-semibold gap-1.5 bg-[#161b24] border-[#262d3d] hover:bg-[#1e2538] text-slate-200"
        >
          <Upload className="w-3 h-3 text-sky-400" />
          <span>Yükle</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-[#1e2538] bg-[#0e1217]">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Öğe ara..."
            className="h-7 pl-7 text-[11px] bg-[#121722] border-[#1e2538] text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {uploadProgress && (
        <div className="px-3 py-1.5 bg-sky-950/40 border-b border-sky-500/30 text-[11px] font-mono text-sky-300">
          {uploadProgress}
        </div>
      )}

      {/* Main Asset List */}
      <div className="flex-1 overflow-hidden p-2">
        <ScrollArea className="h-full pr-1">
          {/* 1. MEDIA TAB */}
          {activeTab === "media" && (
            <div className="space-y-3">
              {/* User Uploaded */}
              {mediaAssets.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                    Yüklenen Medyalar ({mediaAssets.length})
                  </div>
                  <div className="space-y-1">
                    {mediaAssets.map((asset) => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "application/json",
                            JSON.stringify({
                              type: asset.mimeType.startsWith("audio") ? "audio" : "video",
                              name: asset.originalName,
                              src: asset.filePath,
                              duration: asset.durationSeconds || 10,
                            })
                          );
                        }}
                        className="p-1.5 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition group cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded bg-[#0b0e14] border border-[#1e2538] flex items-center justify-center text-sky-400 flex-shrink-0">
                            {asset.mimeType.startsWith("audio") ? (
                              <Music className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Film className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-slate-200 truncate">
                              {asset.originalName}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono">
                              {asset.durationSeconds.toFixed(1)}s • {(asset.sizeBytes / 1048576).toFixed(1)} MB
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAddAsset(asset)}
                          className="h-6 px-2 text-[10px] font-semibold text-sky-400 hover:bg-sky-500/10 gap-1 flex-shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ekle</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Built-in Stock Media */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                  Hazır Klipler
                </div>
                <div className="space-y-1">
                  {filteredStock.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/json",
                          JSON.stringify({
                            type: item.type,
                            name: item.name,
                            src: item.src,
                            duration: item.duration,
                          })
                        );
                      }}
                      className="p-1.5 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition group cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center font-bold flex-shrink-0"
                          style={{ backgroundColor: `${item.color}20`, color: item.color }}
                        >
                          {item.type === "video" ? <Film className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium text-slate-200 truncate">
                            {item.name}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono">
                            {item.category} • {item.duration}s
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddStockMedia(item)}
                        className="h-6 px-2 text-[10px] font-semibold text-sky-400 hover:bg-sky-500/10 gap-1 flex-shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Ekle</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. OGRAF TAB */}
          {activeTab === "ograf" && (
            <div className="space-y-1">
              {filteredOgraf.map((tmpl) => (
                <div
                  key={tmpl.templateId}
                  className="p-2 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center font-bold flex-shrink-0"
                      style={{ backgroundColor: `${tmpl.color}20`, color: tmpl.color }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-slate-200 truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {tmpl.category} • {tmpl.duration}s
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddOGrafTemplate(tmpl)}
                    className="h-6 px-2 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ekle</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 3. TEXT TAB */}
          {activeTab === "text" && (
            <div className="space-y-1">
              {filteredText.map((preset) => (
                <div
                  key={preset.id}
                  className="p-2 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                      <Type className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-slate-200 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        &ldquo;{preset.text}&rdquo;
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddTextPreset(preset)}
                    className="h-6 px-2 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/10 gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ekle</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* 4. AUDIO TAB */}
          {activeTab === "audio" && (
            <div className="space-y-1">
              {[
                { name: "Haber Açılış Jingle", type: "jingle" as const, desc: "Fanfare jingle teması", dur: 6 },
                { name: "Son Dakika Stinger Hit", type: "hit" as const, desc: "Sub-bass dramatik vurgu", dur: 3 },
                { name: "Deklanşör Sesi", type: "click" as const, desc: "Fotoğraf ve flaş efekti", dur: 1 },
                { name: "Sayım Bip Tonu", type: "beep" as const, desc: "Geri sayım sinyali", dur: 1 },
              ].map((sfx, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => audioEngine.playSoundEffect(sfx.type)}
                      className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 flex items-center justify-center flex-shrink-0 transition"
                      title="Ön Dinle"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-400" />
                    </button>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-slate-200 truncate">
                        {sfx.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {sfx.desc} • {sfx.dur}s
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onAddStockMedia({
                        id: `sfx_${Date.now()}_${idx}`,
                        name: sfx.name,
                        type: "audio",
                        duration: sfx.dur,
                        category: "SFX",
                        color: "#10B981",
                        description: sfx.desc,
                        src: `synthetic://${sfx.type}`,
                      })
                    }
                    className="h-6 px-2 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/10 gap-1 flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ekle</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
