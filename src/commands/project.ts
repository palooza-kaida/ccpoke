import { existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";

import * as p from "@clack/prompts";

import { ConfigManager } from "../config-manager.js";
import { t } from "../i18n/index.js";

const ADD_NEW = "__add_new__" as const;

export async function runProject(): Promise<void> {
  p.intro(t("projectCmd.intro"));

  const cfg = ConfigManager.load();

  if (cfg.projects.length === 0) {
    p.log.message(t("projectCmd.emptyHint"));
    await addProjectFlow(cfg);
    return;
  }

  const options: { value: string; label: string }[] = [
    { value: ADD_NEW, label: t("projectCmd.addNew") },
    ...cfg.projects.map((proj, i) => ({
      value: proj.name,
      label: `${i + 1}. ${proj.name} → ${proj.path}`,
    })),
  ];

  const choice = await p.select({ message: t("projectCmd.selectAction"), options });

  if (p.isCancel(choice)) {
    p.cancel(t("projectCmd.cancelled"));
    return;
  }

  if (choice === ADD_NEW) {
    await addProjectFlow(cfg);
    return;
  }

  const project = cfg.projects.find((proj) => proj.name === choice)!;
  await projectActionFlow(cfg, project);
}

async function addProjectFlow(cfg: ReturnType<typeof ConfigManager.load>): Promise<void> {
  const rawPath = await p.text({
    message: t("projectCmd.pathMessage"),
    initialValue: process.cwd(),
    validate(value) {
      if (!value || !value.trim()) return t("projectCmd.pathRequired");
      const full = resolve(value);
      if (!existsSync(full) || !statSync(full).isDirectory()) return t("projectCmd.pathInvalid");
    },
  });

  if (p.isCancel(rawPath)) {
    p.cancel(t("projectCmd.cancelled"));
    return;
  }

  const fullPath = resolve(rawPath as string);

  const name = await p.text({
    message: t("projectCmd.nameMessage"),
    initialValue: basename(fullPath),
    validate(value) {
      if (!value || !value.trim()) return t("projectCmd.nameRequired");
      if (cfg.projects.some((proj) => proj.name === value.trim()))
        return t("projectCmd.nameDuplicate");
    },
  });

  if (p.isCancel(name)) {
    p.cancel(t("projectCmd.cancelled"));
    return;
  }

  const trimmedName = (name as string).trim();
  cfg.projects.push({ name: trimmedName, path: fullPath });
  ConfigManager.save(cfg);
  p.outro(t("projectCmd.added", { name: trimmedName, path: fullPath }));
}

async function projectActionFlow(
  cfg: ReturnType<typeof ConfigManager.load>,
  project: { name: string; path: string }
): Promise<void> {
  const action = await p.select({
    message: t("projectCmd.projectAction", { name: project.name }),
    options: [
      { value: "edit", label: t("projectCmd.edit") },
      { value: "remove", label: t("projectCmd.remove") },
    ],
  });

  if (p.isCancel(action)) {
    p.cancel(t("projectCmd.cancelled"));
    return;
  }

  if (action === "edit") {
    await editProjectFlow(cfg, project);
  } else {
    await removeProjectFlow(cfg, project);
  }
}

async function editProjectFlow(
  cfg: ReturnType<typeof ConfigManager.load>,
  project: { name: string; path: string }
): Promise<void> {
  const rawPath = await p.text({
    message: t("projectCmd.pathMessage"),
    initialValue: project.path,
    validate(value) {
      if (!value || !value.trim()) return t("projectCmd.pathRequired");
      const full = resolve(value);
      if (!existsSync(full) || !statSync(full).isDirectory()) return t("projectCmd.pathInvalid");
    },
  });

  if (p.isCancel(rawPath)) {
    p.cancel(t("projectCmd.cancelled"));
    return;
  }

  const fullPath = resolve(rawPath as string);

  const name = await p.text({
    message: t("projectCmd.nameMessage"),
    initialValue: project.name,
    validate(value) {
      if (!value || !value.trim()) return t("projectCmd.nameRequired");
      const trimmed = value.trim();
      if (trimmed !== project.name && cfg.projects.some((proj) => proj.name === trimmed))
        return t("projectCmd.nameDuplicate");
    },
  });

  if (p.isCancel(name)) {
    p.cancel(t("projectCmd.cancelled"));
    return;
  }

  const trimmedName = (name as string).trim();
  const idx = cfg.projects.findIndex((proj) => proj.name === project.name);
  cfg.projects[idx] = { name: trimmedName, path: fullPath };
  ConfigManager.save(cfg);
  p.outro(t("projectCmd.updated", { name: trimmedName, path: fullPath }));
}

async function removeProjectFlow(
  cfg: ReturnType<typeof ConfigManager.load>,
  project: { name: string; path: string }
): Promise<void> {
  const confirmed = await p.confirm({
    message: t("projectCmd.confirmRemove", { name: project.name }),
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel(t("projectCmd.cancelled"));
    return;
  }

  const idx = cfg.projects.findIndex((proj) => proj.name === project.name);
  cfg.projects.splice(idx, 1);
  ConfigManager.save(cfg);
  p.outro(t("projectCmd.removed", { name: project.name }));
}
