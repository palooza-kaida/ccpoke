import TelegramBot from "node-telegram-bot-api";
import { t } from "../i18n/index.js";
import { log } from "../utils/log.js";

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const PAGINATION_FOOTER_RESERVE = 30;

export async function sendMessage(
  bot: TelegramBot,
  chatId: number,
  text: string,
  responseUrl?: string,
): Promise<void> {
  const pages = splitMessage(text, TELEGRAM_MAX_MESSAGE_LENGTH - PAGINATION_FOOTER_RESERVE);

  for (let i = 0; i < pages.length; i++) {
    let content = pages[i];
    if (pages.length > 1) {
      content = `${content}\n\n<i>[${i + 1}/${pages.length}]</i>`;
    }

    const isLastPage = i === pages.length - 1;
    const opts: TelegramBot.SendMessageOptions = { parse_mode: "HTML" };

    if (isLastPage && responseUrl) {
      const buttonText = t("bot.viewDetails");
      opts.reply_markup = {
        inline_keyboard: [[
          responseUrl.startsWith("https://")
            ? { text: buttonText, web_app: { url: responseUrl } }
            : { text: buttonText, url: responseUrl },
        ]],
      };
    }

    try {
      await bot.sendMessage(chatId, content, opts);
    } catch (err) {
      log(`HTML send failed, falling back. Error: ${err instanceof Error ? err.message : err}`);
      const fallbackOpts: TelegramBot.SendMessageOptions = {};
      if (isLastPage && responseUrl) {
        const buttonText = t("bot.viewDetails");
        fallbackOpts.reply_markup = {
          inline_keyboard: [[
            responseUrl.startsWith("https://")
            ? { text: buttonText, web_app: { url: responseUrl } }
            : { text: buttonText, url: responseUrl },
          ]],
        };
      }
      try {
        await bot.sendMessage(chatId, pages[i], fallbackOpts);
      } catch (err2) {
        log(`fallback also failed. Error: ${err2 instanceof Error ? err2.message : err2}`);
        await bot.sendMessage(chatId, pages[i]);
      }
    }
  }
}

function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const pages: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      pages.push(remaining);
      break;
    }

    const splitAt = findSplitPoint(remaining, maxLen);
    pages.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  return pages;
}

function findSplitPoint(text: string, maxLen: number): number {
  for (let i = maxLen; i > maxLen - 200 && i > 0; i--) {
    if (text[i] === "\n" && text[i - 1] !== "\\") return i + 1;
  }

  for (let i = maxLen; i > maxLen - 200 && i > 0; i--) {
    if (text[i] === " " && text[i - 1] !== "\\") return i + 1;
  }

  return maxLen;
}

