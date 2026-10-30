import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { DEFAULT_PROJECTS, PALETTE, colorOf, migrateTask, uid } from "./store.js";
import { DEFAULT_FOCUS, beep, mmss, useTimer } from "./timer.js";
import Focus from "./Focus.jsx";
import Sidebar from "./Sidebar.jsx";
import Today from "./Today.jsx";
import TaskModal from "./TaskModal.jsx";

const PRIORITIES = ["low", "medium", "high"];
const RANK = { high: 0, medium: 1, low: 2 };
const FILTERS = ["all", "active", "completed"];

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

function formatDue(iso) {
  const today = todayISO();
  if (iso === today) return "Today";
  const diff = Math.round((new Date(iso) - new Date(today)) / 86400000);
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const Icon = {
  check: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 6.8" /></svg>
  ),
  edit: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16h3l8.5-8.5a1.4 1.4 0 000-2L14.5 4.5a1.4 1.4 0 00-2 0L4 13v3z" /></svg>
  ),
  trash: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 6h10M8 6V4h4v2M6.5 6l.6 10h5.8l.6-10" /></svg>
  ),
  sun: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.5" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" /></svg>
  ),
  moon: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 11.5A6.5 6.5 0 018.5 3.5a6.5 6.5 0 108 8z" /></svg>
  ),
  list: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5h9M7 10h9M7 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01" /></svg>
  ),
  play: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4.5l8 5.5-8 5.5z" /></svg>
  ),
  search: (
    <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5" /><path d="M13 13l4 4" /></svg>
  ),
};

function TodoItem({ todo, onToggle, onDelete, onSave, onOpen, project, onFocus, stat }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.text);
  const today = todayISO();
  const overdue = todo.due && !todo.done && todo.due < today;

  const commit = () => {
    const text = draft.trim();
    if (text) onSave(todo.id, text);
    else setDraft(todo.text);
    setEditing(false);
  };

  return (
    <li className={`item ${todo.done ? "is-done" : ""}`}>
      <button
        className="check"
        onClick={() => onToggle(todo.id)}
        aria-label={todo.done ? "Mark as not done" : "Mark as done"}
        aria-pressed={todo.done}
      >
        {Icon.check}
      </button>

      <div className="item-body">
        {editing ? (
          <input
            className="edit-input"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(todo.text);
                setEditing(false);
              }
            }}
            aria-label="Edit task"
          />
        ) : (
          <span className="item-text" onDoubleClick={() => setEditing(true)}>
            {todo.text}
          </span>
        )}
        <div className="meta">
          <span className={`tag tag-${todo.priority}`}>{todo.priority}</span>
          {todo.subtasks.length > 0 && (
            <span className="due">{todo.subtasks.filter((s) => s.done).length} of {todo.subtasks.length} subtasks</span>
          )}
          {project && <span className="badge" style={{ "--c": colorOf(project) }}>{project.name}</span>}
          {stat && <span className="due">{stat.n} focus · {stat.min}m</span>}
          {todo.due && (
            <span className={`due ${overdue ? "is-overdue" : ""}`}>
              {overdue ? "Overdue · " : ""}
              {formatDue(todo.due)}
            </span>
          )}
        </div>
      </div>

      <div className="actions">
        {!todo.done && (
          <button className="icon-btn" onClick={() => onFocus(todo)} aria-label="Start focus session">
            {Icon.play}
          </button>
        )}
        <button className="icon-btn" onClick={() => onOpen(todo.id)} aria-label="Open task details">
          {Icon.list}
        </button>
        <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit task">
          {Icon.edit}
        </button>
        <button className="icon-btn danger" onClick={() => onDelete(todo.id)} aria-label="Delete task">
          {Icon.trash}
        </button>
      </div>
    </li>
  );
}

export default function App() {
  const [rawTodos, setTodos] = useLocalStorage("taskdesk.todos", []);
  const todos = useMemo(() => (Array.isArray(rawTodos) ? rawTodos : []).map(migrateTask), [rawTodos]);
  const [projects, setProjects] = useLocalStorage("taskdesk.projects", DEFAULT_PROJECTS);
  const [view, setView] = useState("today");
  const [openId, setOpenId] = useState(null);
  const [cProject, setCProject] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [toast, setToast] = useState("");
  const [fs, setFs] = useLocalStorage("taskdesk.focus", DEFAULT_FOCUS);
  const settings = { ...DEFAULT_FOCUS, ...(fs && typeof fs === "object" ? fs : {}) };
  const [rawSessions, setSessions] = useLocalStorage("taskdesk.sessions", []);
  const sessions = useMemo(() => (Array.isArray(rawSessions) ? rawSessions.filter((s) => s && s.id && Number.isFinite(s.completedAt)) : []), [rawSessions]);
  const addSession = (s) => setSessions((prev) => (Array.isArray(prev) && prev.some((x) => x.id === s.id) ? prev : [...(Array.isArray(prev) ? prev : []), s]));
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 6000); };
  const notify = (m) => {
    flash(m);
    if (settings.sound) beep();
    if (settings.notify && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("Taskdesk", { body: m }); } catch { /* optional */ }
    }
  };
  const timer = useTimer({ settings, addSession, notify });
  useEffect(() => {
    document.title = timer.active ? `${mmss(timer.remaining)} · Taskdesk` : "Taskdesk";
  }, [timer.active, Math.ceil(timer.remaining / 1000)]);
  const stats = useMemo(() => {
    const m = {};
    sessions.forEach((s) => {
      if (s.type === "focus" && s.status === "completed" && s.taskId) {
        const x = (m[s.taskId] ||= { n: 0, ms: 0 });
        x.n += 1; x.ms += s.actualMs;
      }
    });
    Object.values(m).forEach((x) => (x.min = Math.round(x.ms / 60000)));
    return m;
  }, [sessions]);
  const [theme, setTheme] = useLocalStorage(
    "taskdesk.theme",
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");
  const inputRef = useRef(null);

  document.documentElement.dataset.theme = theme;

  const done = todos.filter((t) => t.done).length;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos
      .filter((t) => (view === "today" || view === "all" ? true : view === "inbox" ? !t.projectId : t.projectId === view))
      .filter((t) => (filter === "active" ? !t.done : filter === "completed" ? t.done : true))
      .filter((t) => !q || t.text.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (RANK[a.priority] !== RANK[b.priority]) return RANK[a.priority] - RANK[b.priority];
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return b.createdAt - a.createdAt;
      });
  }, [todos, filter, query, view]);

  const add = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return inputRef.current?.focus();
    setTodos([
      migrateTask({
        id: uid(), text: value, done: false, priority, due: due || null, createdAt: Date.now(),
        projectId: effProject || null,
      }),
      ...todos,
    ]);
    setText("");
    setDue("");
    inputRef.current?.focus();
  };

  const toggle = (id) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done, updatedAt: Date.now(), completedAt: t.done ? null : Date.now() } : t)));
  const remove = (id) => setTodos(todos.filter((t) => t.id !== id));
  const save = (id, value) => setTodos(todos.map((t) => (t.id === id ? { ...t, text: value, updatedAt: Date.now() } : t)));
  const clearDone = () => setTodos(todos.filter((t) => !t.done));

  const pname = (id) => projects.find((p) => p.id === id)?.name;
  const renderItem = (t) => (
    <TodoItem key={t.id} todo={t} onToggle={toggle} onDelete={remove} onSave={save} onOpen={setOpenId} project={view === t.projectId ? null : projects.find((p) => p.id === t.projectId)} onFocus={startFocus} stat={stats[t.id]} />
  );
  const openTodo = todos.find((t) => t.id === openId);
  const dupe = (name, except) => projects.find((p) => p.id !== except && p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const createProject = (name, color) => {
    const n = name.trim();
    if (!n) return null;
    const ex = dupe(n);
    if (ex) { flash(`“${ex.name}” already exists, selected it instead`); return ex.id; }
    const id = uid();
    setProjects([...projects, { id, name: n, builtin: false, color: color || PALETTE[projects.length % PALETTE.length] }]);
    return id;
  };
  const addProject = (name) => { createProject(name); };
  const setColor = (id, color) => setProjects(projects.map((p) => (p.id === id ? { ...p, color } : p)));
  const confirmNew = () => {
    const id = createProject(newName, newColor);
    if (id) { setCProject(id); setCreating(false); setNewName(""); }
  };
  const effProject = cProject && projects.some((p) => p.id === cProject) ? cProject : projects.some((p) => p.id === view) ? view : "";
  const startFocus = (todo) => {
    if (timer.active) return flash("Finish or reset the current session first.");
    timer.setTask(todo);
    setView("focus");
  };
  const renameProject = (id) => {
    const cur = projects.find((p) => p.id === id);
    const name = window.prompt("Rename project", cur.name)?.trim();
    if (name && !dupe(name, id)) setProjects(projects.map((p) => (p.id === id ? { ...p, name } : p)));
  };
  const deleteProject = (id) => {
    const n = todos.filter((t) => t.projectId === id).length;
    if (!window.confirm(`Delete this project? ${n} task(s) will be kept and moved to the Inbox.`)) return;
    setTodos(todos.map((t) => (t.projectId === id ? { ...t, projectId: null, updatedAt: Date.now() } : t)));
    setProjects(projects.filter((p) => p.id !== id));
    if (view === id) setView("inbox");
  };

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const emptyMsg = query
    ? { title: "No matches", hint: `Nothing found for “${query}”. Try a different word.` }
    : filter === "completed"
    ? { title: "Nothing completed yet", hint: "Finished tasks will show up here." }
    : filter === "active"
    ? { title: "All caught up", hint: "No open tasks. Add one above." }
    : { title: "No tasks yet", hint: "Type a task above and press Enter to add it." };

  const sidebarEl = <Sidebar projects={projects} todos={todos} view={view} setView={setView} onAdd={addProject} onRename={renameProject} onDelete={deleteProject} onColor={setColor} />;
  const toastEl = toast && <div className="toast" role="status">{toast}</div>;
  if (view === "focus") {
    return (
      <div className="app">
        {sidebarEl}
        <div className="shell">
          {timer.active && (
        <div className="mini" role="status">
          <button className="grow" onClick={() => setView("focus")}>
            {timer.t.phase === "focus" ? "Focus" : "Break"} <span className="clock-s">{mmss(timer.remaining)}</span>{timer.t.taskTitle ? ` · ${timer.t.taskTitle}` : ""}
          </button>
          <button className="btn" onClick={timer.t.status === "running" ? timer.pause : timer.resume}>{timer.t.status === "running" ? "Pause" : "Resume"}</button>
        </div>
      )}
      <header className="top"><div><p className="date">{dateLabel}</p><h1>Focus</h1></div></header>
          <Focus timer={timer} settings={settings} setSettings={setFs} todos={todos} projects={projects} sessions={sessions}
            onSelect={(id) => timer.setTask(todos.find((t) => t.id === id) || null)} />
        </div>
        {toastEl}
      </div>
    );
  }
  return (
    <div className="app">
    {sidebarEl}
    <div className="shell">
      <header className="top">
        <div>
          <p className="date">{dateLabel}</p>
          <h1>Taskdesk</h1>
        </div>
        <button
          className="icon-btn theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? Icon.sun : Icon.moon}
        </button>
      </header>

      <section className="progress" aria-label="Progress">
        <div className="progress-head">
          <strong>{pct}%</strong>
          <span>
            {todos.length === 0
              ? "Add your first task to get started"
              : `${done} of ${todos.length} tasks done`}
          </span>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <form className="composer" onSubmit={add}>
        <input
          ref={inputRef}
          className="composer-input"
          placeholder="What needs to be done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="New task"
          maxLength={200}
        />
        <div className="composer-row">
          <div className="seg" role="radiogroup" aria-label="Priority">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p}
                role="radio"
                aria-checked={priority === p}
                className={`seg-btn ${priority === p ? "on" : ""}`}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <select
            className="date-input"
            value={effProject}
            onChange={(e) => (e.target.value === "__new" ? setCreating(true) : setCProject(e.target.value))}
            aria-label="Project"
          >
            <option value="">No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__new">+ Create new project…</option>
          </select>
          <input
            type="date"
            className="date-input"
            value={due}
            min={todayISO()}
            onChange={(e) => setDue(e.target.value)}
            aria-label="Due date"
          />
          <button type="submit" className="primary">Add task</button>
        </div>
        {creating && (
          <div className="composer-row creator">
            <input className="date-input grow" autoFocus placeholder="New project name" value={newName} onChange={(e) => setNewName(e.target.value)} aria-label="New project name"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmNew(); } if (e.key === "Escape") setCreating(false); }} />
            <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} aria-label="Project color" />
            <button type="button" className="primary" onClick={confirmNew}>Create project</button>
            <button type="button" className="btn" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        )}
      </form>

      {view === "today" ? (
        <Today todos={todos} renderItem={renderItem} />
      ) : (
      <>
      <div className="toolbar">
        <div className="tabs" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`tab ${filter === f ? "on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
              <span className="count">
                {f === "all" ? todos.length : f === "active" ? todos.length - done : done}
              </span>
            </button>
          ))}
        </div>
        <label className="search">
          {Icon.search}
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tasks"
          />
        </label>
      </div>

      {visible.length ? (
        <ul className="list">
          {visible.map((t) => (
            renderItem(t)
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h2>{emptyMsg.title}</h2>
          <p>{emptyMsg.hint}</p>
        </div>
      )}

      </>
      )}

      {done > 0 && (
        <footer className="foot">
          <button className="link" onClick={clearDone}>Clear {done} completed</button>
        </footer>
      )}
      {toastEl}
      {openTodo && (
        <TaskModal
          todo={openTodo}
          projects={projects}
          onChange={(patch) => setTodos(todos.map((t) => (t.id === openTodo.id ? { ...t, ...patch, updatedAt: Date.now() } : t)))}
          onToggle={() => toggle(openTodo.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
    </div>
  );
}
