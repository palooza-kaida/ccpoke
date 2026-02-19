import { readFileSync } from "node:fs";
import { homedir } from "node:os";

interface TranscriptEntry {
  type?: string;
  message?: MessageContent;
  timestamp?: string;
  costUSD?: number;
  durationMs?: number;
  sessionId?: string;
  parentUuid?: string;
  uuid?: string;
  summary?: string;
}

interface MessageContent {
  role: string;
  content?: ContentPart[];
  usage?: TokenUsage;
}

interface ContentPart {
  type: string;
  text?: string;
}

interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface TranscriptSummary {
  lastAssistantMessage: string;
  durationMs: number;
  totalCostUSD: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export function parseTranscript(transcriptPath: string): TranscriptSummary {
  const expandedPath = expandHome(transcriptPath);
  const raw = readFileSync(expandedPath, "utf-8");
  const lines = raw.split("\n");

  let lastAssistantText = "";
  let summaryText = "";
  let totalCost = 0;
  let firstTimestamp: Date | null = null;
  let lastTimestamp: Date | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    let entry: TranscriptEntry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.timestamp) {
      const t = new Date(entry.timestamp);
      if (!isNaN(t.getTime())) {
        if (!firstTimestamp) firstTimestamp = t;
        lastTimestamp = t;
      }
    }

    totalCost += entry.costUSD ?? 0;

    if (entry.type === "summary" && entry.summary) {
      summaryText = entry.summary;
    }

    if (entry.type === "assistant" || entry.message) {
      const msg = entry.message;
      if (msg?.role === "assistant") {
        const rawContent = msg.content ?? [];
        const contentArray = Array.isArray(rawContent) ? rawContent : [];
        const text = extractTextFromContent(contentArray);
        if (text) {
          lastAssistantText = text;
        }

        if (msg.usage) {
          inputTokens += msg.usage.input_tokens ?? 0;
          outputTokens += msg.usage.output_tokens ?? 0;
          cacheCreationTokens += msg.usage.cache_creation_input_tokens ?? 0;
          cacheReadTokens += msg.usage.cache_read_input_tokens ?? 0;
        }
      }
    }
  }

  let durationMs = 0;
  if (firstTimestamp && lastTimestamp) {
    durationMs = lastTimestamp.getTime() - firstTimestamp.getTime();
  }

  const finalMessage = lastAssistantText || summaryText;

  return {
    lastAssistantMessage: finalMessage,
    durationMs,
    totalCostUSD: totalCost,
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
  };
}

function extractTextFromContent(parts: ContentPart[]): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("\n");
}

function expandHome(path: string): string {
  if (path.startsWith("~/")) {
    return homedir() + path.slice(1);
  }
  return path;
}
