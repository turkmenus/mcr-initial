/**
 * SMPTE Timecode and Frame Calculation Utilities
 */

export function secondsToFrames(seconds: number, fps: number = 50): number {
  return Math.round(seconds * fps);
}

export function framesToSeconds(frames: number, fps: number = 50): number {
  return frames / fps;
}

export function formatTimecode(seconds: number, fps: number = 50): string {
  const totalFrames = Math.max(0, Math.floor(seconds * fps));
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  const pad = (num: number, len = 2) => String(num).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

export function parseTimecode(timecode: string, fps: number = 50): number {
  const parts = timecode.split(":").map(p => parseInt(p, 10) || 0);
  if (parts.length !== 4) return 0;
  const [h, m, s, f] = parts;
  const totalFrames = (h * 3600 + m * 60 + s) * fps + f;
  return totalFrames / fps;
}
