import type TelegramBot from "node-telegram-bot-api";

import { t } from "../../i18n/index.js";
import { SessionState, type TmuxSession } from "../../tmux/session-map.js";

const STATE_EMOJI: Record<string, string> = {
  [SessionState.Idle]: "\u{1F7E2}",
  [SessionState.Busy]: "\u{1F7E1}",
  [SessionState.Blocked]: "\u{1F534}",
  [SessionState.Unknown]: "\u26AA",
};

const MAX_KEYBOARD_ROWS = 50;

export function formatSessionList(sessions: TmuxSession[]): {
  text: string;
  replyMarkup: TelegramBot.InlineKeyboardMarkup | undefined;
} {
  if (sessions.length === 0) {
    return { text: t("sessions.empty"), replyMarkup: undefined };
  }

  const sorted = [...sessions].sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

  const rows: TelegramBot.InlineKeyboardButton[][] = [];

  for (const session of sorted.slice(0, MAX_KEYBOARD_ROWS)) {
    const emoji = STATE_EMOJI[session.state] ?? "\u26AA";
    const label = `${emoji} ${session.project}`;
    const stateLabel = stateText(session.state);

    rows.push([
      { text: `${label} (${stateLabel})`, callback_data: `noop:${session.sessionId}` },
      { text: t("sessions.chatButton"), callback_data: `chat:${session.sessionId}` },
    ]);
  }

  return {
    text: `*${escapeMarkdownV2(t("sessions.title"))}*`,
    replyMarkup: { inline_keyboard: rows },
  };
}

function stateText(state: SessionState): string {
  switch (state) {
    case SessionState.Idle:
      return t("sessions.stateIdle");
    case SessionState.Busy:
      return t("sessions.stateBusy");
    case SessionState.Blocked:
      return t("sessions.stateBlocked");
    default:
      return "?";
  }
}

function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (m) => `\\${m}`);
}
