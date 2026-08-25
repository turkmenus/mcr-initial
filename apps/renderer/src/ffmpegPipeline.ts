import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { TimelineProject, VideoClip, AudioClip, TextClip, GraphicsOverlayClip } from "@mcr/schema";
import { getPreset, getPresetFfmpegArgs, ExportPreset } from "@mcr/presets";

export interface RenderJobProgress {
  jobId: string;
  status: "QUEUED" | "RENDERING" | "COMPLETED" | "FAILED";
  progress: number; // 0..100
  outputPath?: string;
  error?: string;
}

let hasNvencCache: boolean | null = null;

/**
 * Checks if NVIDIA NVENC hardware acceleration is actually functional by running a 1-frame test.
 */
export async function isNvencAvailable(): Promise<boolean> {
  if (hasNvencCache !== null) return hasNvencCache;
  if (process.env.USE_GPU_ACCEL === "false") {
    hasNvencCache = false;
    return false;
  }
  return new Promise((resolve) => {
    const probe = spawn("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", "nullsrc=s=64x64:d=0.04",
      "-frames:v", "1",
      "-c:v", "h264_nvenc",
      "-f", "null",
      "-",
    ]);
    probe.on("close", (code) => {
      hasNvencCache = code === 0;
      if (hasNvencCache) {
        console.log("⚡ [MCR Renderer] NVIDIA NVENC hardware acceleration is verified and ENABLED.");
      } else {
        console.log("ℹ️ [MCR Renderer] NVIDIA NVENC not available. Using high-performance CPU libx264.");
      }
      resolve(hasNvencCache);
    });
    probe.on("error", () => {
      hasNvencCache = false;
      resolve(false);
    });
  });
}

/**
 * Safely resolves a clip file path against root, renderer dir, uploads, or public/media.
 */
export function resolveMediaFilePath(src: string): string | null {
  if (!src || src.startsWith("blob:") || src.startsWith("synthetic://")) return null;
  const cleanPath = src.replace(/^\//, "");
  const base = path.basename(cleanPath);

  const candidates = [
    // Current working directory relative
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), "uploads", base),
    path.resolve(process.cwd(), "apps/web/public", cleanPath),
    path.resolve(process.cwd(), "apps/web/public/media", base),
    path.resolve(process.cwd(), "media", base),

    // Monorepo root relative (if running from apps/renderer)
    path.resolve(process.cwd(), "../..", cleanPath),
    path.resolve(process.cwd(), "../../uploads", base),
    path.resolve(process.cwd(), "../../apps/web/public", cleanPath),
    path.resolve(process.cwd(), "../../apps/web/public/media", base),
    path.resolve(process.cwd(), "../../media", base),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Safely escapes strings for FFmpeg drawtext filter parameters.
 */
function escapeDrawText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\\\\'")
    .replace(/:/g, "\\\\:")
    .replace(/,/g, "\\\\,")
    .replace(/%/g, "%%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

/**
 * Main timeline render pipeline.
 */
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

  const totalDuration = Math.max(1, project.duration || 10);
  const isGpu = await isNvencAvailable();

  // Try GPU first if available, with graceful CPU fallback on any exit failure
  try {
    return await executeFfmpegRender(project, preset, outputPath, totalDuration, isGpu);
  } catch (err: any) {
    if (isGpu) {
      console.warn(`[MCR Renderer] GPU render failed (${err.message}). Retrying with CPU libx264 fallback...`);
      return await executeFfmpegRender(project, preset, outputPath, totalDuration, false);
    }
    throw err;
  }
}

/**
 * Generates and runs FFmpeg composite graph for the timeline.
 */
async function executeFfmpegRender(
  project: TimelineProject,
  preset: ExportPreset,
  outputPath: string,
  totalDuration: number,
  useGpu: boolean
): Promise<{ outputPath: string }> {
  const encoderArgs = getPresetFfmpegArgs(preset, useGpu);

  // Extract all tracks and clips
  const allTracks = project.tracks || [];
  const videoClips = allTracks.filter((t) => t.type === "video" && t.visible !== false).flatMap((t) => t.clips) as VideoClip[];
  const audioClips = allTracks.filter((t) => t.type === "audio" && t.muted !== true).flatMap((t) => t.clips) as AudioClip[];
  const textClips = allTracks.filter((t) => t.type === "text" && t.visible !== false).flatMap((t) => t.clips) as TextClip[];
  const graphicsClips = allTracks.filter((t) => t.type === "graphics" && t.visible !== false).flatMap((t) => t.clips) as GraphicsOverlayClip[];

  const inputs: string[] = [];
  const filterChains: string[] = [];
  let currentInputIndex = 0;

  function registerInput(...args: string[]): number {
    inputs.push(...args);
    const idx = currentInputIndex;
    currentInputIndex += 1;
    return idx;
  }

  // Base Canvas Background (Base Input #0)
  const bgInputIdx = registerInput("-f", "lavfi", "-i", `color=c=0x0a0d14:s=${preset.width}x${preset.height}:d=${totalDuration}:r=${preset.fps}`);
  let lastVideoLayer = `${bgInputIdx}:v`;

  // Check valid video inputs
  const resolvedVideoInputs: { clip: VideoClip; inputIndex: number }[] = [];
  for (const vClip of videoClips) {
    const filePath = resolveMediaFilePath(vClip.src);
    if (filePath) {
      const idx = registerInput("-i", filePath);
      resolvedVideoInputs.push({ clip: vClip, inputIndex: idx });
    }
  }

  // Composite Video Clips onto Background
  resolvedVideoInputs.forEach(({ clip, inputIndex }, idx) => {
    const scaledLayer = `vscale_${idx}`;
    const overlayLayer = `voverlay_${idx}`;
    const start = clip.start || 0;
    const end = start + (clip.duration || 5);
    const offset = clip.offset || 0;

    // Scale and trim clip to fit canvas
    filterChains.push(
      `[${inputIndex}:v]trim=start=${offset}:duration=${clip.duration},setpts=PTS-STARTPTS,scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[${scaledLayer}]`
    );

    // Overlay at start time
    filterChains.push(
      `[${lastVideoLayer}][${scaledLayer}]overlay=0:0:enable='between(t,${start},${end})'[${overlayLayer}]`
    );
    lastVideoLayer = overlayLayer;
  });

  // Composite Text Clips
  textClips.forEach((t, idx) => {
    const textLayer = `text_${idx}`;
    const textContent = escapeDrawText(t.text || "BAŞLIK");
    const start = t.start || 0;
    const end = start + (t.duration || 5);
    const fontSize = t.fontSize || 44;

    filterChains.push(
      `[${lastVideoLayer}]drawtext=text='${textContent}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=h-180:box=1:boxcolor=0x000000@0.75:boxborderw=12:enable='between(t,${start},${end})'[${textLayer}]`
    );
    lastVideoLayer = textLayer;
  });

  // Composite OGraf Graphics Lower-Thirds
  graphicsClips.forEach((g, idx) => {
    const gfxLayer1 = `gfx_a_${idx}`;
    const gfxLayer2 = `gfx_b_${idx}`;
    const title = escapeDrawText(g.data?.title || g.name || "CANLI YAYIN");
    const subtitle = escapeDrawText(g.data?.subtitle || "MCR HABER");
    const start = g.start || 0;
    const end = start + (g.duration || 5);

    filterChains.push(
      `[${lastVideoLayer}]drawtext=text='${title}':fontcolor=white:fontsize=36:x=120:y=h-220:box=1:boxcolor=0xC8102E@0.9:boxborderw=12:enable='between(t,${start},${end})'[${gfxLayer1}]`
    );
    filterChains.push(
      `[${gfxLayer1}]drawtext=text='${subtitle}':fontcolor=0xE2E8F0:fontsize=24:x=120:y=h-160:box=1:boxcolor=0x0F172A@0.9:boxborderw=8:enable='between(t,${start},${end})'[${gfxLayer2}]`
    );
    lastVideoLayer = gfxLayer2;
  });

  // Check valid audio files
  const resolvedAudioInputs: { clip: AudioClip; inputIndex: number }[] = [];
  for (const aClip of audioClips) {
    const filePath = resolveMediaFilePath(aClip.src);
    if (filePath) {
      const idx = registerInput("-i", filePath);
      resolvedAudioInputs.push({ clip: aClip, inputIndex: idx });
    }
  }

  let finalAudioMap: string;

  if (resolvedAudioInputs.length > 0) {
    const audioLayers: string[] = [];
    resolvedAudioInputs.forEach(({ clip, inputIndex }, idx) => {
      const aLayer = `a_${idx}`;
      const delayMs = Math.round((clip.start || 0) * 1000);
      const vol = clip.volume !== undefined ? clip.volume : 1.0;
      filterChains.push(
        `[${inputIndex}:a]adelay=${delayMs}|${delayMs},volume=${vol}[${aLayer}]`
      );
      audioLayers.push(`[${aLayer}]`);
    });

    if (audioLayers.length === 1) {
      finalAudioMap = audioLayers[0];
    } else {
      filterChains.push(`${audioLayers.join("")}amix=inputs=${audioLayers.length}:dropout_transition=2[mixed_a]`);
      finalAudioMap = "[mixed_a]";
    }
  } else {
    // If no audio clips present, generate silent tone
    const silentToneIdx = registerInput("-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:d=${totalDuration}`);
    finalAudioMap = `${silentToneIdx}:a`;
  }

  // Helper to ensure correct stream specifiers: input streams (e.g. 0:v, 1:a) must NOT have brackets, filter outputs ([voverlay_0]) MUST have brackets.
  function formatMapSpecifier(spec: string): string {
    if (/^\d+:[a-zA-Z0-9_]+$/.test(spec)) {
      return spec;
    }
    return spec.startsWith("[") && spec.endsWith("]") ? spec : `[${spec}]`;
  }

  // Construct FFmpeg command arguments
  const filterArgs = filterChains.length > 0 ? ["-filter_complex", filterChains.join(";")] : [];
  const videoMap = formatMapSpecifier(lastVideoLayer);
  const audioMap = formatMapSpecifier(finalAudioMap);

  const ffmpegArgs = [
    "-y",
    ...inputs,
    ...filterArgs,
    "-map", videoMap,
    "-map", audioMap,
    "-t", `${totalDuration}`,
    ...encoderArgs,
    outputPath,
  ];

  console.log(`🎬 [MCR Renderer] Starting FFmpeg process: ${ffmpegArgs.join(" ")}`);

  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ffmpegArgs);
    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ [MCR Renderer] Master render completed successfully: ${outputPath}`);
        resolve({ outputPath });
      } else {
        console.error(`❌ [MCR Renderer] FFmpeg exited with error code ${code}. Stderr snippet:`, stderr.slice(-1000));
        reject(new Error(`FFmpeg error (code ${code}): ${stderr.slice(-300)}`));
      }
    });

    proc.on("error", (err) => {
      console.error("[MCR Renderer] Process spawn error:", err);
      reject(err);
    });
  });
}
