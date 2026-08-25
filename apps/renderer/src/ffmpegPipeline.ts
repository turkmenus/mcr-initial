import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { TimelineProject, VideoClip, TextClip, GraphicsOverlayClip } from "@mcr/schema";
import { getPreset, getPresetFfmpegArgs } from "@mcr/presets";

export interface RenderJobProgress {
  jobId: string;
  status: "QUEUED" | "RENDERING" | "COMPLETED" | "FAILED";
  progress: number; // 0..100
  outputPath?: string;
  error?: string;
}

let hasNvencCache: boolean | null = null;

/**
 * Checks if NVIDIA NVENC hardware acceleration is available.
 */
export async function isNvencAvailable(): Promise<boolean> {
  if (hasNvencCache !== null) return hasNvencCache;
  if (process.env.USE_GPU_ACCEL === "false") {
    hasNvencCache = false;
    return false;
  }
  return new Promise((resolve) => {
    const checkProc = spawn("ffmpeg", ["-encoders"]);
    let output = "";
    checkProc.stdout.on("data", (data) => {
      output += data.toString();
    });
    checkProc.on("close", (code) => {
      hasNvencCache = code === 0 && output.includes("h264_nvenc");
      if (hasNvencCache) {
        console.log("⚡ [MCR Renderer] NVIDIA NVENC hardware acceleration is ENABLED.");
      } else {
        console.log("ℹ️ [MCR Renderer] NVIDIA NVENC not detected. Using CPU encoding.");
      }
      resolve(hasNvencCache);
    });
    checkProc.on("error", () => {
      hasNvencCache = false;
      resolve(false);
    });
  });
}

function resolveMediaFilePath(src: string): string | null {
  if (!src) return null;
  const candidates = [
    path.resolve(process.cwd(), src.replace(/^\//, "")),
    path.resolve(process.cwd(), "uploads", path.basename(src)),
    path.resolve(process.cwd(), "apps/web/public", src.replace(/^\//, "")),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export async function renderTimelineToVideo(
  project: TimelineProject,
  presetId = "broadcast-16:9",
  outputDir = "./renders"
): Promise<{ outputPath: string }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const preset = getPreset(presetId) || getPreset("broadcast-16:9")!;
  const outputFileName = `master_${project.id.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.${preset.container}`;
  const outputPath = path.resolve(outputDir, outputFileName);
  const isGpu = await isNvencAvailable();
  const targetEncoderArgs = getPresetFfmpegArgs(preset, isGpu);
  const totalDuration = Math.max(1, project.duration || 10);

  const videoClips = project.tracks.filter((t) => t.type === "video").flatMap((t) => t.clips) as VideoClip[];
  const textClips = project.tracks.filter((t) => t.type === "text").flatMap((t) => t.clips) as TextClip[];
  const graphicsClips = project.tracks.filter((t) => t.type === "graphics").flatMap((t) => t.clips) as GraphicsOverlayClip[];

  // Find any real video files on disk
  const realFileClips = videoClips
    .map((c) => ({ clip: c, resolvedPath: resolveMediaFilePath(c.src) }))
    .filter((x): x is { clip: VideoClip; resolvedPath: string } => x.resolvedPath !== null);

  return new Promise((resolve, reject) => {
    // If real video files exist on the timeline, process and overlay graphics
    if (realFileClips.length > 0) {
      const primaryClip = realFileClips[0];
      const localFilePath = primaryClip.resolvedPath;

      const filterChains: string[] = [
        `[0:v]scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[base_v]`,
      ];

      let lastLayer = "base_v";

      // Overlay text clips
      textClips.forEach((t, i) => {
        const nextLayer = `text_${i}`;
        const escapedText = (t.text || "").replace(/'/g, "\\'").replace(/:/g, "\\:");
        const start = t.start || 0;
        const end = start + (t.duration || 5);
        filterChains.push(
          `[${lastLayer}]drawtext=text='${escapedText}':fontcolor=${t.textColor || "white"}:fontsize=${t.fontSize || 44}:x=(w-text_w)/2:y=h-160:box=1:boxcolor=black@0.7:boxborderw=10:enable='between(t,${start},${end})'[${nextLayer}]`
        );
        lastLayer = nextLayer;
      });

      // Overlay lower-third graphics
      graphicsClips.forEach((g, i) => {
        const nextLayer = `gfx_${i}`;
        const title = (g.data?.title || g.name || "").replace(/'/g, "\\'").replace(/:/g, "\\:");
        const subtitle = (g.data?.subtitle || "").replace(/'/g, "\\'").replace(/:/g, "\\:");
        const start = g.start || 0;
        const end = start + (g.duration || 5);
        filterChains.push(
          `[${lastLayer}]drawtext=text='${title}':fontcolor=white:fontsize=36:x=120:y=h-220:box=1:boxcolor=#C8102E@0.9:boxborderw=12:enable='between(t,${start},${end})',` +
          `drawtext=text='${subtitle}':fontcolor=#E2E8F0:fontsize=24:x=120:y=h-160:box=1:boxcolor=#0F172A@0.9:boxborderw=8:enable='between(t,${start},${end})'[${nextLayer}]`
        );
        lastLayer = nextLayer;
      });

      const ffmpegArgs = [
        "-y",
        "-i", localFilePath,
        "-filter_complex", filterChains.join(";"),
        "-map", `[${lastLayer}]`,
        "-map", "0:a?",
        "-t", `${totalDuration}`,
        ...targetEncoderArgs,
        outputPath,
      ];

      const proc = spawn("ffmpeg", ffmpegArgs);
      let stderr = "";
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ outputPath });
        } else {
          console.error("[FFmpeg Real Clip Render Error]:", stderr);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
      return;
    }

    // High-Quality Broadcast Studio Synthetic Video Renderer
    const filterChains: string[] = [
      `[0:v]drawtext=text='MCR NEWS 24 - CANLI YAYIN':fontcolor=white:fontsize=28:x=80:y=60:box=1:boxcolor=#C8102E@0.9:boxborderw=8[hdr_v]`,
    ];
    let lastLayer = "hdr_v";

    // Overlay text titles
    textClips.forEach((t, i) => {
      const nextLayer = `text_${i}`;
      const escapedText = (t.text || "SON DAKIKA HABER").replace(/'/g, "\\'").replace(/:/g, "\\:");
      const start = t.start || 0;
      const end = start + (t.duration || 5);
      filterChains.push(
        `[${lastLayer}]drawtext=text='${escapedText}':fontcolor=${t.textColor || "white"}:fontsize=${t.fontSize || 48}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.7:boxborderw=16:enable='between(t,${start},${end})'[${nextLayer}]`
      );
      lastLayer = nextLayer;
    });

    // Overlay OGraf lower third graphics
    graphicsClips.forEach((g, i) => {
      const nextLayer = `gfx_${i}`;
      const title = (g.data?.title || g.name || "Canlı Yayın Konuğu").replace(/'/g, "\\'").replace(/:/g, "\\:");
      const subtitle = (g.data?.subtitle || "MCR Stüdyoları").replace(/'/g, "\\'").replace(/:/g, "\\:");
      const start = g.start || 0;
      const end = start + (g.duration || 5);
      filterChains.push(
        `[${lastLayer}]drawtext=text='${title}':fontcolor=white:fontsize=36:x=120:y=h-220:box=1:boxcolor=#C8102E@0.9:boxborderw=12:enable='between(t,${start},${end})',` +
        `drawtext=text='${subtitle}':fontcolor=#E2E8F0:fontsize=24:x=120:y=h-160:box=1:boxcolor=#0F172A@0.9:boxborderw=8:enable='between(t,${start},${end})'[${nextLayer}]`
      );
      lastLayer = nextLayer;
    });

    const ffmpegArgs = [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=#090d16:s=${preset.width}x${preset.height}:d=${totalDuration}:r=${preset.fps}`,
      "-f", "lavfi",
      "-i", `sine=frequency=440:sample_rate=48000:d=${totalDuration}`,
      "-filter_complex", filterChains.join(";"),
      "-map", `[${lastLayer}]`,
      "-map", "1:a",
      "-t", `${totalDuration}`,
      ...targetEncoderArgs,
      outputPath,
    ];

    const proc = spawn("ffmpeg", ffmpegArgs);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ outputPath });
      } else {
        console.error("[FFmpeg Synthetic Master Render Error]:", stderr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}
