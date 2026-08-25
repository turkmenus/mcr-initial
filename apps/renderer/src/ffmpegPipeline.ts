import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { TimelineProject } from "@mcr/schema";
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

export async function renderTimelineToVideo(
  project: TimelineProject,
  presetId = "broadcast-16:9",
  outputDir = "./renders"
): Promise<{ outputPath: string }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const preset = getPreset(presetId) || getPreset("broadcast-16:9")!;
  const outputFileName = `render_${project.id}_${Date.now()}.${preset.container}`;
  const outputPath = path.resolve(outputDir, outputFileName);

  const useGpu = await isNvencAvailable();
  const targetEncoderArgs = getPresetFfmpegArgs(preset, useGpu);

  // Find video clips
  const videoClips = project.tracks
    .filter((t) => t.type === "video" && t.visible)
    .flatMap((t) => t.clips.filter((c) => c.type === "video"));

  return new Promise((resolve, reject) => {
    // If no video clips are present, generate a test broadcast countdown / color bars clip
    if (videoClips.length === 0) {
      const duration = project.duration || 5;
      const ffmpegArgs = [
        "-y",
        "-f", "lavfi",
        "-i", `testsrc=size=${preset.width}x${preset.height}:rate=${preset.fps}`,
        "-f", "lavfi",
        "-i", "sine=frequency=1000:sample_rate=48000",
        "-t", `${duration}`,
        ...targetEncoderArgs,
        outputPath,
      ];

      const proc = spawn("ffmpeg", ffmpegArgs);
      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ outputPath });
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
      return;
    }

    // FFmpeg concat and trim pipeline for media files
    // In demo environment, generate solid background + animated title
    const duration = project.duration || 10;
    const ffmpegArgs = [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=#0f172a:s=${preset.width}x${preset.height}:d=${duration}:r=${preset.fps}`,
      "-f", "lavfi",
      "-i", `sine=frequency=440:sample_rate=48000:d=${duration}`,
      "-vf", `drawtext=text='MCR EDL MASTER RENDER\\: ${project.name}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.6:boxborderw=10`,
      "-t", `${duration}`,
      ...targetEncoderArgs,
      outputPath,
    ];

    const proc = spawn("ffmpeg", ffmpegArgs);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ outputPath });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
}
