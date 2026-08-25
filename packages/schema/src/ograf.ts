import { z } from "zod";

/**
 * OGraf Data Field Definition
 */
export const OGrafFieldSchema = z.object({
  type: z.enum(["string", "number", "boolean", "color", "image", "select", "json"]),
  label: z.string(),
  description: z.string().optional(),
  default: z.any().optional(),
  maxLength: z.number().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
});

export type OGrafField = z.infer<typeof OGrafFieldSchema>;

/**
 * MCR Extension: Playout configuration for CasparCG and Web Output
 */
export const XMcrPlayoutSchema = z.object({
  casparcg: z.object({
    channel: z.number().default(1),
    layer: z.number().default(20),
    cgLayer: z.number().default(10),
  }).optional(),
  web: z.object({
    route: z.string().default("/output"),
    zIndex: z.number().default(20),
  }).optional(),
});

export type XMcrPlayout = z.infer<typeof XMcrPlayoutSchema>;

/**
 * MCR Extension: Video Editor metadata
 */
export const XMcrEditorSchema = z.object({
  defaultDuration: z.number().default(5), // seconds
  trackType: z.enum(["graphics", "lower-third", "ticker", "stinger", "bumper"]).default("graphics"),
  resizable: z.boolean().default(true),
  thumbnail: z.string().optional(),
});

export type XMcrEditor = z.infer<typeof XMcrEditorSchema>;

/**
 * MCR Extensions container
 */
export const XMcrExtensionSchema = z.object({
  playout: XMcrPlayoutSchema.optional(),
  editor: XMcrEditorSchema.optional(),
  map: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
});

export type XMcrExtension = z.infer<typeof XMcrExtensionSchema>;

/**
 * OGraf Graphics Definition v1 Schema
 */
export const OGrafDefinitionSchema = z.object({
  $schema: z.string().default("ograf/graphics-definition@1"),
  id: z.string(),
  version: z.string().default("1.0.0"),
  name: z.string(),
  category: z.enum(["lower-third", "ticker", "stinger", "bumper", "transition", "score-bug", "weather-card", "weather-map", "custom"]),
  render: z.object({
    type: z.enum(["html", "remotion", "svg"]),
    entry: z.string().default("index.html"),
    composition: z.string().optional(),
    canvas: z.object({
      width: z.number().default(1920),
      height: z.number().default(1080),
    }).default({ width: 1920, height: 1080 }),
    responsive: z.boolean().default(true),
    fps: z.number().default(50),
  }),
  data: z.object({
    fields: z.record(OGrafFieldSchema).default({}),
    binding: z.string().optional(),
    locations: z.array(z.string()).optional(),
    layers: z.array(z.string()).optional(),
  }).default({ fields: {} }),
  states: z.object({
    in: z.object({ duration: z.number().default(0.5) }).default({ duration: 0.5 }),
    out: z.object({ duration: z.number().default(0.4) }).default({ duration: 0.4 }),
    next: z.object({ duration: z.number().default(0.3) }).optional(),
    update: z.object({ duration: z.number().default(0.3) }).optional(),
  }).default({ in: { duration: 0.5 }, out: { duration: 0.4 } }),
  "x-mcr": XMcrExtensionSchema.optional(),
});

export type OGrafDefinition = z.infer<typeof OGrafDefinitionSchema>;

/**
 * Runtime CG Layer State
 */
export type CGState = "STOPPED" | "PLAYING" | "PAUSED" | "UPDATING";

export interface ActiveCGLayer {
  templateId: string;
  channel: number;
  layer: number;
  cgLayer: number;
  state: CGState;
  data: Record<string, any>;
  updatedAt: number;
}
