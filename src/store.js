export const uid = () => crypto.randomUUID();

export const DEFAULT_PROJECTS = [
  ["cat-dev", "Software Development"],
  ["cat-cp", "Competitive Programming"],
  ["cat-uni", "University"],
  ["cat-res", "Research"],
  ["cat-learn", "Learning"],
  ["cat-personal", "Personal"],
].map(([id, name]) => ({ id, name, builtin: true }));

const pad = (n) => String(n).padStart(2, "0");
export const dayOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => dayOf(new Date());
export const dayFromTs = (ts) => dayOf(new Date(ts));
export const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dayOf(d);
};

// Upgrades old task objects (v1: id/text/done/priority/due/createdAt) without losing anything.
export function migrateTask(t) {
  if (t.v === 2) return t;
  const created = t.createdAt || Date.now();
  const updated = t.updatedAt || created;
  return {
    ...t,
    v: 2,
    id: t.id || uid(),
    text: String(t.text ?? ""),
    done: !!t.done,
    priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
    due: t.due || null,
    createdAt: created,
    updatedAt: updated,
    notes: t.notes || "",
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    estimate: t.estimate ?? null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    projectId: t.projectId ?? null,
    completedAt: t.done ? t.completedAt || updated : null,
  };
}

export const PALETTE = ["#3b5bdb", "#d6336c", "#e8890c", "#2f9e6f", "#7048e8", "#1098ad"];
export const colorOf = (p) => p.color || PALETTE[[...p.id].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
