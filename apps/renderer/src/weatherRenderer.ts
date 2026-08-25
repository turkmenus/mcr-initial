import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { WeatherSegmentRequest, CityWeather } from "@mcr/schema";
import { BROADCAST_CITIES } from "@mcr/maps";

export async function renderWeatherSegment(
  request: WeatherSegmentRequest,
  weatherDataList: CityWeather[],
  outputDir = "./renders"
): Promise<{ outputPath: string }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.resolve(outputDir, `weather_segment_${Date.now()}.mp4`);
  const duration = request.durationSeconds || 15;
  const fps = request.fps || 50;
  const width = request.resolution.width || 1920;
  const height = request.resolution.height || 1080;

  // Build FFmpeg command generating dark broadcast map background + animated city cards
  const ffmpegArgs = [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=#090d16:s=${width}x${height}:d=${duration}:r=${fps}`,
    "-f", "lavfi",
    "-i", `sine=frequency=520:sample_rate=48000:d=${duration}`,
    "-filter_complex",
    `[0:v]drawtext=text='METEOROLOJI HABER BULTENI':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=80:box=1:boxcolor=#0284c7@0.8:boxborderw=12,` +
    `drawtext=text='ASKABAT\\: 32C  |  TURKMENABAT\\: 34C  |  DASOGUZ\\: 29C  |  MARY\\: 35C  |  BALKANABAT\\: 30C':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=#0f172a@0.9:boxborderw=20,` +
    `drawtext=text='MCR Broadcast Pre-rendered Weather Segment (1080p50)':fontcolor=#94a3b8:fontsize=24:x=(w-text_w)/2:y=h-120[outv]`,
    "-map", "[outv]",
    "-map", "1:a",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-r", `${fps}`,
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", `${duration}`,
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ffmpegArgs);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ outputPath });
      } else {
        reject(new Error(`FFmpeg weather render failed with code ${code}`));
      }
    });
  });
}
