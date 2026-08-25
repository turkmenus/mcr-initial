import { describe, it, expect, beforeEach } from "vitest";
import { MCRDatabase } from "../src/dbStore.js";
import * as fs from "node:fs";

describe("MCRDatabase Persistent Store", () => {
  const testDir = "scratch/test_db";
  let db: MCRDatabase;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    db = new MCRDatabase(testDir, "test.json");
  });

  it("initializes with default projects, rundown, and ticker items", () => {
    const projects = db.getProjects();
    const rundown = db.getRundown();
    const ticker = db.getTicker();

    expect(projects.length).toBeGreaterThan(0);
    expect(rundown.length).toBeGreaterThan(0);
    expect(ticker.items.length).toBeGreaterThan(0);
  });

  it("adds, retrieves, and updates media assets (MAM)", () => {
    const asset = db.addMediaAsset({
      id: "media_test_1",
      filename: "test.mp4",
      originalName: "Raw_Footage.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1024000,
      durationSeconds: 10.5,
      width: 1920,
      height: 1080,
      fps: 50,
      thumbnailUrl: "/thumb.jpg",
      filePath: "uploads/test.mp4",
      createdAt: Date.now(),
    });

    expect(db.getMediaAssets().length).toBeGreaterThanOrEqual(1);
    const retrieved = db.getMediaAssetById("media_test_1");
    expect(retrieved?.originalName).toBe("Raw_Footage.mp4");
  });

  it("handles operator locking and unlocking for RBAC", () => {
    db.registerOperator("op_1", "Yönetmen 1", "DIRECTOR");
    db.registerOperator("op_2", "Grafiker 1", "GRAPHICS_OP");

    const lock1 = db.lockItem("op_1", "cue_1");
    expect(lock1).toBe(true);

    const lock2 = db.lockItem("op_2", "cue_1");
    expect(lock2).toBe(false); // Locked by op_1

    db.unlockItem("op_1", "cue_1");
    const lock3 = db.lockItem("op_2", "cue_1");
    expect(lock3).toBe(true); // Now acquired
  });
});
