import { z } from "zod";

/**
 * CasparCG AMCP Command Types
 */
export type AMCPCommandType =
  | "CG ADD"
  | "CG PLAY"
  | "CG STOP"
  | "CG NEXT"
  | "CG UPDATE"
  | "CG CLEAR"
  | "PLAY"
  | "LOADBG"
  | "STOP"
  | "CLEAR"
  | "INFO"
  | "VERSION";

export interface AMCPCommand {
  type: AMCPCommandType;
  channel: number;
  layer?: number;
  cgLayer?: number;
  template?: string;
  playOnLoad?: boolean;
  data?: Record<string, any> | string;
  raw?: string;
}

export interface AMCPResponse {
  code: number;
  message: string;
  data?: string[];
  raw: string;
}

export const AMCPCommandSchema = z.object({
  type: z.enum([
    "CG ADD",
    "CG PLAY",
    "CG STOP",
    "CG NEXT",
    "CG UPDATE",
    "CG CLEAR",
    "PLAY",
    "LOADBG",
    "STOP",
    "CLEAR",
    "INFO",
    "VERSION"
  ]),
  channel: z.number().default(1),
  layer: z.number().optional(),
  cgLayer: z.number().optional(),
  template: z.string().optional(),
  playOnLoad: z.boolean().optional(),
  data: z.union([z.record(z.any()), z.string()]).optional(),
});
