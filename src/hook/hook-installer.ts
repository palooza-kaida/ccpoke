import { readFileSync, writeFileSync, mkdirSync, unlinkSync, rmSync } from "node:fs";
import { t } from "../i18n/index.js";
import { paths } from "../utils/paths.js";
import { ApiRoute } from "../utils/constants.js";

export class HookInstaller {
  static isInstalled(): boolean {
    try {
      const settings = HookInstaller.readSettings();
      const hooks = (settings.hooks ?? {}) as Record<string, unknown>;
      const existingStop = (hooks.Stop ?? []) as Array<Record<string, unknown>>;

      return existingStop.some((entry) => {
        const entryHooks = entry.hooks as Array<Record<string, unknown>> | undefined;
        return entryHooks?.some(
          (h) => typeof h.command === "string" && h.command.includes("ccpoke")
        );
      });
    } catch {
      return false;
    }
  }

  static install(hookPort: number, hookSecret: string): void {
    if (!Number.isInteger(hookPort) || hookPort < 1 || hookPort > 65535) {
      throw new Error(t("config.invalidHookPort", { port: hookPort }));
    }

    const settings = HookInstaller.readSettings();

    const hooks: Record<string, unknown> = (settings.hooks ?? {}) as Record<string, unknown>;
    const existingStop = (hooks.Stop ?? []) as Array<Record<string, unknown>>;

    if (HookInstaller.isInstalled()) {
      throw new Error(t("config.hookAlreadyInstalled"));
    }

    existingStop.push({
      hooks: [{ type: "command", command: paths.hookScript, timeout: 10 }],
    });

    hooks.Stop = existingStop;
    settings.hooks = hooks;

    mkdirSync(paths.claudeDir, { recursive: true });
    writeFileSync(paths.claudeSettings, JSON.stringify(settings, null, 2));

    HookInstaller.installScript(hookPort, hookSecret);
  }

  static uninstall(): void {
    HookInstaller.removeFromSettings();
    HookInstaller.removeScript();
  }

  private static installScript(hookPort: number, hookSecret: string): void {
    mkdirSync(paths.hooksDir, { recursive: true });

    const isWindows = process.platform === "win32";
    const script = isWindows
      ? `@echo off\ncurl -s -X POST http://localhost:${hookPort}${ApiRoute.HookStop} -H "Content-Type: application/json" -H "X-CCPoke-Secret: ${hookSecret}" --data-binary @- > nul 2>&1\n`
      : `#!/bin/bash\ncurl -s -X POST http://localhost:${hookPort}${ApiRoute.HookStop} \\\n  -H "Content-Type: application/json" \\\n  -H "X-CCPoke-Secret: ${hookSecret}" \\\n  --data-binary @- > /dev/null 2>&1 || true\n`;

    writeFileSync(paths.hookScript, script, { mode: isWindows ? 0o644 : 0o755 });
  }

  private static removeScript(): void {
    try {
      unlinkSync(paths.hookScript);
    } catch {
      // script file may not exist
    }

    try {
      rmSync(paths.hooksDir, { recursive: true, force: true });
    } catch {
      // hooks directory may not exist
    }
  }

  private static removeFromSettings(): void {
    let data: string;
    try {
      data = readFileSync(paths.claudeSettings, "utf-8");
    } catch {
      return;
    }

    const settings: Record<string, unknown> = JSON.parse(data);
    const hooks = settings.hooks as Record<string, unknown> | undefined;
    if (!hooks) return;

    const existingStop = hooks.Stop as Array<Record<string, unknown>> | undefined;
    if (!existingStop) return;

    const filtered = existingStop.filter((entry) => {
      const entryHooks = entry.hooks as Array<Record<string, unknown>> | undefined;
      return !entryHooks?.some(
        (h) => typeof h.command === "string" && h.command.includes("ccpoke")
      );
    });

    if (filtered.length === 0) {
      delete hooks.Stop;
    } else {
      hooks.Stop = filtered;
    }

    if (Object.keys(hooks).length === 0) {
      delete settings.hooks;
    }

    writeFileSync(paths.claudeSettings, JSON.stringify(settings, null, 2));
  }

  private static readSettings(): Record<string, unknown> {
    try {
      const data = readFileSync(paths.claudeSettings, "utf-8");
      return JSON.parse(data);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return {};
      }
      throw err;
    }
  }
}
