export const GIT_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  added:    { label: "A", cls: "bg-emerald-light text-emerald" },
  deleted:  { label: "D", cls: "bg-[#FDECEC] text-[#C53030]" },
  modified: { label: "M", cls: "bg-accent-light text-accent" },
  renamed:  { label: "R", cls: "bg-plum-light text-plum" },
};
