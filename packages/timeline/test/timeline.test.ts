import { describe, it, expect } from "vitest";
import {
  createDefaultTimelineProject,
  addClipToTrack,
  splitClip,
  trimClip,
  moveClip,
  duplicateClip,
  updateClipProperties,
  addTrack,
  removeTrack,
  reorderTracks,
  rippleDeleteClip,
  splitAllClipsAtTime,
  fitTimelineDuration,
  addMarker,
  removeMarker,
  formatTimecode,
  parseTimecode,
  getActiveTimelineFrame,
} from "../src/index.js";

describe("Timeline EDL Operations and Frame Queries", () => {
  it("should calculate SMPTE timecode at 50fps correctly", () => {
    expect(formatTimecode(0, 50)).toBe("00:00:00:00");
    expect(formatTimecode(1.5, 50)).toBe("00:00:01:25");
    expect(formatTimecode(65.0, 50)).toBe("00:01:05:00");

    expect(parseTimecode("00:01:05:00", 50)).toBe(65.0);
    expect(parseTimecode("00:00:01:25", 50)).toBe(1.5);
  });

  it("should split a clip at playhead time into two separate clips", () => {
    const project = createDefaultTimelineProject();
    const updated = addClipToTrack(project, "track_video_1", {
      id: "clip1",
      name: "Video Clip 1",
      type: "video",
      src: "test.mp4",
      start: 0,
      duration: 10,
      offset: 0,
    });

    const split = splitClip(updated, "clip1", 4);
    const videoTrack = split.tracks.find((t) => t.id === "track_video_1")!;
    expect(videoTrack.clips.length).toBe(2);
    expect(videoTrack.clips[0].duration).toBe(4);
    expect(videoTrack.clips[1].start).toBe(4);
    expect(videoTrack.clips[1].duration).toBe(6);
    expect(videoTrack.clips[1].offset).toBe(4);
  });

  it("should move a clip to a new start time and different track", () => {
    const project = createDefaultTimelineProject();
    const withClip = addClipToTrack(project, "track_video_1", {
      id: "clip_move_1",
      name: "Main Clip",
      type: "video",
      src: "news.mp4",
      start: 2,
      duration: 8,
      offset: 0,
    });

    const moved = moveClip(withClip, "clip_move_1", 10, "track_text_1");
    const v1Track = moved.tracks.find((t) => t.id === "track_video_1")!;
    const t1Track = moved.tracks.find((t) => t.id === "track_text_1")!;
    expect(v1Track.clips.length).toBe(0);
    expect(t1Track.clips.length).toBe(1);
    expect(t1Track.clips[0].start).toBe(10);
  });

  it("should reorder timeline tracks (layer drag and drop)", () => {
    const project = createDefaultTimelineProject();
    const firstTrackId = project.tracks[0].id; // track_graphics_1
    const lastTrackId = project.tracks[project.tracks.length - 1].id; // track_audio_2

    const reordered = reorderTracks(project, firstTrackId, lastTrackId);
    expect(reordered.tracks[reordered.tracks.length - 1].id).toBe(firstTrackId);
  });

  it("should duplicate a clip after itself", () => {
    const project = createDefaultTimelineProject();
    const withClip = addClipToTrack(project, "track_video_1", {
      id: "clip_orig",
      name: "Original Video",
      type: "video",
      src: "orig.mp4",
      start: 0,
      duration: 5,
      offset: 0,
    });

    const duplicated = duplicateClip(withClip, "clip_orig");
    const v1Track = duplicated.tracks.find((t) => t.id === "track_video_1")!;
    expect(v1Track.clips.length).toBe(2);
    expect(v1Track.clips[1].start).toBe(5);
    expect(v1Track.clips[1].duration).toBe(5);
  });

  it("should update clip properties", () => {
    const project = createDefaultTimelineProject();
    const withClip = addClipToTrack(project, "track_video_1", {
      id: "clip_prop",
      name: "Before Update",
      type: "video",
      src: "test.mp4",
      start: 0,
      duration: 10,
      offset: 0,
    });

    const updated = updateClipProperties(withClip, "clip_prop", {
      name: "After Update",
      scale: 1.5,
      brightness: 1.2,
    });
    const vTrack = updated.tracks.find((t) => t.id === "track_video_1")!;
    expect(vTrack.clips[0].name).toBe("After Update");
    expect((vTrack.clips[0] as any).scale).toBe(1.5);
  });

  it("should add and remove markers", () => {
    const project = createDefaultTimelineProject();
    const withMarker = addMarker(project, 15.5, "Canlı Bağlantı", "#EF4444");
    expect(withMarker.markers.some((m) => m.time === 15.5)).toBe(true);

    const markerId = withMarker.markers.find((m) => m.time === 15.5)!.id;
    const removed = removeMarker(withMarker, markerId);
    expect(removed.markers.some((m) => m.id === markerId)).toBe(false);
  });

  it("should resolve active graphics overlays, text clips, and audio fades", () => {
    let project = createDefaultTimelineProject();
    project = addClipToTrack(project, "track_graphics_1", {
      id: "g1",
      name: "Lower Third",
      type: "graphics",
      templateId: "lower-third.standard",
      start: 2.0,
      duration: 6.0,
      offset: 0,
      inDuration: 0.5,
      outDuration: 0.4,
      data: { title: "Test" },
    });

    project = addClipToTrack(project, "track_text_1", {
      id: "t1",
      name: "Manşet",
      type: "text",
      text: "SON DAKİKA GELİŞMESİ",
      start: 1.0,
      duration: 4.0,
      offset: 0,
      fontSize: 54,
    });

    project = addClipToTrack(project, "track_audio_1", {
      id: "a1",
      name: "Ses",
      type: "audio",
      src: "audio.wav",
      start: 0,
      duration: 10,
      offset: 0,
      volume: 1.0,
      fadeIn: 2.0,
      fadeOut: 2.0,
    });

    // Before graphics, but during text
    const frame1 = getActiveTimelineFrame(project, 1.5);
    expect(frame1.graphicsClips.length).toBe(0);
    expect(frame1.textClips.length).toBe(1);
    expect(frame1.textClips[0].clip.text).toBe("SON DAKİKA GELİŞMESİ");

    // Audio fade in check at 1.5s (1.5 / 2.0 = 0.75 volume)
    expect(frame1.audioClips[0].volume).toBeCloseTo(0.75);

    // Audio fade in check at 1.0s (1.0 / 2.0 = 0.5 volume)
    const frameAt1s = getActiveTimelineFrame(project, 1.0);
    expect(frameAt1s.audioClips[0].volume).toBeCloseTo(0.5);

    // During IN transition for graphics (2.2s -> 0.2s into 0.5s in-duration)
    const frame2 = getActiveTimelineFrame(project, 2.2);
    expect(frame2.graphicsClips.length).toBe(1);
    expect(frame2.graphicsClips[0].status).toBe("IN");
    expect(frame2.graphicsClips[0].inProgress).toBeCloseTo(0.4);

    // During SHOWING (5.0s)
    const frame3 = getActiveTimelineFrame(project, 5.0);
    expect(frame3.graphicsClips[0].status).toBe("SHOWING");

    // During OUT transition (7.8s -> 0.2s left of 0.4s out-duration)
    const frame4 = getActiveTimelineFrame(project, 7.8);
    expect(frame4.graphicsClips[0].status).toBe("OUT");
    expect(frame4.graphicsClips[0].outProgress).toBeCloseTo(0.5);
  });

  it("should ripple delete a clip and shift subsequent clips to the left", () => {
    const project = createDefaultTimelineProject();
    let withClips = addClipToTrack(project, "track_video_1", {
      id: "c1",
      name: "Clip 1",
      type: "video",
      src: "1.mp4",
      start: 0,
      duration: 5,
      offset: 0,
    });
    withClips = addClipToTrack(withClips, "track_video_1", {
      id: "c2",
      name: "Clip 2",
      type: "video",
      src: "2.mp4",
      start: 5,
      duration: 10,
      offset: 0,
    });
    withClips = addClipToTrack(withClips, "track_video_1", {
      id: "c3",
      name: "Clip 3",
      type: "video",
      src: "3.mp4",
      start: 15,
      duration: 8,
      offset: 0,
    });

    const rippled = rippleDeleteClip(withClips, "c2");
    const v1Track = rippled.tracks.find((t) => t.id === "track_video_1")!;
    expect(v1Track.clips.length).toBe(2);
    expect(v1Track.clips[0].id).toBe("c1");
    expect(v1Track.clips[0].start).toBe(0);
    expect(v1Track.clips[1].id).toBe("c3");
    expect(v1Track.clips[1].start).toBe(5); // shifted 10s earlier
  });

  it("should split all clips across tracks at playhead time", () => {
    let project = createDefaultTimelineProject();
    project = addClipToTrack(project, "track_video_1", {
      id: "v_split",
      name: "Video Clip",
      type: "video",
      src: "v.mp4",
      start: 0,
      duration: 10,
      offset: 0,
    });
    project = addClipToTrack(project, "track_audio_1", {
      id: "a_split",
      name: "Audio Clip",
      type: "audio",
      src: "a.mp3",
      start: 2,
      duration: 8,
      offset: 0,
    });

    const allSplit = splitAllClipsAtTime(project, 5);
    const vTrack = allSplit.tracks.find((t) => t.id === "track_video_1")!;
    const aTrack = allSplit.tracks.find((t) => t.id === "track_audio_1")!;
    expect(vTrack.clips.length).toBe(2);
    expect(aTrack.clips.length).toBe(2);
  });

  it("should fit timeline project duration to the end of last clip", () => {
    let project = createDefaultTimelineProject();
    project = addClipToTrack(project, "track_video_1", {
      id: "v_long",
      name: "Long Video",
      type: "video",
      src: "v.mp4",
      start: 20,
      duration: 35,
      offset: 0,
    });

    const fitted = fitTimelineDuration(project, 5);
    expect(fitted.duration).toBe(60); // 20 + 35 + 5 = 60
  });
});

