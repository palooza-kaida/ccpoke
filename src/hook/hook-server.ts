import express, { type Express } from "express";
import type { Server } from "node:http";
import { HookHandler } from "./hook-handler.js";
import { responseStore } from "../utils/response-store.js";
import { MINI_APP_BASE_URL, ApiRoute } from "../utils/constants.js";
import { t } from "../i18n/index.js";
import { log } from "../utils/log.js";

const ALLOWED_CORS_ORIGIN = new URL(MINI_APP_BASE_URL).origin;

export class HookServer {
  private app: Express;
  private server: Server | null = null;
  private port: number;
  private secret: string;
  private handler: HookHandler | null = null;

  constructor(port: number, secret: string) {
    this.port = port;
    this.secret = secret;
    this.app = this.createApp();
  }

  setHandler(handler: HookHandler): void {
    this.handler = handler;
  }

  start(): void {
    this.server = this.app.listen(this.port, "127.0.0.1", () => {
      log(t("hook.serverListening", { port: this.port }));
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => resolve());
    });
  }

  private createApp(): Express {
    const app = express();
    app.use(express.json({ limit: "10mb" }));
    app.get(ApiRoute.ResponseData, (req, res) => {
      const requestOrigin = req.headers.origin ?? "";
      const isTunnel = requestOrigin.endsWith(".trycloudflare.com");
      res.header("Access-Control-Allow-Origin", isTunnel ? requestOrigin : ALLOWED_CORS_ORIGIN);
      const data = responseStore.get(req.params.id);
      if (!data) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(data);
    });

    app.post(ApiRoute.HookStop, (req, res) => {
      const receivedSecret = req.headers["x-ccpoke-secret"];
      if (receivedSecret !== this.secret) {
        res.status(403).send("forbidden");
        return;
      }

      setImmediate(() => this.handler?.handleStopEvent(req.body));
      res.status(200).send("ok");
    });

    app.get(ApiRoute.Health, (_req, res) => {
      res.status(200).send("healthy");
    });

    return app;
  }
}
