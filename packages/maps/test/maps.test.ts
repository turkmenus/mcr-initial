import { describe, it, expect } from "vitest";
import { BROADCAST_CITIES, getCityById, CAMERA_PRESETS } from "../src/index.js";

describe("Maps and Broadcast Cities Metadata", () => {
  it("should contain Turkmenistan provincial capitals", () => {
    const ashgabat = getCityById("ashgabat");
    expect(ashgabat).toBeDefined();
    expect(ashgabat?.country).toBe("Türkmenistan");
    expect(ashgabat?.lat).toBe(37.95);
  });

  it("should define national camera tour presets", () => {
    expect(CAMERA_PRESETS["national-tour"]).toBeDefined();
    expect(CAMERA_PRESETS["national-tour"].keyframes.length).toBeGreaterThan(3);
  });
});
