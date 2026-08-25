import { describe, it, expect } from "vitest";
import { EXPORT_PRESETS } from "@mcr/presets";
import { renderTimelineToVideo, isNvencAvailable } from "../src/ffmpegPipeline.js";
import { TimelineProject } from "@mcr/schema";
import fs from "fs";

describe("Renderer Worker Config", () => {
  it("should have valid ffmpeg arguments for broadcast presets", () => {
    const preset = EXPORT_PRESETS["broadcast-16:9"];
    expect(preset.ffmpegArgs).toContain("-c:v");
    expect(preset.ffmpegArgs).toContain("libx264");
  });

  it("should check NVENC capability without throwing", async () => {
    const available = await isNvencAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("should successfully render a timeline project to a valid MP4 file", async () => {
    const sampleProject: TimelineProject = {
      id: "test_project_1",
      name: "Test News Bulletin",
      duration: 2,
      aspectRatio: "16:9",
      fps: 50,
      tracks: [
        {
          id: "t_v1",
          name: "V1",
          type: "video",
          order: 0,
          visible: true,
          locked: false,
          clips: [
            {
              id: "c_v1",
              name: "Anchor",
              type: "video",
              src: "apps/web/public/media/studio_anchor.mp4",
              start: 0,
              duration: 2,
              offset: 0,
            },
          ],
        },
        {
          id: "t_a1",
          name: "A1",
          type: "audio",
          order: 1,
          muted: false,
          locked: false,
          clips: [
            {
              id: "c_a1",
              name: "Voice",
              type: "audio",
              src: "apps/web/public/media/reporter_voice.mp3",
              start: 0,
              duration: 2,
              offset: 0,
              volume: 1,
            },
          ],
        },
        {
          id: "t_gfx",
          name: "G1",
          type: "graphics",
          order: 2,
          visible: true,
          locked: false,
          clips: [
            {
              id: "c_g1",
              name: "Lower Third",
              type: "graphics",
              templateId: "lower-third-1",
              start: 0,
              duration: 2,
              data: {
                title: "CANLI YAYIN: MCR Master",
                subtitle: "Stüdyo Masası",
              },
            },
          ],
        },
      ],
    };

    const { outputPath } = await renderTimelineToVideo(sampleProject, "broadcast-16:9", "/tmp/mcr_test_renders");
    expect(fs.existsSync(outputPath)).toBe(true);
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(1000);

    // Clean up
    try {
      fs.unlinkSync(outputPath);
    } catch {}
  }, 30000);

  it("should successfully render an empty project with no clips without error 254", async () => {
    const emptyProject: TimelineProject = {
      id: "empty_proj_1",
      name: "Empty Timeline",
      duration: 1,
      fps: 50,
      tracks: [
        {
          id: "t_v1",
          name: "V1",
          type: "video",
          clips: [],
        },
      ],
    };

    const { outputPath } = await renderTimelineToVideo(emptyProject, "broadcast-16:9", "/tmp/mcr_test_renders");
    expect(fs.existsSync(outputPath)).toBe(true);
    const stats = fs.statSync(outputPath);
    expect(stats.size).toBeGreaterThan(500);

    try {
      fs.unlinkSync(outputPath);
    } catch {}
  }, 20000);
});

