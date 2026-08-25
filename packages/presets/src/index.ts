export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  aspectRatio: string;
  fps: number;
  codec: "h264" | "prores" | "hevc";
  container: "mp4" | "mov";
  bitrate: string;
  target: "broadcast" | "web" | "social";
  ffmpegArgs: string[];
}

export const EXPORT_PRESETS: Record<string, ExportPreset> = {
  "broadcast-16:9": {
    id: "broadcast-16:9",
    name: "Broadcast Master (16:9)",
    description: "1080p50 Broadcast Master, yüksek kaliteli H.264 / ProRes arşiv kalitesi",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    fps: 50,
    codec: "h264",
    container: "mp4",
    bitrate: "25M",
    target: "broadcast",
    ffmpegArgs: [
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "17",
      "-pix_fmt", "yuv420p",
      "-r", "50",
      "-c:a", "aac",
      "-b:a", "320k"
    ],
  },
  "web-16:9": {
    id: "web-16:9",
    name: "Web & YouTube (16:9)",
    description: "1080p30 YouTube, web portalları ve haber siteleri için optimize",
    width: 1920,
    height: 1080,
    aspectRatio: "16:9",
    fps: 30,
    codec: "h264",
    container: "mp4",
    bitrate: "10M",
    target: "web",
    ffmpegArgs: [
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart"
    ],
  },
  "vertical-9:16": {
    id: "vertical-9:16",
    name: "Vertical Social (9:16)",
    description: "Reels, TikTok ve YouTube Shorts için dikey 1080x1920",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    fps: 30,
    codec: "h264",
    container: "mp4",
    bitrate: "8M",
    target: "social",
    ffmpegArgs: [
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart"
    ],
  },
  "square-1:1": {
    id: "square-1:1",
    name: "Square Feed (1:1)",
    description: "Instagram & X feed gönderileri için kare 1080x1080",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    fps: 30,
    codec: "h264",
    container: "mp4",
    bitrate: "6M",
    target: "social",
    ffmpegArgs: [
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart"
    ],
  },
  "feed-4:5": {
    id: "feed-4:5",
    name: "Portrait Feed (4:5)",
    description: "Instagram dikey feed için 1080x1350",
    width: 1080,
    height: 1350,
    aspectRatio: "4:5",
    fps: 30,
    codec: "h264",
    container: "mp4",
    bitrate: "7M",
    target: "social",
    ffmpegArgs: [
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart"
    ],
  },
};

export const getPresetList = (): ExportPreset[] => Object.values(EXPORT_PRESETS);
export const getPreset = (id: string): ExportPreset | undefined => EXPORT_PRESETS[id];

/**
 * Returns FFmpeg arguments tailored for NVIDIA NVENC GPU hardware acceleration or CPU fallback.
 */
export function getPresetFfmpegArgs(preset: ExportPreset, useGpu: boolean = false): string[] {
  if (useGpu) {
    if (preset.codec === "hevc") {
      return [
        "-c:v", "hevc_nvenc",
        "-preset", "p4",
        "-cq", "20",
        "-pix_fmt", "yuv420p",
        "-r", `${preset.fps}`,
        "-c:a", "aac",
        "-b:a", "320k",
        "-movflags", "+faststart"
      ];
    }
    return [
      "-c:v", "h264_nvenc",
      "-preset", "p4",
      "-cq", "18",
      "-pix_fmt", "yuv420p",
      "-r", `${preset.fps}`,
      "-c:a", "aac",
      "-b:a", "320k",
      "-movflags", "+faststart"
    ];
  }
  return preset.ffmpegArgs;
}
