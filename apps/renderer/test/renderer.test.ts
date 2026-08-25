import { describe, it, expect } from "vitest";
import { EXPORT_PRESETS } from "@mcr/presets";

describe("Renderer Worker Config", () => {
  it("should have valid ffmpeg arguments for broadcast presets", () => {
    const preset = EXPORT_PRESETS["broadcast-16:9"];
    expect(preset.ffmpegArgs).toContain("-c:v");
    expect(preset.ffmpegArgs).toContain("libx264");
  });
});
