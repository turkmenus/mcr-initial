import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import {
  WSMessage,
  ActiveCGLayer,
  RundownItem,
  TickerItem,
} from "@mcr/schema";
import { CasparClient, MockCasparServer, buildAMCPCommand } from "@mcr/casparcg";
import { db, OperatorSession, OperatorRole } from "@mcr/db";
import { initialStudioState, StudioState } from "./state.js";

const PORT = parseInt(process.env.PORT || "4001", 10);
const CASPAR_PORT = parseInt(process.env.CASPAR_PORT || "5250", 10);
const CASPAR_HOST = process.env.CASPAR_HOST || "127.0.0.1";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize state from persistent database
const state: StudioState = {
  ...JSON.parse(JSON.stringify(initialStudioState)),
  rundown: db.getRundown(),
  tickerState: db.getTicker(),
};

// Start built-in Mock CasparCG Server if port is free (for standalone dev)
const mockCaspar = new MockCasparServer(CASPAR_PORT);
mockCaspar.start().then(() => {
  console.log(`[MCR Caspar Mock] Running on port ${CASPAR_PORT}`);
}).catch(() => {
  console.log(`[MCR Caspar Mock] Port ${CASPAR_PORT} already in use (Real CasparCG is likely running)`);
});

// CasparCG AMCP Client (Connects to Real CasparCG or built-in Mock)
const casparClient = new CasparClient({
  host: CASPAR_HOST,
  port: CASPAR_PORT,
  autoReconnect: true,
  reconnectInterval: 3000,
});

casparClient.on("connected", () => {
  console.log(`[MCR Realtime] Connected to CasparCG AMCP Server at ${CASPAR_HOST}:${CASPAR_PORT}!`);
  state.casparStatus = "CONNECTED";
  broadcast({
    type: "CASPARCG_STATUS",
    payload: { status: "CONNECTED" },
    timestamp: Date.now(),
  });
});

casparClient.on("disconnected", () => {
  console.log("[MCR Realtime] Disconnected from CasparCG AMCP Server");
  state.casparStatus = "MOCK";
  broadcast({
    type: "CASPARCG_STATUS",
    payload: { status: "MOCK" },
    timestamp: Date.now(),
  });
});

casparClient.on("command_sent", (rawCmd: string) => {
  state.amcpLogs.unshift({
    timestamp: Date.now(),
    command: rawCmd,
    direction: "OUT",
  });
  if (state.amcpLogs.length > 50) state.amcpLogs.pop();
  broadcast({
    type: "AMCP_LOG",
    payload: { timestamp: Date.now(), command: rawCmd, direction: "OUT" },
    timestamp: Date.now(),
  });
});

casparClient.connect();

// HTTP Endpoints
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MCR Production Realtime & Switcher Hub",
    timestamp: Date.now(),
    casparStatus: state.casparStatus,
    activeLayers: Object.keys(state.activeCgLayers).length,
    rundownCount: state.rundown.length,
    mediaCount: db.getMediaAssets().length,
  });
});

app.get("/api/state", (req, res) => {
  res.json(state);
});

// Switcher Trigger API (OBS Studio / vMix / CasparCG Switcher)
app.post("/api/switcher/transition", (req, res) => {
  const { transitionType = "CUT", duration = 1000, source = "CAM1" } = req.body;
  console.log(`[MCR Switcher] Transition: ${transitionType} (${duration}ms) -> Source: ${source}`);

  // Broadcast switcher event to all connected clients & OBS/vMix listeners
  broadcast({
    type: "AMCP_LOG",
    payload: {
      timestamp: Date.now(),
      command: `SWITCHER ${transitionType} -> ${source}`,
      direction: "OUT",
    },
    timestamp: Date.now(),
  });

  res.json({ success: true, transitionType, source });
});

app.post("/api/cg", async (req, res) => {
  const { action, channel = 1, layer = 20, cgLayer = 10, templateId, data } = req.body;
  handleCGAction(action, channel, layer, cgLayer, templateId, data);
  res.json({ success: true, activeCgLayers: state.activeCgLayers });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(msg: WSMessage, excludeWs?: WebSocket) {
  const json = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(json);
    }
  }
}

function handleCGAction(
  action: "PLAY" | "STOP" | "UPDATE" | "NEXT" | "CLEAR",
  channel = 1,
  layer = 20,
  cgLayer = 10,
  templateId?: string,
  data?: any
) {
  const layerKey = `${channel}_${layer}_${cgLayer}`;

  if (action === "PLAY" && templateId) {
    const activeLayer: ActiveCGLayer = {
      templateId,
      channel,
      layer,
      cgLayer,
      state: "PLAYING",
      data: data || {},
      updatedAt: Date.now(),
    };
    state.activeCgLayers[layerKey] = activeLayer;

    // Send AMCP command to CasparCG
    casparClient.send({
      type: "CG ADD",
      channel,
      layer,
      cgLayer,
      template: templateId,
      playOnLoad: true,
      data,
    });
  } else if (action === "STOP") {
    if (state.activeCgLayers[layerKey]) {
      state.activeCgLayers[layerKey].state = "STOPPED";
      setTimeout(() => {
        delete state.activeCgLayers[layerKey];
        broadcast({
          type: "CG_STATE_CHANGE",
          payload: { layerKey, action: "REMOVED", activeCgLayers: state.activeCgLayers },
          timestamp: Date.now(),
        });
      }, 500);
    }
    casparClient.send({
      type: "CG STOP",
      channel,
      layer,
      cgLayer,
    });
  } else if (action === "UPDATE") {
    if (state.activeCgLayers[layerKey]) {
      state.activeCgLayers[layerKey].data = { ...state.activeCgLayers[layerKey].data, ...data };
      state.activeCgLayers[layerKey].updatedAt = Date.now();
    }
    casparClient.send({
      type: "CG UPDATE",
      channel,
      layer,
      cgLayer,
      data,
    });
  } else if (action === "NEXT") {
    casparClient.send({
      type: "CG NEXT",
      channel,
      layer,
      cgLayer,
    });
  } else if (action === "CLEAR") {
    state.activeCgLayers = {};
    casparClient.send({
      type: "CG CLEAR",
      channel,
      layer,
    });
  }

  broadcast({
    type: "CG_STATE_CHANGE",
    payload: {
      layerKey,
      action,
      activeLayer: state.activeCgLayers[layerKey],
      activeCgLayers: state.activeCgLayers,
    },
    timestamp: Date.now(),
  });
}

wss.on("connection", (ws: WebSocket) => {
  // Send full initial state snapshot to new client
  const snapshotMsg: WSMessage = {
    type: "STATE_SNAPSHOT",
    payload: state,
    timestamp: Date.now(),
  };
  ws.send(JSON.stringify(snapshotMsg));

  ws.on("message", (raw: string) => {
    try {
      const msg: WSMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case "CG_COMMAND": {
          const { action, channel, layer, cgLayer, templateId, data } = msg.payload;
          handleCGAction(action, channel, layer, cgLayer, templateId, data);
          break;
        }

        case "RUNDOWN_CREATE": {
          const newItem: RundownItem = {
            ...msg.payload,
            id: msg.payload.id || `cue_${Date.now()}`,
            order: state.rundown.length + 1,
            status: "READY",
          };
          state.rundown.push(newItem);
          db.setRundown(state.rundown);
          broadcast({ type: "RUNDOWN_CHANGED", payload: state.rundown, timestamp: Date.now() });
          break;
        }

        case "RUNDOWN_UPDATE": {
          const index = state.rundown.findIndex((i) => i.id === msg.payload.id);
          if (index !== -1) {
            state.rundown[index] = { ...state.rundown[index], ...msg.payload };
            db.setRundown(state.rundown);
            broadcast({ type: "RUNDOWN_CHANGED", payload: state.rundown, timestamp: Date.now() });
          }
          break;
        }

        case "RUNDOWN_DELETE": {
          state.rundown = state.rundown.filter((i) => i.id !== msg.payload.id);
          db.setRundown(state.rundown);
          broadcast({ type: "RUNDOWN_CHANGED", payload: state.rundown, timestamp: Date.now() });
          break;
        }

        case "RUNDOWN_TAKE": {
          const item = state.rundown.find((i) => i.id === msg.payload.id);
          if (item) {
            item.status = "ON_AIR";
            handleCGAction("PLAY", item.channel, item.layer, item.cgLayer, item.templateId, item.data);
            db.setRundown(state.rundown);
            broadcast({ type: "RUNDOWN_CHANGED", payload: state.rundown, timestamp: Date.now() });

            if (item.autoOut && item.duration > 0) {
              setTimeout(() => {
                if (item.status === "ON_AIR") {
                  item.status = "PLAYED";
                  handleCGAction("STOP", item.channel, item.layer, item.cgLayer);
                  db.setRundown(state.rundown);
                  broadcast({ type: "RUNDOWN_CHANGED", payload: state.rundown, timestamp: Date.now() });
                }
              }, item.duration * 1000);
            }
          }
          break;
        }

        case "TICKER_UPDATE_ITEMS": {
          if (Array.isArray(msg.payload.items)) {
            state.tickerState.items = msg.payload.items;
            db.setTickerItems(state.tickerState.items);
            broadcast({ type: "TICKER_CHANGED", payload: state.tickerState, timestamp: Date.now() });
          }
          break;
        }

        case "TICKER_SET_CONFIG": {
          state.tickerState = { ...state.tickerState, ...msg.payload };
          db.updateTickerConfig(msg.payload);
          broadcast({ type: "TICKER_CHANGED", payload: state.tickerState, timestamp: Date.now() });
          break;
        }
      }
    } catch (err) {
      console.error("[MCR Realtime] Failed to parse message:", err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[MCR Realtime Hub] WebSocket server running at ws://localhost:${PORT}`);
});
