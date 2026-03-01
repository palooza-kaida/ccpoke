import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface, type Interface } from "node:readline";

import { expandHome } from "./paths.js";

const CANCEL = Symbol.for("cancel");

function completer(line: string): [string[], string] {
  const expanded = expandHome(line);
  const abs = resolve(expanded);

  let dir: string;
  let partial: string;

  try {
    if (statSync(abs).isDirectory() && line.endsWith("/")) {
      dir = abs;
      partial = "";
    } else {
      dir = dirname(abs);
      partial = abs.slice(dir.length + 1);
    }
  } catch {
    dir = dirname(abs);
    partial = abs.slice(dir.length + 1);
  }

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [[], line];
  }

  const matches = entries.filter((e) => e.startsWith(partial));

  const completions = matches.map((m) => {
    const full = join(dir, m);
    try {
      const suffix = statSync(full).isDirectory() ? "/" : "";
      return line.slice(0, line.length - partial.length) + m + suffix;
    } catch {
      return line.slice(0, line.length - partial.length) + m;
    }
  });

  return [completions, line];
}

export function promptPath(message: string, initialValue?: string): Promise<string | symbol> {
  return new Promise((res) => {
    process.stdout.write(`  ${message}\n`);

    let answered = false;

    const rl: Interface = createInterface({
      input: process.stdin,
      output: process.stdout,
      completer,
      terminal: true,
    });

    if (initialValue) {
      rl.write(initialValue);
    }

    rl.on("line", (answer) => {
      answered = true;
      rl.close();
      res(answer.trim());
    });

    rl.on("close", () => {
      if (!answered) res(CANCEL);
    });

    rl.prompt();
  });
}
