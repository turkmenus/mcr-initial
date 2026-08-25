import { OGrafDefinition } from "@mcr/schema";

export class TemplateSandbox {
  private iframe: HTMLIFrameElement | null = null;
  private definition: OGrafDefinition;
  private isReady: boolean = false;
  private pendingCommands: Array<{ type: string; data?: any }> = [];

  constructor(definition: OGrafDefinition) {
    this.definition = definition;
  }

  public mount(container: HTMLElement, src: string): HTMLIFrameElement {
    this.iframe = document.createElement("iframe");
    this.iframe.src = src;
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.border = "none";
    this.iframe.style.overflow = "hidden";
    this.iframe.style.backgroundColor = "transparent";
    this.iframe.setAttribute("allowtransparency", "true");

    const messageHandler = (event: MessageEvent) => {
      if (event.source === this.iframe?.contentWindow) {
        if (event.data?.type === "TEMPLATE_MOUNTED") {
          this.isReady = true;
          this.flushPending();
        }
      }
    };

    window.addEventListener("message", messageHandler);
    container.appendChild(this.iframe);
    return this.iframe;
  }

  private send(type: string, data?: any) {
    if (!this.iframe?.contentWindow || !this.isReady) {
      this.pendingCommands.push({ type, data });
      return;
    }
    this.iframe.contentWindow.postMessage({ type, data }, "*");
  }

  private flushPending() {
    while (this.pendingCommands.length > 0) {
      const cmd = this.pendingCommands.shift();
      if (cmd && this.iframe?.contentWindow) {
        this.iframe.contentWindow.postMessage(cmd, "*");
      }
    }
  }

  public play() {
    this.send("PLAY");
  }

  public stop() {
    this.send("STOP");
  }

  public update(data: any) {
    this.send("UPDATE", data);
  }

  public next() {
    this.send("NEXT");
  }

  public destroy() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
    this.isReady = false;
  }
}
