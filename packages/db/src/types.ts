import { TimelineProject, RundownItem, TickerItem } from "@mcr/schema";

export type OperatorRole = "DIRECTOR" | "GRAPHICS_OP" | "TICKER_OP" | "EDITOR" | "VIEWER";

export interface OperatorSession {
  id: string;
  name: string;
  role: OperatorRole;
  lockedItemId?: string;
  lastPing: number;
}

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  thumbnailUrl: string;
  filePath: string;
  createdAt: number;
}

export interface RenderJobRecord {
  id: string;
  projectId: string;
  presetId: string;
  status: "QUEUED" | "RENDERING" | "COMPLETED" | "FAILED";
  progress: number;
  outputPath?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MCRDatabaseState {
  projects: Record<string, TimelineProject>;
  rundown: RundownItem[];
  ticker: {
    enabled: boolean;
    speed: number;
    items: TickerItem[];
  };
  mediaAssets: MediaAsset[];
  renderJobs: RenderJobRecord[];
  operatorSessions: OperatorSession[];
}
