import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { paths } from "../../utils/paths.js";
import { ApiRoute } from "../../utils/constants.js";
import { AgentName } from "../types.js";

interface ClaudeHookCommand {
  type: string;
  command: string;
  timeout: number;
}

interface ClaudeStopEntry {
  hooks: ClaudeHookCommand[];
}

interface ClaudeSettings {
  hooks?: {
    Stop?: ClaudeStopEntry[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function hasCcpokeHook(entries: ClaudeStopEntry[]): boolean {
  return entries.some((entry) =>
    entry.hooks?.some((h) => typeof h.command === "string" && h.command.includes("ccpoke"))
  );
}

export class ClaudeCodeInstaller {
  static isInstalled(): boolean {
    try {
      const settings = ClaudeCodeInstaller.readSettings();
      return hasCcpokeHook(settings.hooks?.Stop ?? []);
    } catch {
      return false;
    }
  }

  static install(hookPort: number, hookSecret: string): void {
    const settings = ClaudeCodeInstaller.readSettings();

    if (!settings.hooks) settings.hooks = {};
    const stopEntries = settings.hooks.Stop ?? [];

    if (hasCcpokeHook(stopEntries)) return;

    stopEntries.push({
      hooks: [{ type: "command", command: paths.claudeCodeHookScript, timeout: 10 }],
    });
    settings.hooks.Stop = stopEntries;

    mkdirSync(paths.claudeDir, { recursive: true });
    writeFileSync(paths.claudeSettings, JSON.stringify(settings, null, 2));

    ClaudeCodeInstaller.writeScript(hookPort, hookSecret);
  }

  static uninstall(): void {
    ClaudeCodeInstaller.removeFromSettings();
    ClaudeCodeInstaller.removeScript();
  }

  private static writeScript(hookPort: number, hookSecret: string): void {
    mkdirSync(paths.hooksDir, { recursive: true });

    const agentParam = `?agent=${AgentName.ClaudeCode}`;
    const isWindows = process.platform === "win32";
    const script = isWindows
      ? `@echo off\ncurl -s -X POST http://localhost:${hookPort}${ApiRoute.HookStop}${agentParam} -H "Content-Type: application/json" -H "X-CCPoke-Secret: ${hookSecret}" --data-binary @- > nul 2>&1\n`
      : `#!/bin/bash\ncurl -s -X POST http://localhost:${hookPort}${ApiRoute.HookStop}${agentParam} \\\n  -H "Content-Type: application/json" \\\n  -H "X-CCPoke-Secret: ${hookSecret}" \\\n  --data-binary @- > /dev/null 2>&1 || true\n`;

    writeFileSync(paths.claudeCodeHookScript, script, { mode: isWindows ? 0o644 : 0o755 });
  }

  private static removeScript(): void {
    try {
      unlinkSync(paths.claudeCodeHookScript);
    } catch {
      // script file may not exist
    }
  }

  private static removeFromSettings(): void {
    const settings = ClaudeCodeInstaller.readSettings();
    if (!settings.hooks?.Stop) return;

    const filtered = settings.hooks.Stop.filter(
      (entry) =>
        !entry.hooks?.some((h) => typeof h.command === "string" && h.command.includes("ccpoke"))
    );

    if (filtered.length === 0) {
      delete settings.hooks.Stop;
    } else {
      settings.hooks.Stop = filtered;
    }

    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    writeFileSync(paths.claudeSettings, JSON.stringify(settings, null, 2));
  }

  private static readSettings(): ClaudeSettings {
    try {
      return JSON.parse(readFileSync(paths.claudeSettings, "utf-8"));
    } catch (err: unknown) {
      const isFileNotFound =
        err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT";
      if (isFileNotFound) return {};
      throw err;
    }
  }
}
