import net from "net";
import { EventEmitter } from "events";

export class MockCasparServer extends EventEmitter {
  private server: net.Server | null = null;
  private port: number;
  private clients: Set<net.Socket> = new Set();

  constructor(port: number = 5250) {
    super();
    this.port = port;
  }

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.clients.add(socket);
        this.emit("client_connected", { remoteAddress: socket.remoteAddress });

        let buffer = "";
        socket.on("data", (chunk) => {
          buffer += chunk.toString("utf-8");
          const lines = buffer.split(/\r\n|\r|\n/);
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            this.emit("command", trimmed);

            // Respond appropriately
            if (trimmed.startsWith("CG")) {
              socket.write("202 CG OK\r\n");
            } else if (trimmed.startsWith("VERSION")) {
              socket.write("200 VERSION 2.4.0 MOCK-SERVER\r\n");
            } else if (trimmed.startsWith("INFO")) {
              socket.write("200 INFO OK\r\n1080p5000\r\n");
            } else {
              socket.write("200 OK\r\n");
            }
          }
        });

        socket.on("close", () => {
          this.clients.delete(socket);
          this.emit("client_disconnected");
        });

        socket.on("error", (err) => {
          this.emit("client_error", err);
        });
      });

      this.server.on("error", (err) => {
        reject(err);
      });

      this.server.listen(this.port, () => {
        this.emit("started", { port: this.port });
        resolve(this.port);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this.clients) {
        client.destroy();
      }
      this.clients.clear();
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
