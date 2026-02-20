function timestamp(): string {
  return `[${new Date().toLocaleString()}]`;
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function log(...args: unknown[]): void {
  console.log(timestamp(), ...args);
}

export function logError(message: string, err?: unknown): void {
  if (err !== undefined) {
    console.error(timestamp(), message, formatError(err));
  } else {
    console.error(timestamp(), message);
  }
}
