import type { ResponseData, ResponseParams, ViewState } from "./types";
import { getStorage, setStorage } from "../../utils/storage";

function isValidApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseQueryParams(): ResponseParams | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const api = params.get("api");

  if (!id || !api || !isValidApiUrl(api)) return null;

  return {
    id,
    api,
    project: params.get("p") ?? "",
    duration: parseInt(params.get("d") ?? "0", 10),
  };
}

async function tryFetch(apiBase: string, id: string): Promise<ResponseData | null> {
  try {
    const response = await fetch(`${apiBase}/api/responses/${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchResponse(params: ResponseParams): Promise<ViewState> {
  const data = await tryFetch(params.api, params.id);
  if (data) {
    setStorage("tunnelUrl", params.api);
    return { kind: "success", data };
  }

  const savedUrl = getStorage("tunnelUrl");
  if (savedUrl && savedUrl !== params.api && isValidApiUrl(savedUrl)) {
    const fallbackData = await tryFetch(savedUrl, params.id);
    if (fallbackData) return { kind: "success", data: fallbackData };
  }

  return { kind: "error", message: "expired" };
}
