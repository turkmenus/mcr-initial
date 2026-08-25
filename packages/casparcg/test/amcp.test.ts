import { describe, it, expect } from "vitest";
import { buildAMCPCommand } from "../src/amcpBuilder.js";
import { parseAMCPResponse } from "../src/amcpParser.js";

describe("AMCP Protocol Builder & Parser", () => {
  it("should generate correct CG ADD AMCP command with JSON payload", () => {
    const cmd = buildAMCPCommand({
      type: "CG ADD",
      channel: 1,
      layer: 20,
      cgLayer: 10,
      template: "lower-third.standard",
      playOnLoad: true,
      data: { title: "Ahmet Yılmaz", subtitle: "Muhabir" },
    });

    expect(cmd).toContain("CG 1-20 ADD 10 \"lower-third.standard\" 1");
    expect(cmd).toContain("Ahmet Yılmaz");
    expect(cmd.endsWith("\r\n")).toBe(true);
  });

  it("should generate correct CG PLAY, STOP, and UPDATE commands", () => {
    expect(buildAMCPCommand({ type: "CG PLAY", channel: 1, layer: 20, cgLayer: 10 })).toBe(
      "CG 1-20 PLAY 10\r\n"
    );
    expect(buildAMCPCommand({ type: "CG STOP", channel: 1, layer: 20, cgLayer: 10 })).toBe(
      "CG 1-20 STOP 10\r\n"
    );
    expect(
      buildAMCPCommand({
        type: "CG UPDATE",
        channel: 1,
        layer: 20,
        cgLayer: 10,
        data: { title: "Yeni İsim" },
      })
    ).toContain("CG 1-20 UPDATE 10");
  });

  it("should parse CasparCG AMCP response codes", () => {
    const responses = parseAMCPResponse("202 CG OK\r\n200 PLAY OK\r\n");
    expect(responses.length).toBe(2);
    expect(responses[0].code).toBe(202);
    expect(responses[0].message).toBe("CG OK");
    expect(responses[1].code).toBe(200);
  });
});
