import { AMCPCommand } from "@mcr/schema";

/**
 * Builds standard AMCP protocol string from structured command
 */
export function buildAMCPCommand(cmd: AMCPCommand): string {
  const channel = cmd.channel || 1;
  const layer = cmd.layer !== undefined ? cmd.layer : 20;
  const cgLayer = cmd.cgLayer !== undefined ? cmd.cgLayer : 10;
  const channelLayer = `${channel}-${layer}`;

  // Serialize data payload to JSON string safely escaped for CasparCG AMCP
  const formatData = (data: any): string => {
    if (!data) return '"{}"';
    const jsonStr = typeof data === "string" ? data : JSON.stringify(data);
    // CasparCG AMCP string quoting
    return `"${jsonStr.replace(/"/g, '\\"')}"`;
  };

  switch (cmd.type) {
    case "CG ADD": {
      const template = cmd.template || "default";
      const playOnLoad = cmd.playOnLoad ? "1" : "0";
      const dataStr = cmd.data ? ` ${formatData(cmd.data)}` : "";
      return `CG ${channelLayer} ADD ${cgLayer} "${template}" ${playOnLoad}${dataStr}\r\n`;
    }

    case "CG PLAY":
      return `CG ${channelLayer} PLAY ${cgLayer}\r\n`;

    case "CG STOP":
      return `CG ${channelLayer} STOP ${cgLayer}\r\n`;

    case "CG NEXT":
      return `CG ${channelLayer} NEXT ${cgLayer}\r\n`;

    case "CG UPDATE": {
      const dataStr = formatData(cmd.data || {});
      return `CG ${channelLayer} UPDATE ${cgLayer} ${dataStr}\r\n`;
    }

    case "CG CLEAR":
      return `CG ${channelLayer} CLEAR\r\n`;

    case "PLAY":
      return cmd.template ? `PLAY ${channel}-${layer} "${cmd.template}"\r\n` : `PLAY ${channel}-${layer}\r\n`;

    case "STOP":
      return `STOP ${channel}-${layer}\r\n`;

    case "CLEAR":
      return `CLEAR ${channel}\r\n`;

    case "VERSION":
      return `VERSION\r\n`;

    case "INFO":
      return `INFO ${channel}\r\n`;

    default:
      if (cmd.raw) return cmd.raw.endsWith("\r\n") ? cmd.raw : `${cmd.raw}\r\n`;
      throw new Error(`Unsupported AMCP command: ${cmd.type}`);
  }
}
