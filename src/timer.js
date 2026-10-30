import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { uid } from "./store.js";

export const PRESETS = { "25/5": [25, 5], "50/10": [50, 10] };
export const DEFAULT_FOCUS = { preset: "25/5", autoStart: false, notify: false, sound: true, longEnabled: true, longMin: 15 };
const IDLE = { phase: "focus", status: "idle", cycle: 0, taskId: null, taskTitle: "", projectId: null };

export const phaseMs = (phase, s) => {
  const [f, b] = PRESETS[s.preset] || PRESETS["25/5"];
  return 60000 * (phase === "focus" ? f : phase === "long" ? s.longMin || 15 : b);
};
export const mmss = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); g.gain.value = 0.08; o.frequency.value = 880;
    o.start(); o.stop(ctx.currentTime + 0.35); o.onended = () => ctx.close();
  } catch { /* sound is optional */ }
}

// Validates stored timer state; anything malformed falls back to idle.
function sanitize(t) {
  if (!t || typeof t !== "object" || !["focus", "short", "long"].includes(t.phase) || !["idle", "ready", "running", "paused"].includes(t.status)) return IDLE;
  const num = (v) => Number.isFinite(v);
  if (t.status === "running" && !(num(t.endAt) && num(t.plannedMs) && num(t.startedAt) && t.sessionId)) return IDLE;
  if (t.status === "paused" && !(num(t.remainingMs) && num(t.plannedMs) && num(t.startedAt) && t.sessionId)) return IDLE;
  return { ...IDLE, ...t, cycle: Number.isInteger(t.cycle) ? t.cycle : 0 };
}

export function useTimer({ settings, addSession, notify }) {
  const [raw, setRaw] = useLocalStorage("taskdesk.timer", IDLE);
  const t = sanitize(raw);
  const ref = useRef(t);
  ref.current = t;
  const [, tick] = useState(0);
  const set = (next) => { ref.current = next; setRaw(next); };
  const active = t.status === "running" || t.status === "paused";
  const remaining = t.status === "running" ? Math.max(0, t.endAt - Date.now()) : t.status === "paused" ? t.remainingMs : phaseMs(t.phase, settings);

  const begin = (c, phase) => {
    const ms = phaseMs(phase, settings), n = Date.now();
    return { ...c, phase, status: "running", sessionId: uid(), plannedMs: ms, startedAt: n, endAt: n + ms, remainingMs: undefined };
  };

  const finish = (kind) => {
    const c = ref.current;
    if (c.status !== "running" && c.status !== "paused") return;
    const now = Date.now();
    const rem = c.status === "running" ? Math.max(0, c.endAt - now) : c.remainingMs;
    const done = kind === "completed";
    ref.current = { ...c, status: "idle" }; // synchronous lock: a second call cannot record again
    if (c.phase === "focus" || kind !== "interrupted") {
      addSession({
        id: c.sessionId, taskId: c.taskId, taskTitle: c.taskTitle, projectId: c.projectId, preset: settings.preset,
        type: c.phase, plannedMs: c.plannedMs, actualMs: done ? c.plannedMs : Math.max(0, c.plannedMs - rem),
        startedAt: c.startedAt, completedAt: done ? c.endAt : now, status: kind,
      });
    }
    let cycle = c.cycle, next = c.phase;
    if (kind !== "interrupted") {
      if (c.phase === "focus") {
        if (done) cycle += 1;
        next = settings.longEnabled && cycle >= 4 ? "long" : "short";
        if (next === "long") cycle = 0;
      } else next = "focus";
    }
    const base = { phase: next, status: kind === "interrupted" ? "idle" : "ready", cycle, taskId: c.taskId, taskTitle: c.taskTitle, projectId: c.projectId };
    set(done && settings.autoStart ? begin(base, next) : base);
    if (done) notify(c.phase === "focus" ? "Focus session complete. Time for a break." : "Break over. Ready for the next focus session.");
    if (kind === "skipped") notify("Session skipped.");
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (t.status !== "running") return;
    const id = setInterval(() => {
      if (Date.now() >= ref.current.endAt) finishRef.current("completed");
      else tick((n) => n + 1);
    }, 250);
    return () => clearInterval(id);
  }, [t.status, t.sessionId]);

  return {
    t, remaining, active,
    start: () => { if (!active) set(begin(ref.current, ref.current.phase)); },
    pause: () => { const c = ref.current; if (c.status === "running") set({ ...c, status: "paused", remainingMs: Math.max(0, c.endAt - Date.now()), endAt: undefined }); },
    resume: () => { const c = ref.current; if (c.status === "paused") set({ ...c, status: "running", endAt: Date.now() + c.remainingMs, remainingMs: undefined }); },
    reset: () => { if (ref.current.status === "paused" || ref.current.status === "running") finish("interrupted"); else set({ ...ref.current, status: "idle" }); },
    skip: () => {
      const c = ref.current;
      if (c.status === "running" || c.status === "paused") finish("skipped");
      else set({ ...c, phase: c.phase === "focus" ? "short" : "focus", status: "idle" });
    },
    setTask: (task) => { const c = ref.current; if (!(c.status === "running" || c.status === "paused")) set({ ...c, taskId: task?.id || null, taskTitle: task?.text || "", projectId: task?.projectId || null }); },
  };
}
