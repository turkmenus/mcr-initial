import net from "net";
import { EventEmitter } from "events";
import { AMCPCommand, AMCPResponse } from "@mcr/schema";
import { buildAMCPCommand } from "./amcpBuilder.js";
import { parseAMCPResponse } from "./amcpParser.js";

export interface CasparClientOptions {
  host?: string;
  port?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export class CasparClient extends EventEmitter {
  private socket: net.Socket | null = null;
  private host: string;
  private port: number;
  private autoReconnect: boolean;
  private reconnectInterval: number;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private buffer: string = "";

  constructor(options: CasparClientOptions = {}) {
    super();
    this.host = options.host || "127.0.0.1";
    this.port = options.port || 5250;
    this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;
    this.reconnectInterval = options.reconnectInterval || 3000;
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket) {
        this.socket.destroy();
      }

      this.socket = new net.Socket();
      this.socket.setEncoding("utf-8");

      this.socket.on("connect", () => {
        this.isConnected = true;
        this.emit("connected", { host: this.host, port: this.port });
        resolve(true);
      });

      this.socket.on("data", (data: string) => {
        this.buffer += data;
        if (this.buffer.includes("\r\n")) {
          const responses = parseAMCPResponse(this.buffer);
          this.buffer = "";
          for (const res of responses) {
            this.emit("response", res);
          }
        }
      });

      this.socket.on("error", (err: Error) => {
        this.emit("error", err);
      });

      this.socket.on("close", () => {
        this.isConnected = false;
        this.emit("disconnected");
        if (this.autoReconnect && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, this.reconnectInterval);
        }
        resolve(false);
      });

      this.socket.connect(this.port, this.host);
    });
  }

  public send(cmd: AMCPCommand | string): Promise<string> {
    return new Promise((resolve, reject) => {
      const rawCmd = typeof cmd === "string" ? (cmd.endsWith("\r\n") ? cmd : `${cmd}\r\n`) : buildAMCPCommand(cmd);

      if (!this.isConnected || !this.socket) {
        this.emit("command_skipped", { reason: "Not connected to CasparCG", command: rawCmd.trim() });
        return resolve(`SKIPPED: CasparCG not connected (${rawCmd.trim()})`);
      }

      this.socket.write(rawCmd, (err) => {
        if (err) {
          this.emit("error", err);
          return reject(err);
        }
        this.emit("command_sent", rawCmd.trim());
        resolve(rawCmd.trim());
      });
    });
  }

  public disconnect(): void {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public get connected(): boolean {
    return this.isConnected;
  }
}
