import {
  TimelineProject,
  Track,
  TimelineClip,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
} from "@mcr/schema";

/**
 * Creates a blank default timeline project
 */
export function createDefaultTimelineProject(name = "Bülten Kurgusu 01", id = "proj_default_01"): TimelineProject {
  return {
    id,
    name,
    width: 1920,
    height: 1080,
    fps: 50,
    duration: 60,
    tracks: [
      {
        id: "track_graphics_1",
        name: "Grafik & Alt Bant (G1)",
        type: "graphics",
        muted: false,
        locked: false,
        visible: true,
        zIndex: 30,
        clips: [],
      },
      {
        id: "track_video_1",
        name: "Ana Video (V1)",
        type: "video",
        muted: false,
        locked: false,
        visible: true,
        zIndex: 10,
        clips: [],
      },
      {
        id: "track_audio_1",
        name: "Ses / Röportaj (A1)",
        type: "audio",
        muted: false,
        locked: false,
        visible: true,
        zIndex: 1,
        clips: [],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Adds a clip to a specific track in the project
 */
export function addClipToTrack(
  project: TimelineProject,
  trackId: string,
  clip: TimelineClip
): TimelineProject {
  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map((track) => {
      if (track.id !== trackId) return track;
      return {
        ...track,
        clips: [...track.clips, clip].sort((a, b) => a.start - b.start),
      };
    }),
  };
}

/**
 * Removes a clip from the project
 */
export function removeClip(project: TimelineProject, clipId: string): TimelineProject {
  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((c) => c.id !== clipId),
    })),
  };
}

/**
 * Splits a clip at playhead time
 */
export function splitClip(
  project: TimelineProject,
  clipId: string,
  splitTime: number
): TimelineProject {
  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map((track) => {
      const clipIndex = track.clips.findIndex((c) => c.id === clipId);
      if (clipIndex === -1) return track;

      const clip = track.clips[clipIndex];
      // Check if splitTime falls strictly inside the clip
      if (splitTime <= clip.start || splitTime >= clip.start + clip.duration) {
        return track;
      }

      const firstPartDuration = splitTime - clip.start;
      const secondPartDuration = clip.duration - firstPartDuration;

      const clipA: TimelineClip = {
        ...clip,
        id: `${clip.id}_part1`,
        name: `${clip.name} (1)`,
        duration: firstPartDuration,
      };

      const clipB: TimelineClip = {
        ...clip,
        id: `${clip.id}_part2`,
        name: `${clip.name} (2)`,
        start: splitTime,
        offset: clip.offset + firstPartDuration,
        duration: secondPartDuration,
      };

      const newClips = [...track.clips];
      newClips.splice(clipIndex, 1, clipA, clipB);

      return {
        ...track,
        clips: newClips.sort((a, b) => a.start - b.start),
      };
    }),
  };
}

/**
 * Trims a clip's in/out points
 */
export function trimClip(
  project: TimelineProject,
  clipId: string,
  newStart: number,
  newDuration: number,
  newOffset?: number
): TimelineProject {
  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => {
        if (clip.id !== clipId) return clip;
        return {
          ...clip,
          start: Math.max(0, newStart),
          duration: Math.max(0.1, newDuration),
          offset: newOffset !== undefined ? Math.max(0, newOffset) : clip.offset,
        };
      }).sort((a, b) => a.start - b.start),
    })),
  };
}
