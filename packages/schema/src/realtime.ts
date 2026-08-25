import { z } from "zod";
import { ActiveCGLayer } from "./ograf.js";

/**
 * Rundown Cue Item
 */
export const RundownItemSchema = z.object({
  id: z.string(),
  order: z.number(),
  title: z.string(),
  category: z.string().default("LOWER-THIRD"),
  templateId: z.string(),
  channel: z.number().default(1),
  layer: z.number().default(20),
  cgLayer: z.number().default(10),
  data: z.record(z.any()),
  duration: z.number().default(5),
  autoOut: z.boolean().default(true),
  notes: z.string().optional(),
  status: z.enum(["READY", "ON_AIR", "PLAYED"]).default("READY"),
});
export type RundownItem = z.infer<typeof RundownItemSchema>;

/**
 * Ticker Item
 */
export const TickerItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.string().default("SON DAKİKA"),
  urgent: z.boolean().default(false),
  enabled: z.boolean().default(true),
  order: z.number().default(0),
});
export type TickerItem = z.infer<typeof TickerItemSchema>;

/**
 * Ticker State
 */
export const TickerStateSchema = z.object({
  active: z.boolean().default(true),
  speed: z.number().default(120), // px per second
  separator: z.string().default(" • "),
  items: z.array(TickerItemSchema).default([]),
});
export type TickerState = z.infer<typeof TickerStateSchema>;

/**
 * Operator Presence
 */
export interface OperatorPresence {
  id: string;
  name: string;
  role: "CONTROLLER" | "TICKER_OP" | "EDITOR" | "PRODUCER" | "OUTPUT";
  color: string;
  lastActive: number;
}

/**
 * Realtime WebSocket Messages
 */
export type WSMessageType =
  // Client -> Server
  | "AUTH"
  | "CG_COMMAND"
  | "RUNDOWN_CREATE"
  | "RUNDOWN_UPDATE"
  | "RUNDOWN_DELETE"
  | "RUNDOWN_REORDER"
  | "RUNDOWN_TAKE"
  | "TICKER_UPDATE_ITEMS"
  | "TICKER_SET_CONFIG"
  | "LOCK_PROJECT"
  | "UNLOCK_PROJECT"
  // Server -> Client Broadcasts
  | "STATE_SNAPSHOT"
  | "CG_STATE_CHANGE"
  | "RUNDOWN_CHANGED"
  | "TICKER_CHANGED"
  | "PRESENCE_CHANGED"
  | "CASPARCG_STATUS"
  | "AMCP_LOG";

export interface WSMessage<T = any> {
  type: WSMessageType;
  senderId?: string;
  payload: T;
  timestamp: number;
}
