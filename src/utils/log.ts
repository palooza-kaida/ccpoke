interface LogOptions {
  showTimestamp?: boolean;
}

function timestamp(): string {
  return `[${new Date().toLocaleString()}]`;
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function log(...args: unknown[]): void {
  console.log(timestamp(), ...args);
}
export function logWarn(message: string, options: LogOptions = {}): void {
  const { showTimestamp = true } = options;
  const colored = "\x1b[33m" + message + "\x1b[0m";
  if (showTimestamp) {
    console.warn(timestamp(), colored);
  } else {
    console.warn(colored);
  }
}

export function logError(message: string, err?: unknown): void {
  const content = err !== undefined ? `${message} ${formatError(err)}` : message;
  console.error(timestamp(), "\x1b[31m" + content + "\x1b[0m");
}
