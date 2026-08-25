import { describe, it, expect } from "vitest";
import { OGrafDefinitionSchema } from "../src/ograf.js";

describe("OGraf Schema Validation", () => {
  it("should validate a compliant OGraf definition with x-mcr metadata", () => {
    const validOGraf = {
      $schema: "ograf/graphics-definition@1",
      id: "lower-third.standard",
      version: "1.0.0",
      name: "Standart Alt Bant",
      category: "lower-third",
      render: {
        type: "html",
        entry: "index.html",
        canvas: { width: 1920, height: 1080 },
        responsive: true,
        fps: 50,
      },
      data: {
        fields: {
          title: { type: "string", label: "İsim", maxLength: 48 },
          subtitle: { type: "string", label: "Ünvan", maxLength: 64 },
          accent: { type: "color", label: "Renk", default: "#C8102E" },
        },
      },
      states: {
        in: { duration: 0.6 },
        out: { duration: 0.4 },
        next: { duration: 0.3 },
        update: { duration: 0.3 },
      },
      "x-mcr": {
        playout: {
          casparcg: { channel: 1, layer: 20, cgLayer: 10 },
          web: { route: "/output", zIndex: 20 },
        },
        editor: { defaultDuration: 5, trackType: "graphics", resizable: true },
      },
    };

    const result = OGrafDefinitionSchema.safeParse(validOGraf);
    expect(result.success).toBe(true);
  });
});
