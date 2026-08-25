import { TimelineProject, TimelineClip, VideoClip, AudioClip, GraphicsOverlayClip } from "@mcr/schema";

export interface ActiveGraphicsState {
  clip: GraphicsOverlayClip;
  status: "IN" | "SHOWING" | "OUT";
  inProgress: number; // 0..1
  outProgress: number; // 0..1
}

export interface ActiveTimelineFrame {
  time: number;
  videoClips: Array<{ clip: VideoClip; localTime: number; zIndex: number }>;
  audioClips: Array<{ clip: AudioClip; localTime: number; volume: number }>;
  graphicsClips: Array<ActiveGraphicsState & { zIndex: number }>;
}

/**
 * Resolves all active media and graphics overlays at a specific timeline timestamp
 */
export function getActiveTimelineFrame(project: TimelineProject, time: number): ActiveTimelineFrame {
  const result: ActiveTimelineFrame = {
    time,
    videoClips: [],
    audioClips: [],
    graphicsClips: [],
  };

  for (const track of project.tracks) {
    if (!track.visible) continue;

    for (const clip of track.clips) {
      const clipStart = clip.start;
      const clipEnd = clip.start + clip.duration;

      if (time >= clipStart && time < clipEnd) {
        const localTime = clip.offset + (time - clipStart);

        if (clip.type === "video" && !track.muted) {
          result.videoClips.push({
            clip: clip as VideoClip,
            localTime,
            zIndex: track.zIndex,
          });
        } else if (clip.type === "audio" && !track.muted) {
          result.audioClips.push({
            clip: clip as AudioClip,
            localTime,
            volume: (clip as AudioClip).volume,
          });
        } else if (clip.type === "graphics") {
          const gClip = clip as GraphicsOverlayClip;
          const elapsed = time - clipStart;
          const remaining = clipEnd - time;

          let status: "IN" | "SHOWING" | "OUT" = "SHOWING";
          let inProgress = 1;
          let outProgress = 0;

          if (elapsed < gClip.inDuration) {
            status = "IN";
            inProgress = elapsed / gClip.inDuration;
          } else if (remaining < gClip.outDuration) {
            status = "OUT";
            outProgress = 1 - (remaining / gClip.outDuration);
          }

          result.graphicsClips.push({
            clip: gClip,
            status,
            inProgress,
            outProgress,
            zIndex: track.zIndex,
          });
        }
      }
    }
  }

  // Sort video and graphics by zIndex ascending
  result.videoClips.sort((a, b) => a.zIndex - b.zIndex);
  result.graphicsClips.sort((a, b) => a.zIndex - b.zIndex);

  return result;
}
