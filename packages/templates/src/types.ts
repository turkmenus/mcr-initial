import { OGrafDefinition } from "@mcr/schema";

export interface TemplateFieldDef {
  key: string;
  label: string;
  type: "string" | "number" | "color" | "boolean" | "array" | "select";
  defaultVal: any;
  options?: string[];
  description?: string;
}

export interface BroadcastTemplateMeta {
  id: string;
  name: string;
  category: "LOWER-THIRD" | "TICKER" | "STINGER" | "SCORE-BUG" | "WEATHER-CARD" | "SIDE-PANEL" | "SPLIT-SCREEN" | "BUMPER";
  description: string;
  channel: number;
  layer: number;
  cgLayer: number;
  inDuration: number;
  outDuration: number;
  defaultData: Record<string, any>;
  fields: TemplateFieldDef[];
  thumbnailUrl: string;
  definition?: OGrafDefinition;
}
