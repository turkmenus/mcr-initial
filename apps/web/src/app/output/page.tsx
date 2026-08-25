"use client";

import React, { useEffect, useRef } from "react";
import { useRealtime } from "@/context/RealtimeContext";
import { ActiveCGLayer } from "@mcr/schema";

export default function OutputPage() {
  const { activeCgLayers } = useRealtime();
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeLayersList = Object.entries(activeCgLayers);

  // Sync state changes to iframes
  useEffect(() => {
    activeLayersList.forEach(([key, layer]) => {
      const iframe = iframeRefs.current[key];
      if (iframe && iframe.contentWindow) {
        if (layer.state === "PLAYING") {
          iframe.contentWindow.postMessage({ type: "UPDATE", data: layer.data }, "*");
          iframe.contentWindow.postMessage({ type: "PLAY" }, "*");
        } else if (layer.state === "STOPPED") {
          iframe.contentWindow.postMessage({ type: "STOP" }, "*");
        }
      }
    });
  }, [activeCgLayers, activeLayersList]);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-transparent overflow-hidden pointer-events-none select-none">
      {activeLayersList.map(([key, layer]) => {
        const zIndex = layer.cgLayer || 10;
        return (
          <iframe
            key={key}
            ref={(el) => {
              iframeRefs.current[key] = el;
            }}
            src={`/templates/${layer.templateId}/index.html`}
            className="absolute inset-0 w-full h-full border-none bg-transparent"
            style={{ zIndex }}
            onLoad={(e) => {
              const iframe = e.currentTarget;
              setTimeout(() => {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({ type: "UPDATE", data: layer.data }, "*");
                  iframe.contentWindow.postMessage({ type: "PLAY" }, "*");
                }
              }, 150);
            }}
          />
        );
      })}
    </div>
  );
}
