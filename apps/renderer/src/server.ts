import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { TimelineProject, WeatherSegmentRequest } from "@mcr/schema";
import { renderTimelineToVideo, RenderJobProgress } from "./ffmpegPipeline.js";
import { renderWeatherSegment } from "./weatherRenderer.js";
import { probeMediaFile, generateThumbnail } from "./mediaManager.js";
import { db, MediaAsset } from "@mcr/db";

const PORT = parseInt(process.env.PORT || "4002", 10);
const RENDERS_DIR = path.resolve(process.cwd(), "renders");
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const THUMBS_DIR = path.resolve(process.cwd(), "thumbnails");

[RENDERS_DIR, UPLOADS_DIR, THUMBS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.raw({ type: "application/octet-stream", limit: "500mb" }));

// Static media and render streaming
app.use("/renders", express.static(RENDERS_DIR));
app.use("/thumbnails", express.static(THUMBS_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

// HTTP Healthcheck Endpoints
app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "mcr-renderer",
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    mediaCount: db.getMediaAssets().length,
  });
});

// --- MEDIA ASSET MANAGEMENT (MAM) API ---

// List all ingested media assets
app.get("/api/media/list", (req, res) => {
  res.json(db.getMediaAssets());
});

// Upload and ingest a media file
app.post("/api/media/upload", async (req, res) => {
  try {
    const { filename, originalName, mimeType, base64Data } = req.body;

    if (!base64Data || !originalName) {
      return res.status(400).json({ error: "Missing file payload or name" });
    }

    const cleanName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileId = `media_${Date.now()}`;
    const targetFilename = `${fileId}_${cleanName}`;
    const targetFilePath = path.join(UPLOADS_DIR, targetFilename);

    // Write binary buffer
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(targetFilePath, buffer);

    // Probe with ffprobe
    const probe = await probeMediaFile(targetFilePath);

    // Generate thumbnail
    const thumbFilename = `${fileId}_thumb.jpg`;
    const thumbFilePath = path.join(THUMBS_DIR, thumbFilename);
    await generateThumbnail(targetFilePath, thumbFilePath, Math.min(1, probe.duration / 2));

    const asset: MediaAsset = {
      id: fileId,
      filename: targetFilename,
      originalName: originalName || cleanName,
      mimeType: mimeType || "video/mp4",
      sizeBytes: buffer.length,
      durationSeconds: probe.duration,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      thumbnailUrl: `/thumbnails/${thumbFilename}`,
      filePath: `/uploads/${targetFilename}`,
      createdAt: Date.now(),
    };

    db.addMediaAsset(asset);

    res.json({
      success: true,
      asset,
      message: "Media asset ingested and probed successfully",
    });
  } catch (err: any) {
    console.error("[MAM Upload Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete media asset
app.delete("/api/media/:id", (req, res) => {
  const asset = db.getMediaAssetById(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }

  // Remove files
  try {
    const filePath = path.join(process.cwd(), asset.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const thumbPath = path.join(process.cwd(), asset.thumbnailUrl);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  } catch {}

  db.deleteMediaAsset(req.params.id);
  res.json({ success: true, message: "Media asset deleted" });
});

// --- RENDER QUEUE API ---

app.post("/api/render/timeline", async (req, res) => {
  try {
    const { project, presetId } = req.body as { project: TimelineProject; presetId: string };
    const jobId = `job_timeline_${Date.now()}`;

    db.addRenderJob({
      id: jobId,
      projectId: project.id,
      presetId: presetId || "broadcast-16:9",
      status: "RENDERING",
      progress: 20,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Trigger async rendering
    renderTimelineToVideo(project, presetId, RENDERS_DIR)
      .then(({ outputPath }) => {
        db.updateRenderJob(jobId, {
          status: "COMPLETED",
          progress: 100,
          outputPath: `/renders/${path.basename(outputPath)}`,
        });
      })
      .catch((err) => {
        db.updateRenderJob(jobId, {
          status: "FAILED",
          error: err.message,
        });
      });

    res.json({ success: true, jobId, message: "Timeline render queued" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/render/weather", async (req, res) => {
  try {
    const { request, weatherData } = req.body;
    const jobId = `job_weather_${Date.now()}`;

    db.addRenderJob({
      id: jobId,
      projectId: request?.id || "weather_segment",
      presetId: "broadcast-16:9",
      status: "RENDERING",
      progress: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    renderWeatherSegment(request, weatherData || [], RENDERS_DIR)
      .then(({ outputPath }) => {
        db.updateRenderJob(jobId, {
          status: "COMPLETED",
          progress: 100,
          outputPath: `/renders/${path.basename(outputPath)}`,
        });
      })
      .catch((err) => {
        db.updateRenderJob(jobId, {
          status: "FAILED",
          error: err.message,
        });
      });

    res.json({ success: true, jobId, message: "Weather segment render queued" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/render/jobs/:jobId", (req, res) => {
  const job = db.getRenderJobById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(job);
});

app.listen(PORT, () => {
  console.log(`[MCR Render Worker & MAM Engine] Running at http://localhost:${PORT}`);
});
