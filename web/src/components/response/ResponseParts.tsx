import { tClient } from "../../i18n";
import { formatDuration } from "../../lib/format";
import { GIT_STATUS_STYLES } from "../../lib/constants";
import type { GitChange } from "./types";

export function MetaBar({ project, durationMs }: { project: string; durationMs: number }) {
  if (!project && durationMs <= 0) return null;

  return (
    <div class="flex items-center gap-3 px-6 py-3 bg-bg-warm border-b border-border flex-wrap">
      {project && (
        <div class="flex items-center gap-1.5 text-[0.82rem] text-txt-2">
          <span class="text-[0.92rem]">📂</span>
          <span class="font-semibold text-accent font-mono text-[0.82rem]">{project}</span>
        </div>
      )}
      {durationMs > 0 && (
        <div class="flex items-center">
          <span class="px-3 py-0.5 bg-accent-light rounded-full text-accent font-semibold text-[0.75rem]">
            ⏱ {formatDuration(durationMs)}
          </span>
        </div>
      )}
    </div>
  );
}

export function GitChangesPanel({ changes }: { changes: GitChange[] }) {
  if (!changes.length) return null;

  return (
    <div class="mt-6 p-5 bg-bg-warm rounded-xl border border-border">
      <div class="text-[0.82rem] font-bold text-txt mb-2.5 flex items-center gap-1.5">
        {tClient("responseChanges")}
      </div>
      <div class="flex flex-col">
        {changes.map((change) => {
          const style = GIT_STATUS_STYLES[change.status] ?? GIT_STATUS_STYLES.modified;
          return (
            <div
              key={change.file}
              class="flex items-center gap-2 py-1.5 font-mono text-[0.78rem] text-txt-2 border-b border-border last:border-b-0"
            >
              <span class={`text-[0.72rem] px-2 py-0.5 rounded font-bold font-sans tracking-wide ${style.cls}`}>
                {style.label}
              </span>
              <span>{change.file}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center py-10">
      <div
        class="w-8 h-8 border-3 border-border border-t-accent rounded-full mb-4"
        style="animation: spin 0.8s linear infinite"
      />
      <div class="text-[0.88rem] text-txt-3">{tClient("responseLoading")}</div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center py-10">
      <div class="text-3xl mb-3">⚠️</div>
      <div class="text-[0.88rem] text-txt-3">{message}</div>
    </div>
  );
}

export function ResponseHeader({ timestamp }: { timestamp?: string }) {
  if (!timestamp) return null;
  return (
    <span class="ml-auto text-[0.78rem] font-medium text-txt-3">
      {new Date(timestamp).toLocaleString()}
    </span>
  );
}
