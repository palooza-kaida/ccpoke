import type TelegramBot from "node-telegram-bot-api";

import type { NotificationEvent } from "../../agent/agent-handler.js";
import { t } from "../../i18n/index.js";
import { SessionState, type SessionMap } from "../../tmux/session-map.js";
import type { TmuxBridge } from "../../tmux/tmux-bridge.js";

interface PendingPrompt {
  sessionId: string;
  createdAt: number;
}

const PROMPT_EXPIRE_MS = 10 * 60 * 1000;
const MAX_PENDING = 100;
const MAX_RESPONSE_LENGTH = 10_000;

export class PromptHandler {
  private pending = new Map<string, PendingPrompt>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private bot: TelegramBot,
    private chatId: () => number | null,
    private sessionMap: SessionMap,
    private tmuxBridge: TmuxBridge
  ) {}

  async forwardPrompt(event: NotificationEvent): Promise<void> {
    const chat = this.chatId();
    if (!chat) return;

    switch (event.notificationType) {
      case "elicitation_dialog":
        await this.sendElicitationPrompt(chat, event);
        break;
      case "idle_prompt":
        await this.sendIdleNotification(chat, event);
        break;
    }
  }

  injectElicitationResponse(sessionId: string, text: string): boolean {
    const session = this.sessionMap.getBySessionId(sessionId);
    if (!session) return false;

    if (!this.pending.has(sessionId)) return false;

    const trimmed = text.trim();
    if (trimmed.length === 0) return false;

    const safeText =
      trimmed.length > MAX_RESPONSE_LENGTH ? trimmed.slice(0, MAX_RESPONSE_LENGTH) : trimmed;

    try {
      this.tmuxBridge.sendKeys(session.tmuxTarget, safeText);
    } catch {
      return false;
    }

    this.sessionMap.updateState(sessionId, SessionState.Busy);
    this.sessionMap.touch(sessionId);
    this.clearPending(sessionId);
    return true;
  }

  destroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.pending.clear();
  }

  onElicitationSent?: (
    chatId: number,
    messageId: number,
    sessionId: string,
    project: string
  ) => void;

  // --- Private ---

  private async sendElicitationPrompt(chatId: number, event: NotificationEvent): Promise<void> {
    const title = event.title
      ? `\u2753 *${escapeMarkdownV2(event.title)}*`
      : `\u2753 *${escapeMarkdownV2(t("prompt.elicitationTitle"))}*`;

    const body = escapeMarkdownV2(event.message);
    const project = this.resolveProjectName(event.sessionId);
    const projectLine = project ? `\n_${escapeMarkdownV2(project)}_` : "";

    const text = `${title}${projectLine}\n\n${body}\n\n${escapeMarkdownV2(t("prompt.elicitationReplyHint"))}`;

    const sent = await this.bot
      .sendMessage(chatId, text, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          force_reply: true,
          input_field_placeholder: t("chat.placeholder"),
        },
      })
      .catch(() => null);

    if (sent) {
      this.setPending(event.sessionId);
      this.onElicitationSent?.(chatId, sent.message_id, event.sessionId, project ?? "");
    }
  }

  private async sendIdleNotification(chatId: number, event: NotificationEvent): Promise<void> {
    const project = this.resolveProjectName(event.sessionId);
    const title = `\u{1F4AD} *${escapeMarkdownV2(t("prompt.idleTitle"))}*`;
    const body = project
      ? escapeMarkdownV2(t("prompt.idleBody", { project }))
      : escapeMarkdownV2(event.message);

    const text = `${title}\n\n${body}`;

    const buttons: TelegramBot.InlineKeyboardButton[][] = [];
    if (event.sessionId) {
      buttons.push([
        { text: `\u{1F4AC} ${t("sessions.chatButton")}`, callback_data: `chat:${event.sessionId}` },
      ]);
    }

    await this.bot
      .sendMessage(chatId, text, {
        parse_mode: "MarkdownV2",
        reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
      })
      .catch(() => {});
  }

  private resolveProjectName(sessionId: string): string | undefined {
    return this.sessionMap.getBySessionId(sessionId)?.project;
  }

  private setPending(sessionId: string): void {
    if (this.pending.size >= MAX_PENDING && !this.pending.has(sessionId)) {
      const oldest = [...this.pending.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
      if (oldest) this.clearPending(oldest[0]);
    }

    this.clearPending(sessionId);
    this.pending.set(sessionId, { sessionId, createdAt: Date.now() });

    const timer = setTimeout(() => {
      this.pending.delete(sessionId);
      this.timers.delete(sessionId);
    }, PROMPT_EXPIRE_MS);
    this.timers.set(sessionId, timer);
  }

  private clearPending(sessionId: string): void {
    this.pending.delete(sessionId);
    const timer = this.timers.get(sessionId);
    if (timer) clearTimeout(timer);
    this.timers.delete(sessionId);
  }
}

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (m) => `\\${m}`);
}
