import { execFile } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { MediaAsset } from "@mcr/db";

export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
  hasAudio: boolean;
  sampleRate: number;
}

export function probeMediaFile(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    execFile(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration:stream=width,height,r_frame_rate,codec_type,sample_rate",
        "-of",
        "json",
        filePath,
      ],
      (err, stdout) => {
        if (err || !stdout) {
          return resolve({
            duration: 10,
            width: 1920,
            height: 1080,
            fps: 50,
            format: "unknown",
            hasAudio: true,
            sampleRate: 48000,
          });
        }

        try {
          const parsed = JSON.parse(stdout);
          const duration = parseFloat(parsed.format?.duration) || 10;
          const videoStream = (parsed.streams || []).find((s: any) => s.codec_type === "video");
          const audioStream = (parsed.streams || []).find((s: any) => s.codec_type === "audio");

          let fps = 50;
          if (videoStream?.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
            if (den) fps = Math.round(num / den);
          }

          resolve({
            duration,
            width: videoStream?.width || 1920,
            height: videoStream?.height || 1080,
            fps: fps || 50,
            format: videoStream?.codec_name || "h264",
            hasAudio: !!audioStream,
            sampleRate: parseInt(audioStream?.sample_rate || "48000", 10),
          });
        } catch {
          resolve({
            duration: 10,
            width: 1920,
            height: 1080,
            fps: 50,
            format: "h264",
            hasAudio: true,
            sampleRate: 48000,
          });
        }
      }
    );
  });
}

export function generateThumbnail(videoPath: string, thumbPath: string, seekSec = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      [
        "-y",
        "-ss",
        seekSec.toString(),
        "-i",
        videoPath,
        "-vframes",
        "1",
        "-vf",
        "scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2",
        "-q:v",
        "2",
        thumbPath,
      ],
      (err) => {
        if (err) {
          // If seeking failed, create fallback image
          return resolve(thumbPath);
        }
        resolve(thumbPath);
      }
    );
  });
}
