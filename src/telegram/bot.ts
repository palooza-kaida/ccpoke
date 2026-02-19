import TelegramBot from "node-telegram-bot-api";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { type Config, ConfigManager } from "../config-manager.js";
import { sendMessage } from "./message-sender.js";
import { formatError } from "../utils/error-utils.js";
import { MINI_APP_BASE_URL } from "../utils/constants.js";
import { t, getTranslations } from "../i18n/index.js";
import { log } from "../utils/log.js";

interface BotState {
  chat_id: number | null;
}

export class Bot {
  private bot: TelegramBot;
  private cfg: Config;
  private chatId: number | null = null;
  private isDisconnected = false;
  private tunnelUrl: string | null;

  private static readonly STATE_DIR = join(homedir(), ".ccbot");
  private static readonly STATE_FILE = join(Bot.STATE_DIR, "state.json");

  constructor(cfg: Config, tunnelUrl?: string | null) {
    this.cfg = cfg;
    this.tunnelUrl = tunnelUrl ?? null;
    this.bot = new TelegramBot(cfg.telegram_bot_token, { polling: false });
    this.loadState();
    this.registerHandlers();
    this.registerPollingErrorHandler();
  }

  async start(): Promise<void> {
    this.bot.startPolling();
    await this.registerCommands();
    await this.registerMenuButton();
    log(t("bot.telegramStarted"));
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.bot.stopPolling();
      resolve();
    });
  }

  async sendNotification(text: string, responseUrl?: string): Promise<void> {
    if (!this.chatId) {
      log(t("bot.noChatId"));
      return;
    }

    try {
      await sendMessage(this.bot, this.chatId, text, responseUrl);
    } catch (err: unknown) {
      log(t("bot.notificationFailed", { error: formatError(err) }));
    }
  }

  private async registerCommands(): Promise<void> {
    const translations = getTranslations();
    const commands: TelegramBot.BotCommand[] = [
      { command: "start", description: translations.bot.commands.start },
    ];

    try {
      await this.bot.setMyCommands(commands);
      log(t("bot.commandsRegistered"));
    } catch (err: unknown) {
      log(t("bot.commandsRegisterFailed", { error: formatError(err) }));
    }
  }

  private async registerMenuButton(): Promise<void> {
    const url = this.tunnelUrl ? `${this.tunnelUrl}/` : `${MINI_APP_BASE_URL}/`;
    try {
      await this.bot.setChatMenuButton({
        menu_button: JSON.stringify({
          type: "web_app",
          text: t("bot.dashboard"),
          web_app: { url },
        }),
      } as any);
      log(t("bot.menuButtonRegistered"));
    } catch (err: unknown) {
      log(t("bot.menuButtonFailed", { error: formatError(err) }));
    }
  }

  private registerHandlers(): void {
    this.bot.on("message", (msg) => {
      if (!ConfigManager.isOwner(this.cfg, msg.from?.id ?? 0)) {
        log(t("bot.unauthorizedUser", {
          userId: msg.from?.id ?? 0,
          username: msg.from?.username ?? "",
        }));
        return;
      }

      const text = msg.text ?? "";

      if (text === "/start") {
        if (this.chatId === msg.chat.id) {
          this.bot.sendMessage(msg.chat.id, t("bot.alreadyConnected"));
          return;
        }
        this.chatId = msg.chat.id;
        this.saveState();
        log(t("bot.registeredChatId", { chatId: msg.chat.id }));
        this.bot.sendMessage(
          msg.chat.id,
          t("bot.ready"),
          { parse_mode: "MarkdownV2" },
        );
        return;
      }
    });
  }

  private loadState(): void {
    try {
      const data = readFileSync(Bot.STATE_FILE, "utf-8");
      const state: BotState = JSON.parse(data);
      this.chatId = state.chat_id ?? null;
    } catch {}
  }

  private saveState(): void {
    const state: BotState = { chat_id: this.chatId };
    mkdirSync(Bot.STATE_DIR, { recursive: true });
    writeFileSync(Bot.STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
  }

  private registerPollingErrorHandler(): void {
    this.bot.on("polling_error", (err) => {
      if (!this.isDisconnected) {
        this.isDisconnected = true;
        log(t("bot.connectionLost"));
      }
    });

    this.bot.on("polling", () => {
      if (this.isDisconnected) {
        this.isDisconnected = false;
        log(t("bot.connectionRestored"));
      }
    });
  }
}
