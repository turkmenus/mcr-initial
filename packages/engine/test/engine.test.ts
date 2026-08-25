import { describe, it, expect } from "vitest";
import { OGRAF_BRIDGE_INLINE_SCRIPT } from "../src/runtimeBridge.js";

describe("OGraf Template Engine Bridge", () => {
  it("should contain standard postMessage handlers for CasparCG lifecycle", () => {
    expect(OGRAF_BRIDGE_INLINE_SCRIPT).toContain("TEMPLATE_MOUNTED");
    expect(OGRAF_BRIDGE_INLINE_SCRIPT).toContain("PLAY");
    expect(OGRAF_BRIDGE_INLINE_SCRIPT).toContain("STOP");
    expect(OGRAF_BRIDGE_INLINE_SCRIPT).toContain("UPDATE");
  });
});
