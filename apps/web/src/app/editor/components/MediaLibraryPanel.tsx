"use client";

import React, { useState, useRef } from "react";
import {
  Film,
  Sparkles,
  Type,
  Music,
  Upload,
  Plus,
  Search,
  Check,
  FolderOpen,
  CloudUpload,
  Layers,
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
  const [isDragOverPanel, setIsDragOverPanel] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        onUploadFile(files[i]);
      }
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOverPanel(true);
      }}
      onDragLeave={() => setIsDragOverPanel(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverPanel(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            onUploadFile(e.dataTransfer.files[i]);
          }
        }
      }}
      className={`flex-1 flex flex-col h-full overflow-hidden select-none bg-[#0e1117] border-r border-[#222733] transition ${
        isDragOverPanel ? "ring-2 ring-inset ring-[#00e5ff] bg-[#141b28]" : ""
      }`}
    >
      {/* 1. Header Bar with Prominent Upload Action */}
      <div className="h-10 px-3 border-b border-[#222733] bg-[#141822] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 tracking-wide">
          <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>MEDYA KÜTÜPHANESİ</span>
        </div>

        {/* Highlighted Device Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded text-[11px] font-bold shadow transition disabled:opacity-50"
          title="Bilgisayarınızdan video, ses veya resim yükleyin"
        >
          <Upload className="w-3 h-3 text-white" />
          <span>+ Yükle</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 2. Category Tabs */}
      <div className="p-2 border-b border-[#222733] bg-[#10131c] flex-shrink-0">
        <div className="grid grid-cols-4 gap-1 bg-[#090b10] p-0.5 rounded border border-[#222733]">
          <button
            onClick={() => setActiveTab("media")}
            className={`py-1 text-[11px] font-semibold rounded flex items-center justify-center gap-1 transition ${
              activeTab === "media"
                ? "bg-[#1f2638] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Film className="w-3 h-3 text-sky-400" />
            <span>Medya</span>
          </button>
          <button
            onClick={() => setActiveTab("ograf")}
            className={`py-1 text-[11px] font-semibold rounded flex items-center justify-center gap-1 transition ${
              activeTab === "ograf"
                ? "bg-[#1f2638] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>OGraf</span>
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`py-1 text-[11px] font-semibold rounded flex items-center justify-center gap-1 transition ${
              activeTab === "text"
                ? "bg-[#1f2638] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Type className="w-3 h-3 text-amber-400" />
            <span>Yazı</span>
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`py-1 text-[11px] font-semibold rounded flex items-center justify-center gap-1 transition ${
              activeTab === "audio"
                ? "bg-[#1f2638] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Music className="w-3 h-3 text-emerald-400" />
            <span>Ses FX</span>
          </button>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="px-2 py-1.5 border-b border-[#222733] bg-[#0c0f16] flex-shrink-0">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Öğe ara..."
            className="h-7 pl-7 text-[11px] bg-[#121620] border-[#222733] text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {uploadProgress && (
        <div className="px-3 py-1 bg-sky-950/60 border-b border-sky-500/40 text-[11px] font-mono text-sky-300 flex items-center justify-between">
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* 4. Main Scrollable Asset List */}
      <div className="flex-1 overflow-hidden p-2">
        <ScrollArea className="h-full pr-1">
          {/* 1. MEDIA TAB */}
          {activeTab === "media" && (
            <div className="space-y-3">
              {/* Drag & Drop Upload Zone Card */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-3 border-2 border-dashed border-[#2a364f] hover:border-sky-500 rounded bg-[#121622] hover:bg-[#161c2c] text-center cursor-pointer transition group"
              >
                <CloudUpload className="w-6 h-6 mx-auto text-sky-400 group-hover:scale-110 transition mb-1" />
                <div className="text-[11px] font-bold text-slate-200">
                  Cihazdan Dosya Seçin veya Sürükleyin
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                  MP4, MOV, WEBM, MP3, WAV, PNG, JPG
                </div>
              </div>

              {/* User Uploaded Media */}
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
                  Hazır Yayın Klipleri
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
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                Canlı Yayın Alt Bant & Şablonlar
              </div>
              {filteredOgraf.map((t) => (
                <div
                  key={t.templateId}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({
                        type: "graphics",
                        templateId: t.templateId,
                        name: t.name,
                        duration: t.duration,
                        data: t.defaultData,
                      })
                    );
                  }}
                  className="p-2 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center font-bold flex-shrink-0"
                      style={{ backgroundColor: `${t.color}20`, color: t.color }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-200 truncate">
                        {t.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {t.category} • {t.duration}s
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddOGrafTemplate(t)}
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
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                Başlık ve Metin Hazır Ayarları
              </div>
              {filteredText.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({
                        type: "text",
                        name: item.name,
                        text: item.text,
                        duration: item.duration,
                        fontSize: item.fontSize,
                        textColor: item.textColor,
                        backgroundColor: item.backgroundColor,
                        textAlign: item.textAlign,
                      })
                    );
                  }}
                  className="p-2 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                      <Type className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-200 truncate">
                        {item.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        {item.text}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddTextPreset(item)}
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
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5">
                Ses Efektleri ve Fon Müzikleri
              </div>
              {filteredStock
                .filter((s) => s.type === "audio")
                .map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                          type: "audio",
                          name: item.name,
                          src: item.src,
                          duration: item.duration,
                        })
                      );
                    }}
                    className="p-2 rounded border border-[#1e2538] bg-[#121722] hover:bg-[#161c2b] flex items-center justify-between gap-2 transition cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center font-bold flex-shrink-0"
                        style={{ backgroundColor: `${item.color}20`, color: item.color }}
                      >
                        <Music className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-200 truncate">
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
