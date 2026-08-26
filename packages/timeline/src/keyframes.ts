import { TimelineClip, ClipKeyframe } from "@mcr/schema";

export interface InterpolatedTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  volume: number;
}

/**
 * Applies easing function to linear progress t in [0, 1].
 */
export function applyEasing(t: number, easing: string = "linear"): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "easeIn":
      return clamped * clamped;
    case "easeOut":
      return clamped * (2 - clamped);
    case "easeInOut":
      return clamped < 0.5
        ? 2 * clamped * clamped
        : -1 + (4 - 2 * clamped) * clamped;
    case "linear":
    default:
      return clamped;
  }
}

/**
 * Linearly interpolates between two numbers with easing.
 */
export function lerp(a: number, b: number, t: number, easing: string = "linear"): number {
  const factor = applyEasing(t, easing);
  return a + (b - a) * factor;
}

/**
 * Computes the interpolated transform for a clip at a specific localTime (offset from clip start).
 * If no keyframes exist, returns static base properties of the clip.
 */
export function interpolateClipTransform(
  clip: TimelineClip,
  localTime: number
): InterpolatedTransform {
  const baseTransform: InterpolatedTransform = {
    x: (clip as any).x ?? 0,
    y: (clip as any).y ?? 0,
    scale: (clip as any).scale ?? 1.0,
    rotation: (clip as any).rotation ?? 0,
    opacity: (clip as any).opacity ?? 1.0,
    volume: (clip as any).volume ?? 1.0,
  };

  const keyframes = clip.keyframes;
  if (!keyframes || keyframes.length === 0) {
    return baseTransform;
  }

  // Sort keyframes chronologically
  const sorted = [...keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  // If before first keyframe
  if (localTime <= sorted[0].timeOffset) {
    const kf = sorted[0];
    return {
      x: kf.x ?? baseTransform.x,
      y: kf.y ?? baseTransform.y,
      scale: kf.scale ?? baseTransform.scale,
      rotation: kf.rotation ?? baseTransform.rotation,
      opacity: kf.opacity ?? baseTransform.opacity,
      volume: kf.volume ?? baseTransform.volume,
    };
  }

  // If after last keyframe
  if (localTime >= sorted[sorted.length - 1].timeOffset) {
    const kf = sorted[sorted.length - 1];
    return {
      x: kf.x ?? baseTransform.x,
      y: kf.y ?? baseTransform.y,
      scale: kf.scale ?? baseTransform.scale,
      rotation: kf.rotation ?? baseTransform.rotation,
      opacity: kf.opacity ?? baseTransform.opacity,
      volume: kf.volume ?? baseTransform.volume,
    };
  }

  // Find bounding keyframes [prev, next]
  let prevKf = sorted[0];
  let nextKf = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (localTime >= sorted[i].timeOffset && localTime <= sorted[i + 1].timeOffset) {
      prevKf = sorted[i];
      nextKf = sorted[i + 1];
      break;
    }
  }

  const duration = nextKf.timeOffset - prevKf.timeOffset;
  const progress = duration > 0 ? (localTime - prevKf.timeOffset) / duration : 0;
  const easing = nextKf.easing || "linear";

  const prevX = prevKf.x ?? baseTransform.x;
  const nextX = nextKf.x ?? baseTransform.x;

  const prevY = prevKf.y ?? baseTransform.y;
  const nextY = nextKf.y ?? baseTransform.y;

  const prevScale = prevKf.scale ?? baseTransform.scale;
  const nextScale = nextKf.scale ?? baseTransform.scale;

  const prevRotation = prevKf.rotation ?? baseTransform.rotation;
  const nextRotation = nextKf.rotation ?? baseTransform.rotation;

  const prevOpacity = prevKf.opacity ?? baseTransform.opacity;
  const nextOpacity = nextKf.opacity ?? baseTransform.opacity;

  const prevVolume = prevKf.volume ?? baseTransform.volume;
  const nextVolume = nextKf.volume ?? baseTransform.volume;

  return {
    x: lerp(prevX, nextX, progress, easing),
    y: lerp(prevY, nextY, progress, easing),
    scale: lerp(prevScale, nextScale, progress, easing),
    rotation: lerp(prevRotation, nextRotation, progress, easing),
    opacity: lerp(prevOpacity, nextOpacity, progress, easing),
    volume: lerp(prevVolume, nextVolume, progress, easing),
  };
}
