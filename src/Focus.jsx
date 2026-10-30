import { useState } from "react";
import { PRESETS, mmss, phaseMs } from "./timer.js";
import { addDays, dayFromTs, todayISO } from "./store.js";

const LABEL = { focus: "Focus", short: "Short break", long: "Long break" };
const mins = (ms) => Math.round(ms / 60000);

export default function Focus({ timer, settings, setSettings, todos, projects, sessions, onSelect }) {
  const { t, remaining, active } = timer;
  const [fDate, setFDate] = useState("");
  const [fProj, setFProj] = useState("");
  const [msg, setMsg] = useState("");
  const planned = active ? t.plannedMs : phaseMs(t.phase, settings);
  const pct = planned ? 1 - remaining / planned : 0;
  const R = 96, C = 2 * Math.PI * R;
  const openTodos = todos.filter((x) => !x.done);

  const done = sessions.filter((s) => s.type === "focus" && s.status === "completed");
  const today = todayISO();
  const weekStart = addDays(today, -((new Date().getDay() + 6) % 7));
  const td = done.filter((s) => dayFromTs(s.completedAt) === today);
  const wk = done.filter((s) => dayFromTs(s.completedAt) >= weekStart);
  const sum = (l) => l.reduce((a, s) => a + s.actualMs, 0);
  const pname = (id) => projects.find((p) => p.id === id)?.name || "Deleted project";
  const titles = new Map(sessions.map((s) => [s.taskId, s.taskTitle]));
  const group = (key, label) => {
    const m = new Map();
    done.forEach((s) => m.set(key(s), (m.get(key(s)) || 0) + s.actualMs));
    return [...m].map(([k, ms]) => [label(k), ms]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  };
  const byProject = group((s) => s.projectId || "", (k) => (k ? pname(k) : "No project"));
  const byTodo = group((s) => s.taskId || "", (k) => (k ? todos.find((x) => x.id === k)?.text || titles.get(k) || "Deleted task" : "No task"));
  const hist = sessions
    .filter((s) => (!fDate || dayFromTs(s.completedAt) === fDate) && (!fProj || (fProj === "none" ? !s.projectId : s.projectId === fProj)))
    .sort((a, b) => b.completedAt - a.completedAt).slice(0, 50);

  const toggleNotify = async (on) => {
    setMsg("");
    if (on) {
      if (!("Notification" in window)) return setMsg("This browser doesn't support desktop notifications.");
      let p = Notification.permission;
      if (p === "default") p = await Notification.requestPermission();
      if (p !== "granted") return setMsg("Permission wasn't granted, so in-app alerts will be used.");
    }
    setSettings({ ...settings, notify: on });
  };
  const up = (patch) => setSettings({ ...settings, ...patch });

  return (
    <div className="focus">
      <div className="seg" role="radiogroup" aria-label="Pomodoro preset">
        {Object.keys(PRESETS).map((k) => (
          <button key={k} role="radio" aria-checked={settings.preset === k} disabled={active} className={`seg-btn ${settings.preset === k ? "on" : ""}`} onClick={() => up({ preset: k })}>
            {k === "25/5" ? "Standard 25/5" : "Extended 50/10"}
          </button>
        ))}
      </div>

      <div className={`ring ${t.phase === "focus" ? "" : "is-break"}`}>
        <svg viewBox="0 0 220 220" role="img" aria-label={`${LABEL[t.phase]}, ${mmss(remaining)} remaining`}>
          <circle cx="110" cy="110" r={R} className="ring-bg" />
          <circle cx="110" cy="110" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, Math.max(0, pct)))} transform="rotate(-90 110 110)" />
        </svg>
        <div className="ring-text">
          <span className="phase">{LABEL[t.phase]}{t.status === "paused" ? " · paused" : ""}</span>
          <span className="clock">{mmss(remaining)}</span>
        </div>
      </div>

      <label className="task-pick">Task
        <select disabled={active} value={t.taskId || ""} onChange={(e) => onSelect(e.target.value)}>
          <option value="">No task</option>
          {t.taskId && !openTodos.some((x) => x.id === t.taskId) && <option value={t.taskId}>{t.taskTitle || "Deleted task"}</option>}
          {openTodos.map((x) => <option key={x.id} value={x.id}>{x.text}</option>)}
        </select>
      </label>

      <div className="controls">
        {t.status === "running" ? <button className="primary" onClick={timer.pause}>Pause</button>
          : t.status === "paused" ? <button className="primary" onClick={timer.resume}>Resume</button>
          : <button className="primary" onClick={timer.start}>{t.status === "ready" ? "Start next session" : "Start"}</button>}
        <button className="btn" onClick={timer.reset}>Reset</button>
        <button className="btn" onClick={timer.skip}>Skip</button>
      </div>
      {settings.longEnabled && <p className="hint center">{t.cycle} of 4 focus sessions toward a long break</p>}

      <div className="stats">
        <div><strong>{td.length}</strong><span>sessions today</span></div>
        <div><strong>{mins(sum(td))}m</strong><span>focused today</span></div>
        <div><strong>{wk.length}</strong><span>sessions this week</span></div>
        <div><strong>{(sum(wk) / 3600000).toFixed(1)}h</strong><span>this week</span></div>
      </div>

      <div className="two">
        {[["By project", byProject], ["By task", byTodo]].map(([title, rows]) => (
          <section key={title}>
            <h3>{title}</h3>
            {rows.length ? <ul className="plain">{rows.map(([n, ms]) => <li key={n}><span>{n}</span><span>{mins(ms)}m</span></li>)}</ul> : <p className="hint">No completed sessions yet.</p>}
          </section>
        ))}
      </div>

      <section>
        <h3>Session history</h3>
        <div className="composer-row">
          <input type="date" className="date-input" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="Filter by date" />
          <select className="date-input" value={fProj} onChange={(e) => setFProj(e.target.value)} aria-label="Filter by project">
            <option value="">All projects</option><option value="none">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(fDate || fProj) && <button className="btn" onClick={() => { setFDate(""); setFProj(""); }}>Clear</button>}
        </div>
        {hist.length ? (
          <ul className="plain hist">
            {hist.map((s) => (
              <li key={s.id}>
                <span>{LABEL[s.type]} · {s.taskTitle || "No task"}</span>
                <span className={`st st-${s.status}`}>{s.status} · {mins(s.actualMs)}/{mins(s.plannedMs)}m · {new Date(s.completedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        ) : <p className="hint">No sessions match.</p>}
      </section>

      <section>
        <h3>Focus settings</h3>
        <div className="settings">
          <label><input type="checkbox" checked={settings.autoStart} onChange={(e) => up({ autoStart: e.target.checked })} /> Automatically start the next session</label>
          <label><input type="checkbox" checked={settings.notify} onChange={(e) => toggleNotify(e.target.checked)} /> Desktop notifications</label>
          <label><input type="checkbox" checked={settings.sound} onChange={(e) => up({ sound: e.target.checked })} /> Notification sound</label>
          <label><input type="checkbox" checked={settings.longEnabled} onChange={(e) => up({ longEnabled: e.target.checked })} /> Long break after 4 focus sessions</label>
          <label>Long break (minutes)
            <input type="number" min="1" max="60" value={settings.longMin} onChange={(e) => up({ longMin: Math.min(60, Math.max(1, +e.target.value || 15)) })} />
          </label>
        </div>
        {msg && <p className="hint">{msg}</p>}
      </section>
    </div>
  );
}
