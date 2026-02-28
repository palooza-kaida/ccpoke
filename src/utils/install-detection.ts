import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { InstallMethod } from "./constants.js";

const MAX_GIT_SEARCH_DEPTH = 5;
export type { InstallMethod } from "./constants.js";

export function detectInstallMethod(): InstallMethod {
  const scriptPath = process.argv[1] ?? "";

  if (scriptPath.includes("npx") || scriptPath.includes(".npm/_npx")) {
    return InstallMethod.Npx;
  }

  const scriptDir = dirname(scriptPath);
  if (isGitRepo(scriptDir)) {
    return InstallMethod.GitClone;
  }

  return InstallMethod.Global;
}

export function detectCliPrefix(): string {
  const method = detectInstallMethod();
  switch (method) {
    case InstallMethod.Npx:
      return "npx -y ccpoke";
    case InstallMethod.GitClone:
      return "node dist/index.js";
    default:
      return "ccpoke";
  }
}

export function getGitRepoRoot(dir: string): string | null {
  let current = dir;
  for (let i = 0; i < MAX_GIT_SEARCH_DEPTH; i++) {
    if (existsSync(join(current, ".git"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function isGitRepo(dir: string): boolean {
  return getGitRepoRoot(dir) !== null;
}
