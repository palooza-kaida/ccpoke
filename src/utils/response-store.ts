import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface StoredResponse {
  id: string;
  projectName: string;
  responseSummary: string;
  durationMs: number;
  gitChanges: Array<{ file: string; status: string }>;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  timestamp: number;
}

const STORE_DIR = join(homedir(), ".ccbot", "responses");
const MAX_RESPONSES = 100;
const EXPIRE_MS = 24 * 60 * 60 * 1000;

class ResponseStore {
  private responses = new Map<string, StoredResponse>();

  constructor() {
    mkdirSync(STORE_DIR, { recursive: true });
    this.loadFromDisk();
  }

  save(data: Omit<StoredResponse, "id" | "timestamp">): string {
    this.cleanup();
    const id = randomUUID().slice(0, 8);
    const entry: StoredResponse = { ...data, id, timestamp: Date.now() };
    this.responses.set(id, entry);
    this.persistToDisk(id, entry);
    return id;
  }

  get(id: string): StoredResponse | undefined {
    const entry = this.responses.get(id);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > EXPIRE_MS) {
      this.responses.delete(id);
      this.removeFromDisk(id);
      return undefined;
    }
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.responses) {
      if (now - entry.timestamp > EXPIRE_MS) {
        this.responses.delete(id);
        this.removeFromDisk(id);
      }
    }

    if (this.responses.size >= MAX_RESPONSES) {
      const sorted = [...this.responses.entries()]
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      const toRemove = sorted.slice(MAX_RESPONSES - 1);
      for (const [id] of toRemove) {
        this.responses.delete(id);
        this.removeFromDisk(id);
      }
    }
  }

  private persistToDisk(id: string, entry: StoredResponse): void {
    try {
      writeFileSync(
        join(STORE_DIR, `${id}.json`),
        JSON.stringify(entry),
        { mode: 0o600 },
      );
    } catch {}
  }

  private removeFromDisk(id: string): void {
    try {
      unlinkSync(join(STORE_DIR, `${id}.json`));
    } catch {}
  }

  private loadFromDisk(): void {
    try {
      const files = readdirSync(STORE_DIR).filter(f => f.endsWith(".json"));
      const now = Date.now();

      for (const file of files) {
        try {
          const data = readFileSync(join(STORE_DIR, file), "utf-8");
          const entry: StoredResponse = JSON.parse(data);
          if (entry.id && now - entry.timestamp < EXPIRE_MS) {
            this.responses.set(entry.id, entry);
          } else {
            this.removeFromDisk(entry.id || file.replace(".json", ""));
          }
        } catch {}
      }
    } catch {}
  }
}

export const responseStore = new ResponseStore();
