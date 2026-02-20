import { parseTranscript } from "../monitor/transcript-parser.js";
import { collectGitChanges } from "../monitor/git-collector.js";
import type { NotificationChannel, NotificationData } from "../channel/types.js";
import {
  MINI_APP_BASE_URL,
  TRANSCRIPT_SETTLE_DELAY_MS,
  DEFAULT_FALLBACK_DURATION_MS,
} from "../utils/constants.js";
import { t } from "../i18n/index.js";
import { responseStore } from "../utils/response-store.js";
import type { TunnelManager } from "../utils/tunnel.js";
import { log, logError } from "../utils/log.js";
import { extractProjectName } from "../utils/paths.js";

interface StopEvent {
  session_id: string;
  transcript_path: string;
  cwd: string;
}

function isValidStopEvent(data: unknown): data is StopEvent {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.session_id === "string" &&
    typeof obj.transcript_path === "string" &&
    typeof obj.cwd === "string"
  );
}

export class HookHandler {
  private channel: NotificationChannel;
  private hookPort: number;
  private tunnelManager: TunnelManager;

  constructor(channel: NotificationChannel, hookPort: number, tunnelManager: TunnelManager) {
    this.channel = channel;
    this.hookPort = hookPort;
    this.tunnelManager = tunnelManager;
  }

  async handleStopEvent(event: unknown): Promise<void> {
    if (!isValidStopEvent(event)) {
      log(t("hook.invalidPayload"));
      return;
    }

    log(t("hook.stopEventReceived", { sessionId: event.session_id, cwd: event.cwd }));

    await new Promise((resolve) => setTimeout(resolve, TRANSCRIPT_SETTLE_DELAY_MS));

    let summary = {
      lastAssistantMessage: "",
      durationMs: 0,
      totalCostUSD: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    };
    try {
      summary = parseTranscript(event.transcript_path);
    } catch (err: unknown) {
      logError(t("hook.transcriptFailed"), err);
    }

    const gitChanges = collectGitChanges(event.cwd);

    let durationMs = Math.max(0, summary.durationMs);
    if (durationMs === 0 && summary.lastAssistantMessage) {
      durationMs = DEFAULT_FALLBACK_DURATION_MS;
    }

    const data: NotificationData = {
      projectName: extractProjectName(event.cwd),
      responseSummary: summary.lastAssistantMessage,
      durationMs,
      gitChanges,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      cacheCreationTokens: summary.cacheCreationTokens,
      cacheReadTokens: summary.cacheReadTokens,
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
    });
    return `${MINI_APP_BASE_URL}/response.html?${params.toString()}`;
  }
}
