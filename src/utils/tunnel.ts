import { existsSync } from "node:fs";
import { t } from "../i18n/index.js";
import { log } from "../utils/log.js";

export class TunnelManager {
  private tunnel: { stop: () => boolean } | null = null;
  private url: string | null = null;

  async start(port: number): Promise<string> {
    const { Tunnel, bin, install } = await import("cloudflared");

    if (!existsSync(bin)) {
      log(t("tunnel.installing"));
      await install(bin);
      log(t("tunnel.installed"));
    }

    const tunnel = Tunnel.quick(`http://localhost:${port}`);

    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        tunnel.stop();
        reject(new Error("Tunnel connection timeout (30s)"));
      }, 30_000);

      tunnel.once("url", (url: string) => {
        clearTimeout(timeout);
        resolve(url);
      });

      tunnel.once("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    this.tunnel = tunnel;
    this.url = url;

    tunnel.on("disconnected", () => {
      log(t("tunnel.disconnected"));
    });

    tunnel.on("exit", (code: number | null) => {
      log(t("tunnel.exited", { code: code ?? 0 }));
      this.tunnel = null;
      this.url = null;
    });

    return url;
  }

  getPublicUrl(): string | null {
    return this.url;
  }

  stop(): void {
    if (this.tunnel) {
      this.tunnel.stop();
      this.tunnel = null;
      this.url = null;
    }
  }
}
