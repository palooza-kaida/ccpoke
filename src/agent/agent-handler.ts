import type { NotificationChannel, NotificationData } from "../channel/types.js";
import { t } from "../i18n/index.js";
import { MINI_APP_BASE_URL } from "../utils/constants.js";
import { log, logError } from "../utils/log.js";
import { responseStore } from "../utils/response-store.js";
import type { TunnelManager } from "../utils/tunnel.js";
import type { AgentRegistry } from "./agent-registry.js";
import type { ChatSessionResolver } from "./chat-session-resolver.js";

export interface NotificationEvent {
  sessionId: string;
  tmuxTarget?: string;
  notificationType: string;
  message: string;
  title?: string;
  cwd?: string;
}

export class AgentHandler {
  constructor(
    private registry: AgentRegistry,
    private channel: NotificationChannel,
    private hookPort: number,
    private tunnelManager: TunnelManager,
    private chatResolver?: ChatSessionResolver
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

    let chatSessionId: string | undefined;
    if (this.chatResolver) {
      chatSessionId = this.chatResolver.resolveSessionId(
        result.agentSessionId ?? "",
        result.projectName,
        result.cwd,
        result.tmuxTarget
      );
    }

    const data: NotificationData = {
      agent: provider.name,
      agentDisplayName: provider.displayName,
      sessionId: chatSessionId,
      ...result,
    };

    if (chatSessionId && this.chatResolver) {
      this.chatResolver.onStopHook(chatSessionId);
    }

    const responseUrl = this.buildResponseUrl(data);
    this.channel.sendNotification(data, responseUrl).catch((err: unknown) => {
      logError(t("hook.notificationFailed"), err);
    });
  }

  async handleSessionStart(rawEvent: unknown): Promise<void> {
    this.onSessionStart?.(rawEvent);
  }

  onSessionStart?: (rawEvent: unknown) => void;

  onNotification?: (event: NotificationEvent) => void;

  async handleNotification(rawEvent: unknown): Promise<void> {
    const event = this.parseNotificationEvent(rawEvent);
    if (!event) return;

    let sessionId: string | undefined;
    if (this.chatResolver) {
      sessionId = this.chatResolver.resolveSessionId(
        event.sessionId,
        "",
        event.cwd,
        event.tmuxTarget
      );
    }

    if (!sessionId) {
      sessionId = event.sessionId;
    }

    // Only elicitation_dialog blocks the session (needs user input)
    if (event.notificationType === "elicitation_dialog") {
      this.chatResolver?.onNotificationBlock?.(sessionId);
    }

    this.onNotification?.({ ...event, sessionId });
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

  private parseNotificationEvent(raw: unknown): NotificationEvent | null {
    if (!raw || typeof raw !== "object") return null;
    const obj = raw as Record<string, unknown>;

    const sessionId = typeof obj.session_id === "string" ? obj.session_id : "";
    const notificationType = typeof obj.notification_type === "string" ? obj.notification_type : "";
    const message = typeof obj.message === "string" ? obj.message : "";

    if (!sessionId || !notificationType) return null;

    return {
      sessionId,
      notificationType,
      message,
      title: typeof obj.title === "string" ? obj.title : undefined,
      cwd: typeof obj.cwd === "string" ? obj.cwd : undefined,
      tmuxTarget: typeof obj.tmux_target === "string" ? obj.tmux_target : undefined,
    };
  }
}
