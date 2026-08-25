import * as fs from "node:fs";
import * as path from "node:path";
import { TimelineProject, RundownItem, TickerItem } from "@mcr/schema";
import {
  MCRDatabaseState,
  MediaAsset,
  RenderJobRecord,
  OperatorSession,
  OperatorRole,
} from "./types.js";

const DEFAULT_STATE: MCRDatabaseState = {
  projects: {
    proj_default_01: {
      id: "proj_default_01",
      name: "Akşam Bülteni Master Kurgu",
      width: 1920,
      height: 1080,
      fps: 50,
      duration: 60,
      tracks: [
        {
          id: "track_graphics_1",
          name: "Grafik & Alt Bant (G1)",
          type: "graphics",
          muted: false,
          locked: false,
          visible: true,
          zIndex: 30,
          clips: [
            {
              id: "clip_g1",
              name: "Alt Bant: Ahmet Yılmaz",
              type: "graphics",
              templateId: "lower-third.standard",
              start: 2,
              duration: 6,
              offset: 0,
              inDuration: 0.6,
              outDuration: 0.4,
              data: {
                title: "Ahmet Yılmaz",
                subtitle: "Dış Politika Uzmanı • Canlı",
                category: "RÖPORTAJ",
                accent: "#C8102E",
              },
              color: "#DC2626",
            },
          ],
        },
        {
          id: "track_video_1",
          name: "Ana Video (V1)",
          type: "video",
          muted: false,
          locked: false,
          visible: true,
          zIndex: 10,
          clips: [
            {
              id: "clip_v1",
              name: "Haber_Roportaj_A01.mp4",
              type: "video",
              src: "sample_news_clip.mp4",
              start: 0,
              duration: 12,
              offset: 0,
              volume: 1,
              speed: 1,
              color: "#0284C7",
            },
            {
              id: "clip_v2",
              name: "B-Roll_Goruntu_B02.mp4",
              type: "video",
              src: "sample_broll.mp4",
              start: 12,
              duration: 16,
              offset: 0,
              volume: 1,
              speed: 1,
              color: "#0EA5E9",
            },
          ],
        },
        {
          id: "track_audio_1",
          name: "Ses & Röportaj (A1)",
          type: "audio",
          muted: false,
          locked: false,
          visible: true,
          zIndex: 0,
          clips: [
            {
              id: "clip_a1",
              name: "Ses_Mikrofon_A01.wav",
              type: "audio",
              src: "sample_audio.wav",
              start: 0,
              duration: 28,
              offset: 0,
              volume: 0.9,
              fadeIn: 0.2,
              fadeOut: 0.5,
              color: "#10B981",
            },
          ],
        },
      ],
      createdAt: 1787648000000,
      updatedAt: 1787648000000,
    },
  },
  rundown: [
    {
      id: "cue_1",
      order: 1,
      title: "Ahmet Yılmaz - Ana Haber Bülteni",
      category: "LOWER-THIRD",
      templateId: "lower-third.standard",
      channel: 1,
      layer: 20,
      cgLayer: 10,
      data: {
        title: "Ahmet Yılmaz",
        subtitle: "Haber Spikeri • Canlı Yayın",
        category: "HABER ÖZEL",
        accent: "#C8102E",
      },
      duration: 6,
      autoOut: true,
      status: "READY",
      notes: "Açılış konuşması sırasında tetiklenecek",
    },
    {
      id: "cue_2",
      order: 2,
      title: "Son Dakika Stinger Geçişi",
      category: "STINGER",
      templateId: "breaking-news.stinger",
      channel: 1,
      layer: 30,
      cgLayer: 5,
      data: {
        title: "SON DAKİKA GELİŞMESİ",
        subtitle: "MCR HABER MERKEZİ",
        accent: "#EF4444",
      },
      duration: 4,
      autoOut: true,
      status: "READY",
      notes: "Flaş haber aralığı",
    },
  ],
  ticker: {
    enabled: true,
    speed: 120,
    items: [
      {
        id: "t1",
        text: "MCR Haber Odası Otomasyonu yayında. Tüm sistemler nominal.",
        category: "GÜNDEM",
        urgent: false,
        enabled: true,
        order: 1,
      },
      {
        id: "t2",
        text: "Türkmenistan vilayetlerinde bugün hava güneşli ve açık seyrediyor.",
        category: "METEOROLOJİ",
        urgent: false,
        enabled: true,
        order: 2,
      },
      {
        id: "t3",
        text: "FLAŞ: Hazar Enerji Zirvesi Aşkabat'ta başladı.",
        category: "SON DAKİKA",
        urgent: true,
        enabled: true,
        order: 3,
      },
    ],
  },
  mediaAssets: [
    {
      id: "media_sample_1",
      filename: "sample_news_clip.mp4",
      originalName: "Haber_Roportaj_A01.mp4",
      mimeType: "video/mp4",
      sizeBytes: 15420000,
      durationSeconds: 12.4,
      width: 1920,
      height: 1080,
      fps: 50,
      thumbnailUrl: "/thumbnails/sample_news.jpg",
      filePath: "uploads/sample_news_clip.mp4",
      createdAt: Date.now(),
    },
    {
      id: "media_sample_2",
      filename: "sample_broll.mp4",
      originalName: "B-Roll_Goruntu_B02.mp4",
      mimeType: "video/mp4",
      sizeBytes: 28900000,
      durationSeconds: 16.0,
      width: 1920,
      height: 1080,
      fps: 50,
      thumbnailUrl: "/thumbnails/sample_broll.jpg",
      filePath: "uploads/sample_broll.mp4",
      createdAt: Date.now(),
    },
  ],
  renderJobs: [],
  operatorSessions: [
    {
      id: "op_default_director",
      name: "Ana Kumanda Yönetmeni",
      role: "DIRECTOR",
      lastPing: Date.now(),
    },
  ],
};

export class MCRDatabase {
  private filePath: string;
  private state: MCRDatabaseState;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(storageDir = "data", fileName = "mcr_database.json") {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.filePath = path.join(storageDir, fileName);
    this.state = this.load();
  }

  private load(): MCRDatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[MCRDatabase] Warning: Could not read database file, initializing defaults:`, err);
    }
    this.persistSync(DEFAULT_STATE);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  private persistSync(state: MCRDatabaseState) {
    const tempFile = `${this.filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(tempFile, this.filePath);
  }

  public scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistSync(this.state);
    }, 200);
  }

  // --- PROJECTS ---
  public getProjects(): TimelineProject[] {
    return Object.values(this.state.projects);
  }

  public getProjectById(id: string): TimelineProject | null {
    return this.state.projects[id] || null;
  }

  public saveProject(project: TimelineProject): TimelineProject {
    const updated = {
      ...project,
      updatedAt: Date.now(),
    };
    this.state.projects[project.id] = updated;
    this.scheduleSave();
    return updated;
  }

  public deleteProject(id: string): boolean {
    if (this.state.projects[id]) {
      delete this.state.projects[id];
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- RUNDOWN ---
  public getRundown(): RundownItem[] {
    return this.state.rundown;
  }

  public setRundown(items: RundownItem[]): RundownItem[] {
    this.state.rundown = items;
    this.scheduleSave();
    return this.state.rundown;
  }

  public addRundownItem(item: RundownItem): RundownItem {
    this.state.rundown.push(item);
    this.scheduleSave();
    return item;
  }

  public updateRundownItem(id: string, updates: Partial<RundownItem>): RundownItem | null {
    const idx = this.state.rundown.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.state.rundown[idx] = { ...this.state.rundown[idx], ...updates };
    this.scheduleSave();
    return this.state.rundown[idx];
  }

  public deleteRundownItem(id: string): boolean {
    const initialLen = this.state.rundown.length;
    this.state.rundown = this.state.rundown.filter((i) => i.id !== id);
    if (this.state.rundown.length !== initialLen) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- TICKER ---
  public getTicker() {
    return this.state.ticker;
  }

  public setTickerItems(items: TickerItem[]): TickerItem[] {
    this.state.ticker.items = items;
    this.scheduleSave();
    return this.state.ticker.items;
  }

  public updateTickerConfig(config: Partial<{ enabled: boolean; speed: number }>) {
    this.state.ticker = { ...this.state.ticker, ...config };
    this.scheduleSave();
    return this.state.ticker;
  }

  // --- MEDIA ASSETS (MAM) ---
  public getMediaAssets(): MediaAsset[] {
    return this.state.mediaAssets;
  }

  public getMediaAssetById(id: string): MediaAsset | null {
    return this.state.mediaAssets.find((m) => m.id === id) || null;
  }

  public addMediaAsset(asset: MediaAsset): MediaAsset {
    this.state.mediaAssets.push(asset);
    this.scheduleSave();
    return asset;
  }

  public deleteMediaAsset(id: string): boolean {
    const initialLen = this.state.mediaAssets.length;
    this.state.mediaAssets = this.state.mediaAssets.filter((m) => m.id !== id);
    if (this.state.mediaAssets.length !== initialLen) {
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // --- RENDER JOBS ---
  public getRenderJobs(): RenderJobRecord[] {
    return this.state.renderJobs;
  }

  public getRenderJobById(id: string): RenderJobRecord | null {
    return this.state.renderJobs.find((j) => j.id === id) || null;
  }

  public addRenderJob(job: RenderJobRecord): RenderJobRecord {
    this.state.renderJobs.unshift(job);
    this.scheduleSave();
    return job;
  }

  public updateRenderJob(id: string, updates: Partial<RenderJobRecord>): RenderJobRecord | null {
    const idx = this.state.renderJobs.findIndex((j) => j.id === id);
    if (idx === -1) return null;
    this.state.renderJobs[idx] = {
      ...this.state.renderJobs[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    this.scheduleSave();
    return this.state.renderJobs[idx];
  }

  // --- OPERATOR SESSIONS & RBAC ---
  public getOperatorSessions(): OperatorSession[] {
    return this.state.operatorSessions;
  }

  public registerOperator(id: string, name: string, role: OperatorRole): OperatorSession {
    const existing = this.state.operatorSessions.find((o) => o.id === id);
    if (existing) {
      existing.name = name;
      existing.role = role;
      existing.lastPing = Date.now();
      this.scheduleSave();
      return existing;
    }
    const session: OperatorSession = {
      id,
      name,
      role,
      lastPing: Date.now(),
    };
    this.state.operatorSessions.push(session);
    this.scheduleSave();
    return session;
  }

  public lockItem(operatorId: string, itemId: string): boolean {
    // Check if locked by another operator active within 30s
    const activeLock = this.state.operatorSessions.find(
      (o) => o.lockedItemId === itemId && o.id !== operatorId && Date.now() - o.lastPing < 30000
    );
    if (activeLock) return false;

    const op = this.state.operatorSessions.find((o) => o.id === operatorId);
    if (op) {
      op.lockedItemId = itemId;
      op.lastPing = Date.now();
      this.scheduleSave();
      return true;
    }
    return false;
  }

  public unlockItem(operatorId: string, itemId: string): void {
    const op = this.state.operatorSessions.find((o) => o.id === operatorId);
    if (op && op.lockedItemId === itemId) {
      delete op.lockedItemId;
      this.scheduleSave();
    }
  }

  public getStateSnapshot(): MCRDatabaseState {
    return JSON.parse(JSON.stringify(this.state));
  }
}

// Global Singleton Instance
export const db = new MCRDatabase();
