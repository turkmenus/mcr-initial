"use client";

import React from "react";
import {
  Keyboard,
  Command,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    { key: "Space", desc: "Kurguyu Oynat / Duraklat" },
    { key: "C", desc: "Oynatıcı çizgisindeki klibi kes / böl (Razor)" },
    { key: "Delete / Backspace", desc: "Seçili klibi zaman çizelgesinden sil" },
    { key: "Ctrl + D", desc: "Seçili klibi kopyala ve arkasına ekle" },
    { key: "Ctrl + Z", desc: "Son işlemi geri al (Undo)" },
    { key: "Ctrl + Y / Ctrl+Shift+Z", desc: "Geri alınan işlemi ileri al (Redo)" },
    { key: "S", desc: "Manyetik yapışmayı aç / kapat (Snapping)" },
    { key: "M", desc: "Oynatıcı zamanına yeni işaretçi ekle (Marker)" },
    { key: "← / →", desc: "1 kare geri / ileri git (50fps frame step)" },
    { key: "Shift + ← / →", desc: "1 saniye geri / ileri atla" },
    { key: "Home / End", desc: "Zaman çizelgesinin en başına / sonuna git" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="w-5 h-5 text-sky-400" />
            <span>NLE Klavye Kısayolları</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Hızlı kurgu ve yayın operatör kontrolleri için kısayol tuşları.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/60 text-xs"
            >
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-black/60 border border-border text-[11px] font-mono font-bold text-sky-400 shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
