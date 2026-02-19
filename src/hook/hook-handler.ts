import { execSync } from "node:child_process";
import { parseTranscript } from "../monitor/transcript-parser.js";
import {
  formatNotification,
  extractProjectName,
  type GitChange,
  type NotificationData,
} from "../telegram/message-formatter.js";
import { formatError } from "../utils/error-utils.js";
import { GitChangeStatus, MINI_APP_BASE_URL } from "../utils/constants.js";
import { t } from "../i18n/index.js";
import { responseStore } from "../utils/response-store.js";
import type { TunnelManager } from "../utils/tunnel.js";
import { log } from "../utils/log.js";

const GIT_TIMEOUT_MS = 10_000;

interface StopEvent {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  stop_hook_active: boolean;
}

type NotifyFunc = (text: string, responseUrl?: string) => Promise<void>;

function isValidStopEvent(data: unknown): data is StopEvent {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.session_id === "string"
    && typeof obj.transcript_path === "string"
    && typeof obj.cwd === "string";
}

export class HookHandler {
  private notify: NotifyFunc;
  private hookPort: number;
  private tunnelManager: TunnelManager;

  constructor(notify: NotifyFunc, hookPort: number, tunnelManager: TunnelManager) {
    this.notify = notify;
    this.hookPort = hookPort;
    this.tunnelManager = tunnelManager;
  }

  async handleStopEvent(event: unknown): Promise<void> {
    if (!isValidStopEvent(event)) {
      log(t("hook.invalidPayload"));
      return;
    }

    log(t("hook.stopEventReceived", { sessionId: event.session_id, cwd: event.cwd }));

    await new Promise((resolve) => setTimeout(resolve, 500));

    let summary = { lastAssistantMessage: "", durationMs: 0, totalCostUSD: 0, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
    try {
      summary = parseTranscript(event.transcript_path);
    } catch (err: unknown) {
      log(t("hook.transcriptFailed", { error: formatError(err) }));
    }

    const gitChanges = this.collectGitChanges(event.cwd);

    let durationMs = summary.durationMs;
    if (durationMs === 0 && summary.lastAssistantMessage) {
      durationMs = 1000;
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

    const notification = formatNotification(data);
    const responseUrl = this.buildResponseUrl(data);


    this.notify(notification, responseUrl).catch((err: unknown) => {
      log(t("hook.notificationFailed", { error: formatError(err) }));
    });
  }

  private buildResponseUrl(data: NotificationData): string {
    const id = responseStore.save({
      projectName: data.projectName,
      responseSummary: data.responseSummary,
      durationMs: data.durationMs,
      gitChanges: data.gitChanges,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cacheCreationTokens: data.cacheCreationTokens,
      cacheReadTokens: data.cacheReadTokens,
    });

    const apiBase = this.tunnelManager.getPublicUrl() || `http://localhost:${this.hookPort}`;
    const params = new URLSearchParams({
      id,
      api: apiBase,
      p: data.projectName,
      d: String(data.durationMs),
    });
    return `${MINI_APP_BASE_URL}/response.html?${params.toString()}`;
  }

  private collectGitChanges(cwd: string): GitChange[] {
    try {
      const diffOutput = execSync("git diff --name-status HEAD", {
        cwd,
        encoding: "utf-8",
        timeout: GIT_TIMEOUT_MS,
      });
      const changes = this.parseGitDiffOutput(diffOutput);

      try {
        const untrackedOutput = execSync("git ls-files --others --exclude-standard", {
          cwd,
          encoding: "utf-8",
          timeout: GIT_TIMEOUT_MS,
        });
        for (const file of untrackedOutput.trim().split("\n")) {
          if (file) changes.push({ file, status: GitChangeStatus.Added });
        }
      } catch {}

      return changes;
    } catch {
      try {
        const porcelainOutput = execSync("git status --porcelain", {
          cwd,
          encoding: "utf-8",
          timeout: GIT_TIMEOUT_MS,
        });
        return this.parsePorcelainOutput(porcelainOutput);
      } catch {
        return [];
      }
    }
  }

  private parseGitDiffOutput(output: string): GitChange[] {
    const changes: GitChange[] = [];

    for (const line of output.trim().split("\n")) {
      if (!line) continue;

      const parts = line.split("\t");
      if (parts.length < 2) continue;

      let status: GitChange["status"] = GitChangeStatus.Modified;
      if (parts[0].startsWith("A")) status = GitChangeStatus.Added;
      else if (parts[0].startsWith("D")) status = GitChangeStatus.Deleted;
      else if (parts[0].startsWith("R")) status = GitChangeStatus.Renamed;

      changes.push({ file: parts[1], status });
    }

    return changes;
  }

  private parsePorcelainOutput(output: string): GitChange[] {
    const changes: GitChange[] = [];

    for (const line of output.trim().split("\n")) {
      if (line.length < 4) continue;

      const statusCode = line.slice(0, 2).trim();
      const file = line.slice(3).trim();

      let status: GitChange["status"] = GitChangeStatus.Modified;
      switch (statusCode) {
        case "??":
        case "A":
          status = GitChangeStatus.Added;
          break;
        case "D":
          status = GitChangeStatus.Deleted;
          break;
        case "R":
          status = GitChangeStatus.Renamed;
          break;
      }

      changes.push({ file, status });
    }

    return changes;
  }
}

