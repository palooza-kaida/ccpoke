#!/usr/bin/env node

import { ConfigManager } from "./config-manager.js";
import { Bot } from "./telegram/bot.js";
import { HookServer } from "./hook/hook-server.js";
import { HookHandler } from "./hook/hook-handler.js";
import { runSetup } from "./commands/setup.js";
import { runUpdate } from "./commands/update.js";
import { runUninstall } from "./commands/uninstall.js";
import { runHelp } from "./commands/help.js";
import { formatError } from "./utils/error-utils.js";
import { CliCommand } from "./utils/constants.js";
import { t } from "./i18n/index.js";
import { TunnelManager } from "./utils/tunnel.js";
import { log, logError } from "./utils/log.js";

const args = process.argv.slice(2);

if (args.length > 0) {
  handleSubcommand(args);
} else {
  startBot();
}

async function startBot(): Promise<void> {
  const cfg = ConfigManager.load();
  const hookServer = new HookServer(cfg.hook_port, cfg.hook_secret);
  hookServer.start();
  log(`ccbot: ${t("bot.started", { port: cfg.hook_port })}`);

  const tunnelManager = new TunnelManager();
  let tunnelUrl: string | null = null;
  try {
    tunnelUrl = await tunnelManager.start(cfg.hook_port);
    log(t("tunnel.started", { url: tunnelUrl }));
  } catch (err: unknown) {
    log(t("tunnel.failed", { error: formatError(err) }));
  }

  const bot = new Bot(cfg, tunnelUrl);
  const handler = new HookHandler(
    (text, responseUrl) => bot.sendNotification(text, responseUrl),
    cfg.hook_port,
    tunnelManager,
  );
  hookServer.setHandler(handler);

  await bot.start();

  const shutdown = async () => {
    log(t("bot.shuttingDown"));
    tunnelManager.stop();
    await bot.stop();
    await hookServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function handleSubcommand(args: string[]): void {
  tryLoadLocale();

  switch (args[0]) {
    case CliCommand.Setup:
      runSetup().catch((err: unknown) => {
        logError(t("common.setupFailed", { error: formatError(err) }));
        process.exit(1);
      });
      break;

    case CliCommand.Update:
      runUpdate();
      break;

    case CliCommand.Uninstall:
      runUninstall();
      break;

    case CliCommand.Help:
    case CliCommand.HelpFlag:
    case CliCommand.HelpShort:
      runHelp();
      break;

    default:
      logError(t("common.unknownCommand", { command: args[0] }));
      runHelp();
      process.exit(1);
  }
}

function tryLoadLocale(): void {
  try {
    ConfigManager.load();
  } catch {}
}
