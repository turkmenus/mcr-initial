import { describe, it, expect } from "vitest";
import {
  createDefaultTimelineProject,
  addClipToTrack,
  splitClip,
  trimClip,
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

  it("should resolve active graphics overlays and animation state", () => {
    const project = createDefaultTimelineProject();
    const withGraphics = addClipToTrack(project, "track_graphics_1", {
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

    // Before clip
    const frame1 = getActiveTimelineFrame(withGraphics, 1.0);
    expect(frame1.graphicsClips.length).toBe(0);

    // During IN transition (2.2s -> 0.2s into 0.5s in-duration)
    const frame2 = getActiveTimelineFrame(withGraphics, 2.2);
    expect(frame2.graphicsClips.length).toBe(1);
    expect(frame2.graphicsClips[0].status).toBe("IN");
    expect(frame2.graphicsClips[0].inProgress).toBeCloseTo(0.4);

    // During SHOWING (5.0s)
    const frame3 = getActiveTimelineFrame(withGraphics, 5.0);
    expect(frame3.graphicsClips[0].status).toBe("SHOWING");

    // During OUT transition (7.8s -> 0.2s left of 0.4s out-duration)
    const frame4 = getActiveTimelineFrame(withGraphics, 7.8);
    expect(frame4.graphicsClips[0].status).toBe("OUT");
    expect(frame4.graphicsClips[0].outProgress).toBeCloseTo(0.5);
  });
});
