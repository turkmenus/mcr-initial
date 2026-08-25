"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  ActiveCGLayer,
  RundownItem,
  TickerState,
  WSMessage,
} from "@mcr/schema";

interface RealtimeContextType {
  connected: boolean;
  casparStatus: "CONNECTED" | "DISCONNECTED" | "MOCK";
  activeCgLayers: Record<string, ActiveCGLayer>;
  rundown: RundownItem[];
  tickerState: TickerState;
  amcpLogs: Array<{ timestamp: number; command: string; direction: "IN" | "OUT" }>;
  sendCGCommand: (action: "PLAY" | "STOP" | "UPDATE" | "NEXT" | "CLEAR", payload: {
    channel?: number;
    layer?: number;
    cgLayer?: number;
    templateId?: string;
    data?: any;
  }) => void;
  takeRundownItem: (id: string) => void;
  createRundownItem: (item: Partial<RundownItem>) => void;
  updateRundownItem: (item: Partial<RundownItem>) => void;
  deleteRundownItem: (id: string) => void;
  updateTickerItems: (items: any[]) => void;
  updateTickerConfig: (config: Partial<TickerState>) => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [casparStatus, setCasparStatus] = useState<"CONNECTED" | "DISCONNECTED" | "MOCK">("MOCK");
  const [activeCgLayers, setActiveCgLayers] = useState<Record<string, ActiveCGLayer>>({});
  const [rundown, setRundown] = useState<RundownItem[]>([]);
  const [tickerState, setTickerState] = useState<TickerState>({
    active: true,
    speed: 120,
    separator: " • ",
    items: [],
  });
  const [amcpLogs, setAmcpLogs] = useState<Array<{ timestamp: number; command: string; direction: "IN" | "OUT" }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectWs = useCallback(() => {
    try {
      let defaultWs = "ws://localhost:4001";
      if (typeof window !== "undefined") {
        const isHttps = window.location.protocol === "https:";
        const proto = isHttps ? "wss:" : "ws:";
        const host = window.location.hostname || "localhost";
        defaultWs = `${proto}//${host}:4001`;
      }
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWs;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          if (msg.type === "STATE_SNAPSHOT") {
            const snap = msg.payload;
            if (snap.activeCgLayers) setActiveCgLayers(snap.activeCgLayers);
            if (snap.rundown) setRundown(snap.rundown);
            if (snap.tickerState) setTickerState(snap.tickerState);
            if (snap.casparStatus) setCasparStatus(snap.casparStatus);
            if (snap.amcpLogs) setAmcpLogs(snap.amcpLogs);
          } else if (msg.type === "CG_STATE_CHANGE") {
            if (msg.payload.activeCgLayers) {
              setActiveCgLayers(msg.payload.activeCgLayers);
            }
          } else if (msg.type === "RUNDOWN_CHANGED") {
            setRundown(msg.payload);
          } else if (msg.type === "TICKER_CHANGED") {
            setTickerState(msg.payload);
          } else if (msg.type === "CASPARCG_STATUS") {
            setCasparStatus(msg.payload.status);
          } else if (msg.type === "AMCP_LOG") {
            setAmcpLogs((prev) => [msg.payload, ...prev.slice(0, 49)]);
          }
        } catch (err) {
          console.error("Failed to parse WS message:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
    }
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWs]);

  const send = (msg: Partial<WSMessage>) => {
    const fullMsg: WSMessage = {
      type: msg.type || "CG_COMMAND",
      payload: msg.payload,
      timestamp: Date.now(),
    };
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(fullMsg));
    }
  };

  const sendCGCommand = useCallback((action: "PLAY" | "STOP" | "UPDATE" | "NEXT" | "CLEAR", payload: any) => {
    send({
      type: "CG_COMMAND",
      payload: { action, ...payload },
    });
  }, []);

  const takeRundownItem = useCallback((id: string) => {
    send({
      type: "RUNDOWN_TAKE",
      payload: { id },
    });
  }, []);

  const createRundownItem = useCallback((item: Partial<RundownItem>) => {
    send({
      type: "RUNDOWN_CREATE",
      payload: item,
    });
  }, []);

  const updateRundownItem = useCallback((item: Partial<RundownItem>) => {
    send({
      type: "RUNDOWN_UPDATE",
      payload: item,
    });
  }, []);

  const deleteRundownItem = useCallback((id: string) => {
    send({
      type: "RUNDOWN_DELETE",
      payload: { id },
    });
  }, []);

  const updateTickerItems = useCallback((items: any[]) => {
    send({
      type: "TICKER_UPDATE_ITEMS",
      payload: { items },
    });
  }, []);

  const updateTickerConfig = useCallback((config: Partial<TickerState>) => {
    send({
      type: "TICKER_SET_CONFIG",
      payload: config,
    });
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        connected,
        casparStatus,
        activeCgLayers,
        rundown,
        tickerState,
        amcpLogs,
        sendCGCommand,
        takeRundownItem,
        createRundownItem,
        updateRundownItem,
        deleteRundownItem,
        updateTickerItems,
        updateTickerConfig,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};
