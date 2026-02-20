import type { ResponseData, ResponseParams, ViewState } from "./types";

export function parseQueryParams(): ResponseParams | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const api = params.get("api");

  if (!id || !api) return null;

  return {
    id,
    api,
    project: params.get("p") ?? "",
    duration: parseInt(params.get("d") ?? "0", 10),
  };
}

export async function fetchResponse(params: ResponseParams): Promise<ViewState> {
  const response = await fetch(`${params.api}/api/responses/${params.id}`);
  if (!response.ok) return { kind: "error", message: "expired" };

  const data: ResponseData = await response.json();
  return { kind: "success", data };
}
