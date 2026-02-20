import type { GitChangeStatus } from "../utils/constants.js";

export interface NotificationChannel {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  sendNotification(data: NotificationData, responseUrl?: string): Promise<void>;
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

export interface GitChange {
  file: string;
  status: GitChangeStatus;
}
