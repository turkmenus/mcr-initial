import { describe, it, expect } from "vitest";
import { EXPORT_PRESETS, getPresetList } from "../src/index.js";

describe("Video Export Presets", () => {
  it("should contain standard 16:9 Broadcast and 9:16 Social presets", () => {
    const list = getPresetList();
    expect(list.length).toBeGreaterThanOrEqual(4);

    const b169 = EXPORT_PRESETS["broadcast-16:9"];
    expect(b169.width).toBe(1920);
    expect(b169.height).toBe(1080);
    expect(b169.fps).toBe(50);

    const v916 = EXPORT_PRESETS["vertical-9:16"];
    expect(v916.width).toBe(1080);
    expect(v916.height).toBe(1920);
  });
});
