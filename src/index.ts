#!/usr/bin/env node

import { ConfigManager, type Config } from "./config-manager.js";
import { TelegramChannel } from "./channel/telegram/telegram-channel.js";
import { ApiServer } from "./server/api-server.js";
import { AgentHandler } from "./agent/agent-handler.js";
import { createDefaultRegistry } from "./agent/agent-registry.js";
import { runSetup } from "./commands/setup.js";
import { runUpdate } from "./commands/update.js";
import { runUninstall } from "./commands/uninstall.js";
import { runHelp } from "./commands/help.js";
import { CliCommand, InstallMethod } from "./utils/constants.js";
import { t } from "./i18n/index.js";
import { TunnelManager } from "./utils/tunnel.js";
import { log, logError } from "./utils/log.js";
import { detectInstallMethod } from "./utils/install-detection.js";
import { checkForUpdates } from "./utils/version-check.js";

const args = process.argv.slice(2);

if (args.length > 0) {
  handleSubcommand(args);
} else {
  startBot();
}

async function loadOrSetupConfig(): Promise<Config> {
  try {
    const config = ConfigManager.load();
    ensureAgentHooks(config);
    return config;
  } catch {
    log(t("bot.firstTimeSetup"));
    try {
      return await runSetup();
    } catch (err: unknown) {
      logError(t("common.setupFailed"), err);
      process.exit(1);
    }
  }
}

function ensureAgentHooks(config: Config): void {
  const registry = createDefaultRegistry();

  for (const agentName of config.agents) {
    const provider = registry.resolve(agentName);
    if (!provider) continue;
    if (provider.isHookInstalled()) continue;

    if (!provider.detect()) {
      logError(t("setup.agentNotInstalled", { agent: provider.displayName }));
      continue;
    }

    provider.installHook(config.hook_port, config.hook_secret);
    log(t("setup.agentHookInstalled", { agent: provider.displayName }));
  }
}

async function startBot(): Promise<void> {
  await checkForUpdates().catch(() => {});

  const cfg = await loadOrSetupConfig();

  const apiServer = new ApiServer(cfg.hook_port, cfg.hook_secret);
  apiServer.start();
  log(`ccpoke: ${t("bot.started", { port: cfg.hook_port })}`);

  const tunnelManager = new TunnelManager();
  try {
    const tunnelUrl = await tunnelManager.start(cfg.hook_port);
    log(t("tunnel.started", { url: tunnelUrl }));
  } catch (err: unknown) {
    logError(t("tunnel.failed"), err);
  }

  const registry = createDefaultRegistry();
  const channel = new TelegramChannel(cfg);
  const handler = new AgentHandler(registry, channel, cfg.hook_port, tunnelManager);
  apiServer.setHandler(handler);

  await channel.initialize();

  if (detectInstallMethod() === InstallMethod.Npx) {
    log(t("bot.globalInstallTip"));
  }

  const shutdown = async () => {
    log(t("bot.shuttingDown"));
    tunnelManager.stop();
    await channel.shutdown();
    await apiServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function handleSubcommand(args: string[]): void {
  try {
    ConfigManager.load();
  } catch {
    // config not yet created, subcommands handle this
  }

  switch (args[0]) {
    case CliCommand.Setup:
      runSetup().catch((err: unknown) => {
        logError(t("common.setupFailed"), err);
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
      logError(t("common.unknownCommand", { command: args[0]! }));
      runHelp();
      process.exit(1);
  }
}
