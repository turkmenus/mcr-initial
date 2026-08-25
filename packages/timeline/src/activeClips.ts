import {
  TimelineProject,
  TimelineClip,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
  TextClip,
  ImageClip,
} from "@mcr/schema";

export interface ActiveGraphicsState {
  clip: GraphicsOverlayClip;
  status: "IN" | "SHOWING" | "OUT";
  inProgress: number; // 0..1
  outProgress: number; // 0..1
  zIndex: number;
}

export interface ActiveTextState {
  clip: TextClip;
  status: "IN" | "SHOWING" | "OUT";
  inProgress: number; // 0..1
  outProgress: number; // 0..1
  zIndex: number;
}

export interface ActiveImageState {
  clip: ImageClip;
  zIndex: number;
}

export interface ActiveTimelineFrame {
  time: number;
  videoClips: Array<{ clip: VideoClip; localTime: number; zIndex: number }>;
  audioClips: Array<{ clip: AudioClip; localTime: number; volume: number; pan: number }>;
  graphicsClips: Array<ActiveGraphicsState>;
  textClips: Array<ActiveTextState>;
  imageClips: Array<ActiveImageState>;
}

/**
 * Resolves all active media, text, and graphics overlays at a specific timeline timestamp
 */
export function getActiveTimelineFrame(project: TimelineProject, time: number): ActiveTimelineFrame {
  const result: ActiveTimelineFrame = {
    time,
    videoClips: [],
    audioClips: [],
    graphicsClips: [],
    textClips: [],
    imageClips: [],
  };

  for (const track of project.tracks) {
    if (track.visible === false) continue;
    const trackZIndex = track.zIndex ?? 1;

    for (const clip of track.clips) {
      const clipStart = clip.start;
      const clipEnd = clip.start + clip.duration;

      if (time >= clipStart && time < clipEnd) {
        const offset = clip.offset ?? 0;
        const localTime = offset + (time - clipStart);

        if (clip.type === "video" && !track.muted) {
          result.videoClips.push({
            clip: clip as VideoClip,
            localTime,
            zIndex: trackZIndex,
          });
        } else if (clip.type === "audio" && !track.muted) {
          const aClip = clip as AudioClip;
          let vol = aClip.volume ?? 1;

          // Fade In calculation
          if (aClip.fadeIn && aClip.fadeIn > 0) {
            const elapsed = time - clipStart;
            if (elapsed < aClip.fadeIn) {
              vol *= elapsed / aClip.fadeIn;
            }
          }

          // Fade Out calculation
          if (aClip.fadeOut && aClip.fadeOut > 0) {
            const remaining = clipEnd - time;
            if (remaining < aClip.fadeOut) {
              vol *= remaining / aClip.fadeOut;
            }
          }

          result.audioClips.push({
            clip: aClip,
            localTime,
            volume: aClip.muted ? 0 : vol,
            pan: aClip.pan ?? 0,
          });
        } else if (clip.type === "graphics") {
          const gClip = clip as GraphicsOverlayClip;
          const elapsed = time - clipStart;
          const remaining = clipEnd - time;
          const inDur = gClip.inDuration ?? 0.5;
          const outDur = gClip.outDuration ?? 0.4;

          let status: "IN" | "SHOWING" | "OUT" = "SHOWING";
          let inProgress = 1;
          let outProgress = 0;

          if (elapsed < inDur) {
            status = "IN";
            inProgress = elapsed / inDur;
          } else if (remaining < outDur) {
            status = "OUT";
            outProgress = 1 - (remaining / outDur);
          }

          result.graphicsClips.push({
            clip: gClip,
            status,
            inProgress,
            outProgress,
            zIndex: trackZIndex,
          });
        } else if (clip.type === "text") {
          const tClip = clip as TextClip;
          const elapsed = time - clipStart;
          const remaining = clipEnd - time;
          const inDur = 0.5;
          const outDur = 0.4;

          let status: "IN" | "SHOWING" | "OUT" = "SHOWING";
          let inProgress = 1;
          let outProgress = 0;

          if (elapsed < inDur) {
            status = "IN";
            inProgress = elapsed / inDur;
          } else if (remaining < outDur) {
            status = "OUT";
            outProgress = 1 - (remaining / outDur);
          }

          result.textClips.push({
            clip: tClip,
            status,
            inProgress,
            outProgress,
            zIndex: trackZIndex,
          });
        } else if (clip.type === "image") {
          result.imageClips.push({
            clip: clip as ImageClip,
            zIndex: trackZIndex,
          });
        }
      }
    }
  }

  // Sort by zIndex ascending so higher tracks render on top
  result.videoClips.sort((a, b) => a.zIndex - b.zIndex);
  result.graphicsClips.sort((a, b) => a.zIndex - b.zIndex);
  result.textClips.sort((a, b) => a.zIndex - b.zIndex);
  result.imageClips.sort((a, b) => a.zIndex - b.zIndex);

  return result;
}
