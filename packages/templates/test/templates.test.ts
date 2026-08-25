import { describe, it, expect } from "vitest";
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  BROADCAST_TEMPLATES_REGISTRY,
} from "../src/index.js";

describe("@mcr/templates Graphics Package", () => {
  it("provides full suite of 11 broadcast standard templates", () => {
    const templates = getAllTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(11);
  });

  it("retrieves templates by ID and category", () => {
    const lowerThird = getTemplateById("lower-third.standard");
    expect(lowerThird).toBeDefined();
    expect(lowerThird?.name).toContain("Standart Alt Bant");
    expect(lowerThird?.fields.length).toBeGreaterThan(0);

    const tickers = getTemplatesByCategory("TICKER");
    expect(tickers.length).toBeGreaterThanOrEqual(2);

    const stingers = getTemplatesByCategory("STINGER");
    expect(stingers.length).toBeGreaterThanOrEqual(1);

    const social = getTemplateById("lower-third.social");
    expect(social).toBeDefined();

    const bumper = getTemplateById("fullscreen.bumper");
    expect(bumper).toBeDefined();
  });

  it("each template has valid channel and layer assignment", () => {
    for (const tmpl of BROADCAST_TEMPLATES_REGISTRY) {
      expect(tmpl.channel).toBe(1);
      expect(tmpl.layer).toBeGreaterThanOrEqual(10);
      expect(tmpl.cgLayer).toBeGreaterThanOrEqual(1);
      expect(tmpl.inDuration).toBeGreaterThan(0);
      expect(tmpl.outDuration).toBeGreaterThan(0);
      expect(Object.keys(tmpl.defaultData).length).toBeGreaterThan(0);
    }
  });
});
