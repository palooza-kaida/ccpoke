import type { AgentRegistry } from "./agent-registry.js";
import type { NotificationChannel, NotificationData } from "../channel/types.js";
import type { TunnelManager } from "../utils/tunnel.js";
import { MINI_APP_BASE_URL } from "../utils/constants.js";
import { responseStore } from "../utils/response-store.js";
import { t } from "../i18n/index.js";
import { log, logError } from "../utils/log.js";

export class AgentHandler {
  constructor(
    private registry: AgentRegistry,
    private channel: NotificationChannel,
    private hookPort: number,
    private tunnelManager: TunnelManager
  ) {}

  async handleStopEvent(agentName: string, rawEvent: unknown): Promise<void> {
    const provider = this.registry.resolve(agentName);
    if (!provider) {
      log(t("agent.unknownAgent", { agent: agentName }));
      return;
    }

    if (provider.settleDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, provider.settleDelayMs));
    }

    const result = provider.parseEvent(rawEvent);

    const data: NotificationData = {
      agent: provider.name,
      agentDisplayName: provider.displayName,
      ...result,
    };

    const responseUrl = this.buildResponseUrl(data);
    this.channel.sendNotification(data, responseUrl).catch((err: unknown) => {
      logError(t("hook.notificationFailed"), err);
    });
  }

  private buildResponseUrl(data: NotificationData): string {
    const id = responseStore.save(data);

    const apiBase = this.tunnelManager.getPublicUrl() || `http://localhost:${this.hookPort}`;
    const params = new URLSearchParams({
      id,
      api: apiBase,
      p: data.projectName,
      d: String(data.durationMs),
      a: data.agent,
    });
    return `${MINI_APP_BASE_URL}/response/?${params.toString()}`;
  }
}
