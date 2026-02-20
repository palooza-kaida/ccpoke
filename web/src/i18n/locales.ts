import type { Locale } from "./config";
import { en } from "./locales/en";
import { vi } from "./locales/vi";
import { zh } from "./locales/zh";

export const translations: Record<Locale, Record<string, string | string[]>> = {
  en,
  vi,
  zh,
};
