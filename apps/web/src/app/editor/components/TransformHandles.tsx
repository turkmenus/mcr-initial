"use client";

import React, { useState, useRef, useEffect } from "react";
import { RotateCw, Move } from "lucide-react";
import { TimelineClip, VideoClip, TextClip, ImageClip } from "@mcr/schema";

interface TransformHandlesProps {
  clip: TimelineClip | null;
  canvasWidth: number;
  canvasHeight: number;
  containerWidth: number;
  containerHeight: number;
  onUpdateTransform: (clipId: string, partial: { scale?: number; x?: number; y?: number; rotation?: number }) => void;
}

type DragHandleType = "MOVE" | "SCALE_TL" | "SCALE_TR" | "SCALE_BL" | "SCALE_BR" | "ROTATE" | null;

export function TransformHandles({
  clip,
  canvasWidth,
  canvasHeight,
  containerWidth,
  containerHeight,
  onUpdateTransform,
}: TransformHandlesProps) {
  const [activeHandle, setActiveHandle] = useState<DragHandleType>(null);
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = useState<{
    scale: number;
    x: number;
    y: number;
    rotation: number;
  }>({ scale: 1, x: 0, y: 0, rotation: 0 });

  const isVisual = clip && (clip.type === "video" || clip.type === "text" || clip.type === "image");
  if (!isVisual || !clip) return null;

  const visualClip = clip as VideoClip | TextClip | ImageClip;
  const currentScale = visualClip.scale ?? 1;
  const currentX = visualClip.x ?? 0;
  const currentY = visualClip.y ?? 0;
  const currentRotation = visualClip.rotation ?? 0;

  // Coordinate conversion: 1920x1080 canvas to container screen space
  const displayScale = Math.min(containerWidth / canvasWidth, containerHeight / canvasHeight);
  const screenCenterX = containerWidth / 2;
  const screenCenterY = containerHeight / 2;

  // Base bounding box dimensions
  const baseBoxWidth = clip.type === "text" ? 600 : canvasWidth * 0.75;
  const baseBoxHeight = clip.type === "text" ? 160 : canvasHeight * 0.75;

  const boxWidth = baseBoxWidth * currentScale * displayScale;
  const boxHeight = baseBoxHeight * currentScale * displayScale;

  const screenX = screenCenterX + currentX * displayScale;
  const screenY = screenCenterY + currentY * displayScale;

  // Start Handle Drag
  const handlePointerDown = (e: React.PointerEvent, handle: DragHandleType) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setActiveHandle(handle);
    setDragStartMouse({ x: e.clientX, y: e.clientY });
    setInitialTransform({
      scale: currentScale,
      x: currentX,
      y: currentY,
      rotation: currentRotation,
    });
  };

  // Pointer Move & Global Transform Calculation
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle) return;

    const deltaX = (e.clientX - dragStartMouse.x) / displayScale;
    const deltaY = (e.clientY - dragStartMouse.y) / displayScale;

    if (activeHandle === "MOVE") {
      let nextX = initialTransform.x + deltaX;
      let nextY = initialTransform.y + deltaY;

      // Snap to Center within 12px
      if (Math.abs(nextX) < 12) nextX = 0;
      if (Math.abs(nextY) < 12) nextY = 0;

      onUpdateTransform(clip.id, { x: Math.round(nextX), y: Math.round(nextY) });
    } else if (
      activeHandle === "SCALE_TL" ||
      activeHandle === "SCALE_TR" ||
      activeHandle === "SCALE_BL" ||
      activeHandle === "SCALE_BR"
    ) {
      const distFromStart = Math.hypot(deltaX, deltaY);
      const isExpanding =
        activeHandle === "SCALE_BR"
          ? deltaX > 0 || deltaY > 0
          : activeHandle === "SCALE_TL"
          ? deltaX < 0 || deltaY < 0
          : deltaX > 0;

      const scaleDelta = (distFromStart / 400) * (isExpanding ? 1 : -1);
      const nextScale = Math.max(0.2, Math.min(3.0, initialTransform.scale + scaleDelta));

      onUpdateTransform(clip.id, { scale: parseFloat(nextScale.toFixed(2)) });
    } else if (activeHandle === "ROTATE") {
      const centerX = screenX;
      const centerY = screenY;
      const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let angleDeg = angleRad * (180 / Math.PI) - 90; // offset for top handle

      // Snap to 0, 90, 180, -90 degrees
      if (Math.abs(angleDeg) < 4) angleDeg = 0;
      if (Math.abs(angleDeg - 90) < 4) angleDeg = 90;
      if (Math.abs(angleDeg + 90) < 4) angleDeg = -90;
      if (Math.abs(Math.abs(angleDeg) - 180) < 4) angleDeg = 180;

      onUpdateTransform(clip.id, { rotation: Math.round(angleDeg) });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveHandle(null);
    }
  };

  const isSnappedX = Math.abs(currentX) < 2;
  const isSnappedY = Math.abs(currentY) < 2;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-30"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 1. Snap Axis Guide Lines */}
      {isSnappedX && (
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-sky-400/80 shadow-[0_0_8px_#38bdf8] pointer-events-none" />
      )}
      {isSnappedY && (
        <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-sky-400/80 shadow-[0_0_8px_#38bdf8] pointer-events-none" />
      )}

      {/* 2. Interactive Bounding Box */}
      <div
        style={{
          left: `${screenX}px`,
          top: `${screenY}px`,
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
          transform: `translate(-50%, -50%) rotate(${currentRotation}deg)`,
        }}
        className="absolute border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)] pointer-events-auto cursor-move select-none group"
        onPointerDown={(e) => handlePointerDown(e, "MOVE")}
      >
        {/* Rotation Stalk Line & Handle */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
          <div
            onPointerDown={(e) => handlePointerDown(e, "ROTATE")}
            className="w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition flex items-center justify-center"
            title="Döndür (Rotate)"
          >
            <RotateCw className="w-2.5 h-2.5 text-sky-600 pointer-events-none" />
          </div>
          <div className="w-[1px] h-3 bg-sky-400" />
        </div>

        {/* 4 Corner Resize Handles */}
        <div
          onPointerDown={(e) => handlePointerDown(e, "SCALE_TL")}
          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize shadow hover:scale-125 transition"
          title="Yeniden Boyutlandır"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, "SCALE_TR")}
          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize shadow hover:scale-125 transition"
          title="Yeniden Boyutlandır"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, "SCALE_BL")}
          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-nesw-resize shadow hover:scale-125 transition"
          title="Yeniden Boyutlandır"
        />
        <div
          onPointerDown={(e) => handlePointerDown(e, "SCALE_BR")}
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-sm cursor-nwse-resize shadow hover:scale-125 transition"
          title="Yeniden Boyutlandır"
        />

        {/* Real-time Transform HUD Badge */}
        {activeHandle && (
          <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-[9px] font-mono text-sky-400 border border-sky-500/40 whitespace-nowrap pointer-events-none shadow-lg">
            {activeHandle === "MOVE" && `X: ${currentX}px | Y: ${currentY}px`}
            {activeHandle.startsWith("SCALE") && `Ölçek: ${(currentScale * 100).toFixed(0)}%`}
            {activeHandle === "ROTATE" && `Açı: ${currentRotation}°`}
          </div>
        )}
      </div>
    </div>
  );
}
