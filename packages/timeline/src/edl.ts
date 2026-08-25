import {
  TimelineProject,
  Track,
  TimelineClip,
  VideoClip,
  AudioClip,
  GraphicsOverlayClip,
  TextClip,
  ImageClip,
  Marker,
} from "@mcr/schema";

/**
 * Creates a blank default timeline project with broadcast tracks
 */
export function createDefaultTimelineProject(
  name = "Akşam Bülteni Master Kurgu",
  id = "proj_default_01"
): TimelineProject {
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
        zIndex: 40,
        clips: [],
      },
      {
        id: "track_text_1",
        name: "Başlık & Metin (T1)",
        type: "text",
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
        name: "Röportaj / Ses (A1)",
        type: "audio",
        muted: false,
        locked: false,
        visible: true,
        zIndex: 1,
        clips: [],
      },
      {
        id: "track_audio_2",
        name: "Müzik & SFX (A2)",
        type: "audio",
        muted: false,
        locked: false,
        visible: true,
        zIndex: 2,
        clips: [],
      },
    ],
    markers: [
      { id: "m_1", time: 0, label: "Giriş / Jingle", color: "#38BDF8" },
      { id: "m_2", time: 12, label: "B-Roll Geçiş", color: "#F59E0B" },
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
 * Moves a clip to a new start time, and optionally moves it to a target track
 */
export function moveClip(
  project: TimelineProject,
  clipId: string,
  newStart: number,
  targetTrackId?: string
): TimelineProject {
  const cleanStart = Math.max(0, newStart);
  let foundClip: TimelineClip | null = null;
  let sourceTrackId: string | null = null;

  for (const t of project.tracks) {
    const c = t.clips.find((clip) => clip.id === clipId);
    if (c) {
      foundClip = { ...c, start: cleanStart };
      sourceTrackId = t.id;
      break;
    }
  }

  if (!foundClip || !sourceTrackId) return project;

  const destTrackId = targetTrackId || sourceTrackId;

  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map((track) => {
      if (track.id === sourceTrackId && sourceTrackId === destTrackId) {
        return {
          ...track,
          clips: track.clips
            .map((c) => (c.id === clipId ? foundClip! : c))
            .sort((a, b) => a.start - b.start),
        };
      }
      if (track.id === sourceTrackId) {
        return {
          ...track,
          clips: track.clips.filter((c) => c.id !== clipId),
        };
      }
      if (track.id === destTrackId) {
        return {
          ...track,
          clips: [...track.clips, foundClip!].sort((a, b) => a.start - b.start),
        };
      }
      return track;
    }),
  };
}

/**
 * Duplicates a clip directly after itself on the same track
 */
export function duplicateClip(project: TimelineProject, clipId: string): TimelineProject {
  let targetTrackId: string | null = null;
  let targetClip: TimelineClip | null = null;

  for (const track of project.tracks) {
    const found = track.clips.find((c) => c.id === clipId);
    if (found) {
      targetTrackId = track.id;
      targetClip = found;
      break;
    }
  }

  if (!targetClip || !targetTrackId) return project;

  const newClip: TimelineClip = {
    ...targetClip,
    id: `clip_dup_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: `${targetClip.name} (Kopya)`,
    start: targetClip.start + targetClip.duration,
  };

  return addClipToTrack(project, targetTrackId, newClip);
}

/**
 * Updates partial properties of a specific clip
 */
export function updateClipProperties(
  project: TimelineProject,
  clipId: string,
  partialProps: Partial<TimelineClip> | Record<string, any>
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
          ...partialProps,
        } as TimelineClip;
      }).sort((a, b) => a.start - b.start),
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
      const curOffset = clip.offset ?? 0;

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
        offset: curOffset + firstPartDuration,
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
        const curOffset = clip.offset ?? 0;
        return {
          ...clip,
          start: Math.max(0, newStart),
          duration: Math.max(0.1, newDuration),
          offset: newOffset !== undefined ? Math.max(0, newOffset) : curOffset,
        };
      }).sort((a, b) => a.start - b.start),
    })),
  };
}

/**
 * Adds a new track to the project
 */
export function addTrack(
  project: TimelineProject,
  type: "video" | "audio" | "graphics" | "text",
  name?: string
): TimelineProject {
  const count = project.tracks.filter((t) => t.type === type).length + 1;
  const typeLabel = type === "video" ? "V" : type === "audio" ? "A" : type === "graphics" ? "G" : "T";
  const defaultName = `${type.toUpperCase()} Katmanı (${typeLabel}${count})`;
  const newTrack: Track = {
    id: `track_${type}_${Date.now()}`,
    name: name || defaultName,
    type,
    muted: false,
    locked: false,
    visible: true,
    zIndex: type === "graphics" ? 40 : type === "text" ? 30 : type === "video" ? 10 + count : count,
    clips: [],
  };

  return {
    ...project,
    updatedAt: Date.now(),
    tracks: [...project.tracks, newTrack],
  };
}

/**
 * Removes a track from the project
 */
export function removeTrack(project: TimelineProject, trackId: string): TimelineProject {
  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.filter((t) => t.id !== trackId),
  };
}

/**
 * Toggles a track property (muted, locked, visible)
 */
export function updateTrack(
  project: TimelineProject,
  trackId: string,
  partial: Partial<Track>
): TimelineProject {
  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, ...partial } : t)),
  };
}

/**
 * Adds a marker to the timeline
 */
export function addMarker(
  project: TimelineProject,
  time: number,
  label = "İşaretçi",
  color = "#38BDF8"
): TimelineProject {
  const marker: Marker = {
    id: `marker_${Date.now()}`,
    time,
    label,
    color,
  };
  return {
    ...project,
    updatedAt: Date.now(),
    markers: [...(project.markers || []), marker].sort((a, b) => a.time - b.time),
  };
}

/**
 * Reorders tracks in the timeline (Layer Drag & Drop)
 */
export function reorderTracks(
  project: TimelineProject,
  sourceTrackId: string,
  targetTrackId: string
): TimelineProject {
  if (sourceTrackId === targetTrackId) return project;

  const sourceIndex = project.tracks.findIndex((t) => t.id === sourceTrackId);
  const targetIndex = project.tracks.findIndex((t) => t.id === targetTrackId);

  if (sourceIndex === -1 || targetIndex === -1) return project;

  const newTracks = [...project.tracks];
  const [removed] = newTracks.splice(sourceIndex, 1);
  newTracks.splice(targetIndex, 0, removed);

  return {
    ...project,
    updatedAt: Date.now(),
    tracks: newTracks,
  };
}

/**
 * Removes a marker from the timeline
 */
export function removeMarker(project: TimelineProject, markerId: string): TimelineProject {
  return {
    ...project,
    updatedAt: Date.now(),
    markers: (project.markers || []).filter((m) => m.id !== markerId),
  };
}

/**
 * Ripple deletes a clip and shifts all subsequent clips on that track to the left to close the gap
 */
export function rippleDeleteClip(project: TimelineProject, clipId: string): TimelineProject {
  let targetTrackId: string | null = null;
  let targetClip: TimelineClip | null = null;

  for (const track of project.tracks) {
    const found = track.clips.find((c) => c.id === clipId);
    if (found) {
      targetTrackId = track.id;
      targetClip = found;
      break;
    }
  }

  if (!targetClip || !targetTrackId) return project;

  const clipDuration = targetClip.duration;
  const clipStart = targetClip.start;

  return {
    ...project,
    updatedAt: Date.now(),
    tracks: project.tracks.map((track) => {
      if (track.id !== targetTrackId) return track;
      return {
        ...track,
        clips: track.clips
          .filter((c) => c.id !== clipId)
          .map((c) => {
            if (c.start > clipStart) {
              return { ...c, start: Math.max(0, c.start - clipDuration) };
            }
            return c;
          })
          .sort((a, b) => a.start - b.start),
      };
    }),
  };
}

/**
 * Splits all active clips across all unlocked tracks at splitTime
 */
export function splitAllClipsAtTime(project: TimelineProject, splitTime: number): TimelineProject {
  let currentProject = project;
  for (const track of project.tracks) {
    if (track.locked) continue;
    for (const clip of track.clips) {
      if (splitTime > clip.start && splitTime < clip.start + clip.duration) {
        currentProject = splitClip(currentProject, clip.id, splitTime);
      }
    }
  }
  return currentProject;
}

/**
 * Recalculates and expands/contracts total project duration to fit the furthest ending clip (+ buffer)
 */
export function fitTimelineDuration(project: TimelineProject, bufferSeconds = 5): TimelineProject {
  let maxEndTime = 15;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const endTime = clip.start + clip.duration;
      if (endTime > maxEndTime) {
        maxEndTime = endTime;
      }
    }
  }
  return {
    ...project,
    duration: Math.ceil(maxEndTime + bufferSeconds),
    updatedAt: Date.now(),
  };
}

