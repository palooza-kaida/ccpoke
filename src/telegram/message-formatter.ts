import { basename } from "node:path";
import { GitChangeStatus } from "../utils/constants.js";
import { t } from "../i18n/index.js";

export interface GitChange {
  file: string;
  status: GitChangeStatus;
}

export interface NotificationData {
  projectName: string;
  responseSummary: string;
  durationMs: number;
  gitChanges: GitChange[];
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export function formatNotification(data: NotificationData): string {
  const parts: string[] = [];

  let header = `<b>${escapeHtml(data.projectName)}</b>`;
  if (data.durationMs > 0) {
    header += ` — ${escapeHtml(formatDuration(data.durationMs))}`;
  }
  parts.push(header);

  if (data.inputTokens > 0 || data.outputTokens > 0) {
    parts.push(`${t("notification.tokens")}: ${formatTokenCount(data.inputTokens)} → ${formatTokenCount(data.outputTokens)}`);
  }

  if (data.cacheReadTokens > 0 || data.cacheCreationTokens > 0) {
    const cacheParts: string[] = [];
    if (data.cacheReadTokens > 0) cacheParts.push(`${formatTokenCount(data.cacheReadTokens)} ${t("notification.cacheRead")}`);
    if (data.cacheCreationTokens > 0) cacheParts.push(`${formatTokenCount(data.cacheCreationTokens)} ${t("notification.cacheWrite")}`);
    parts.push(`${t("notification.cache")}: ${cacheParts.join(", ")}`);
  }

  return parts.join("\n");
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m${seconds}s`;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return `${tokens}`;
}

function gitChangeEmoji(status: GitChangeStatus): string {
  switch (status) {
    case GitChangeStatus.Added:
      return "➕";
    case GitChangeStatus.Deleted:
      return "❌";
    case GitChangeStatus.Renamed:
      return "📝";
    default:
      return "✏️";
  }
}

export function extractProjectName(cwd: string): string {
  return basename(cwd);
}
