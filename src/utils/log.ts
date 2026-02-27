import { appendFileSync, statSync, writeFileSync } from "node:fs";

const DEBUG_LOG = "/tmp/ccpoke-debug.log";
const MAX_LOG_SIZE = 2 * 1024 * 1024;
let bytesWritten = 0;
const CHECK_EVERY = 100;
let writeCount = 0;

type LogLevel = "debug" | "info" | "warn" | "error";
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";
const levelNum = LEVEL_ORDER[currentLevel] ?? 1;

const fileOnly = process.env.LOG_FILE_ONLY === "1";

interface LogOptions {
  showTimestamp?: boolean;
}

function timestamp(): string {
  return `[${new Date().toLocaleString()}]`;
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

try {
  const size = statSync(DEBUG_LOG).size;
  if (size > MAX_LOG_SIZE) {
    writeFileSync(DEBUG_LOG, `--- log truncated (was ${(size / 1024 / 1024).toFixed(1)}MB) ---\n`);
  } else {
    bytesWritten = size;
  }
} catch {
  /* file may not exist yet */
}

function writeFile(line: string): void {
  try {
    appendFileSync(DEBUG_LOG, line + "\n");
    bytesWritten += line.length + 1;
    writeCount++;

    if (writeCount % CHECK_EVERY === 0 && bytesWritten > MAX_LOG_SIZE) {
      writeFileSync(DEBUG_LOG, `--- log truncated ---\n`);
      bytesWritten = 25;
    }
  } catch {
    /* best-effort file write */
  }
}

export function logDebug(...args: unknown[]): void {
  const msg = `${timestamp()} ${args.map(String).join(" ")}`;
  writeFile(msg);
  if (levelNum <= LEVEL_ORDER.debug && !fileOnly) {
    console.log(timestamp(), ...args);
  }
}

export function log(...args: unknown[]): void {
  const msg = `${timestamp()} ${args.map(String).join(" ")}`;
  writeFile(msg);
  if (levelNum <= LEVEL_ORDER.info && !fileOnly) {
    console.log(timestamp(), ...args);
  }
}

export function logWarn(message: string, options: LogOptions = {}): void {
  const { showTimestamp = true } = options;
  writeFile(`${timestamp()} WARN: ${message}`);
  if (levelNum <= LEVEL_ORDER.warn && !fileOnly) {
    const colored = "\x1b[33m" + message + "\x1b[0m";
    if (showTimestamp) {
      console.warn(timestamp(), colored);
    } else {
      console.warn(colored);
    }
  }
}

export function logError(message: string, err?: unknown): void {
  const content = err !== undefined ? `${message} ${formatError(err)}` : message;
  writeFile(`${timestamp()} ERROR: ${content}`);
  if (!fileOnly) {
    console.error(timestamp(), "\x1b[31m" + content + "\x1b[0m");
  }
}
