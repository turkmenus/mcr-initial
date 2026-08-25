import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { TimelineProject } from "@mcr/schema";
import { getPreset } from "@mcr/presets";

export interface RenderJobProgress {
  jobId: string;
  status: "QUEUED" | "RENDERING" | "COMPLETED" | "FAILED";
  progress: number; // 0..100
  outputPath?: string;
  error?: string;
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
        ...preset.ffmpegArgs,
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
      ...preset.ffmpegArgs,
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
