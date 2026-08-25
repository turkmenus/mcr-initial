import { AMCPResponse } from "@mcr/schema";

/**
 * Parses response lines received from CasparCG AMCP TCP socket
 */
export function parseAMCPResponse(rawText: string): AMCPResponse[] {
  const responses: AMCPResponse[] = [];
  const lines = rawText.split(/\r\n|\r|\n/).filter(line => line.trim().length > 0);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\d{3})\s*(.*)$/);

    if (match) {
      const code = parseInt(match[1], 10);
      const message = match[2] || "";
      const extraData: string[] = [];

      // Codes that return multi-line blocks (e.g. 200, 201)
      // Usually ended by an empty line or next status code
      i++;
      while (i < lines.length && !lines[i].match(/^\d{3}\s/)) {
        extraData.push(lines[i]);
        i++;
      }

      responses.push({
        code,
        message,
        data: extraData.length > 0 ? extraData : undefined,
        raw: line,
      });
    } else {
      i++;
    }
  }

  return responses;
}
