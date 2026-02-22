import { execSync } from "node:child_process";
import type { GitChange } from "../channel/types.js";
import { GitChangeStatus, GIT_TIMEOUT_MS } from "../utils/constants.js";

export function collectGitChanges(cwd: string): GitChange[] {
  try {
    const diffOutput = execSync("git diff --name-status HEAD", {
      cwd,
      encoding: "utf-8",
      timeout: GIT_TIMEOUT_MS,
    });
    const changes = parseGitDiffOutput(diffOutput);

    try {
      const untrackedOutput = execSync("git ls-files --others --exclude-standard", {
        cwd,
        encoding: "utf-8",
        timeout: GIT_TIMEOUT_MS,
      });
      for (const file of untrackedOutput.trim().split("\n")) {
        if (file) changes.push({ file, status: GitChangeStatus.Added });
      }
    } catch {
      // untracked files collection is optional
    }

    return changes;
  } catch {
    try {
      const porcelainOutput = execSync("git status --porcelain", {
        cwd,
        encoding: "utf-8",
        timeout: GIT_TIMEOUT_MS,
      });
      return parsePorcelainOutput(porcelainOutput);
    } catch {
      return [];
    }
  }
}

function parseGitDiffOutput(output: string): GitChange[] {
  const changes: GitChange[] = [];

  for (const line of output.trim().split("\n")) {
    if (!line) continue;

    const parts = line.split("\t");
    if (parts.length < 2) continue;

    const statusCode = parts[0];
    const filePath = parts[1];
    if (!statusCode || !filePath) continue;

    let status: GitChange["status"] = GitChangeStatus.Modified;
    if (statusCode.startsWith("A")) status = GitChangeStatus.Added;
    else if (statusCode.startsWith("D")) status = GitChangeStatus.Deleted;
    else if (statusCode.startsWith("R")) status = GitChangeStatus.Renamed;

    changes.push({ file: filePath, status });
  }

  return changes;
}

function parsePorcelainOutput(output: string): GitChange[] {
  const changes: GitChange[] = [];

  for (const line of output.trim().split("\n")) {
    if (line.length < 4) continue;

    const statusCode = line.slice(0, 2).trim();
    const file = line.slice(3).trim();

    let status: GitChange["status"] = GitChangeStatus.Modified;
    switch (statusCode) {
      case "??":
      case "A":
        status = GitChangeStatus.Added;
        break;
      case "D":
        status = GitChangeStatus.Deleted;
        break;
      case "R":
        status = GitChangeStatus.Renamed;
        break;
    }

    changes.push({ file, status });
  }

  return changes;
}
