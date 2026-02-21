function timestamp(): string {
  return `[${new Date().toLocaleString()}]`;
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function log(...args: unknown[]): void {
  console.log(timestamp(), ...args);
}

export function logWarn(...args: unknown[]): void {
  console.warn(timestamp(), "\x1b[33m" + args.map(String).join(" ") + "\x1b[0m");
}

export function logError(message: string, err?: unknown): void {
  const content = err !== undefined ? `${message} ${formatError(err)}` : message;
  console.error(timestamp(), "\x1b[31m" + content + "\x1b[0m");
}
