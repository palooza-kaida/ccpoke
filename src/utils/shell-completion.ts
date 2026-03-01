import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import * as p from "@clack/prompts";

import { t } from "../i18n/index.js";
import { paths } from "./paths.js";

const ZSH_SCRIPT = `#compdef ccpoke

_ccpoke() {
  local -a commands
  commands=(
    'setup:Run the setup wizard'
    'project:Manage registered projects'
    'update:Update ccpoke to latest version'
    'uninstall:Remove ccpoke hooks and config'
    'help:Show help information'
  )
  _describe 'command' commands
}

_ccpoke "$@"
`;

const BASH_SCRIPT = `_ccpoke_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  COMPREPLY=( $(compgen -W "setup project update uninstall help" -- "$cur") )
}

complete -F _ccpoke_completions ccpoke
`;

function writeCompletionScripts(): void {
  mkdirSync(paths.completionsDir, { recursive: true });
  writeFileSync(paths.zshCompletion, ZSH_SCRIPT);
  writeFileSync(paths.bashCompletion, BASH_SCRIPT);
}

export function installShellCompletion(): void {
  if (process.platform === "win32") return;
  writeCompletionScripts();
  p.log.step(t("setup.shellCompletionHint", { dir: paths.completionsDir }));
}

export function ensureShellCompletion(): void {
  if (process.platform === "win32") return;
  if (existsSync(paths.zshCompletion) && existsSync(paths.bashCompletion)) return;
  writeCompletionScripts();
}
