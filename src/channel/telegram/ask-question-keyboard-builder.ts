import type TelegramBot from "node-telegram-bot-api";

import type { AskUserQuestionItem } from "../../agent/agent-handler.js";
import { t } from "../../i18n/index.js";

export function buildSingleSelectKeyboard(
  pendingId: number,
  qIdx: number,
  q: AskUserQuestionItem
): TelegramBot.InlineKeyboardMarkup {
  const buttons: TelegramBot.InlineKeyboardButton[][] = q.options.map((opt, i) => [
    {
      text: opt.label,
      callback_data: `aq:${pendingId}:${qIdx}:${i}`,
    },
  ]);
  return { inline_keyboard: buttons };
}

export function buildMultiSelectKeyboard(
  pendingId: number,
  qIdx: number,
  q: AskUserQuestionItem,
  selected: Set<number>
): TelegramBot.InlineKeyboardMarkup {
  const buttons: TelegramBot.InlineKeyboardButton[][] = q.options.map((opt, i) => [
    {
      text: selected.has(i) ? `✓ ${opt.label}` : opt.label,
      callback_data: `am:${pendingId}:${qIdx}:${i}`,
    },
  ]);

  buttons.push([
    {
      text: t("askQuestion.confirmButton", { count: selected.size }),
      callback_data: `am:${pendingId}:${qIdx}:c`,
    },
  ]);

  return { inline_keyboard: buttons };
}
