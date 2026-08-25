import { describe, it, expect } from "vitest";
import { initialStudioState } from "../src/state.js";

describe("Realtime Studio State", () => {
  it("should initialize default rundown and ticker items", () => {
    expect(initialStudioState.rundown.length).toBeGreaterThan(0);
    expect(initialStudioState.tickerState.items.length).toBeGreaterThan(0);
    expect(initialStudioState.tickerState.speed).toBe(120);
  });
});
