import { join, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(MODULE_DIR, "..", "..");

const CCBOT_HOME = join(homedir(), ".ccbot");
const CLAUDE_HOME = join(homedir(), ".claude");

export const paths = {
  projectRoot: PROJECT_ROOT,

  packageJson: join(PROJECT_ROOT, "package.json"),

  ccbotDir: CCBOT_HOME,
  configFile: join(CCBOT_HOME, "config.json"),
  stateFile: join(CCBOT_HOME, "state.json"),
  hooksDir: join(CCBOT_HOME, "hooks"),
  hookScript: join(
    CCBOT_HOME,
    "hooks",
    process.platform === "win32" ? "stop-notify.cmd" : "stop-notify.sh"
  ),
  responsesDir: join(CCBOT_HOME, "responses"),

  claudeDir: CLAUDE_HOME,
  claudeSettings: join(CLAUDE_HOME, "settings.json"),
} as const;

export function getPackageVersion(): string {
  try {
    return JSON.parse(readFileSync(paths.packageJson, "utf-8")).version;
  } catch {
    return "unknown";
  }
}

export function expandHome(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return join(homedir(), filepath.slice(2));
  }
  return filepath;
}

export function extractProjectName(cwd: string): string {
  return basename(cwd);
}
