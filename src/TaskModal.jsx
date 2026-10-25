import { useEffect, useState } from "react";
import { uid } from "./store.js";

export default function TaskModal({ todo, projects, onChange, onToggle, onClose }) {
  const [sub, setSub] = useState("");
  const [tags, setTags] = useState(todo.tags.join(", "));
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const setSubs = (subtasks) => onChange({ subtasks });
  const doneCount = todo.subtasks.filter((s) => s.done).length;
  const fmt = (ts) => new Date(ts).toLocaleString();

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Task details">
        <div className="modal-top">
          <input className="modal-title" value={todo.text} onChange={(e) => onChange({ text: e.target.value })} aria-label="Task title" />
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="field-grid">
          <label>Project
            <select value={todo.projectId || ""} onChange={(e) => onChange({ projectId: e.target.value || null })}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={todo.priority} onChange={(e) => onChange({ priority: e.target.value })}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </label>
          <label>Due date
            <input type="date" value={todo.due || ""} onChange={(e) => onChange({ due: e.target.value || null })} />
          </label>
          <label>Estimate (minutes)
            <input type="number" min="0" value={todo.estimate ?? ""} onChange={(e) => onChange({ estimate: e.target.value === "" ? null : Math.max(0, +e.target.value) })} />
          </label>
        </div>

        <label className="block">Tags (comma separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)}
            onBlur={() => onChange({ tags: [...new Set(tags.split(",").map((s) => s.trim()).filter(Boolean))] })} />
        </label>

        <label className="block">Notes
          <textarea rows="4" value={todo.notes} onChange={(e) => onChange({ notes: e.target.value })} />
        </label>

        <div className="block">
          <p className="label">Subtasks {todo.subtasks.length > 0 && <span className="count">{doneCount} of {todo.subtasks.length}</span>}</p>
          <ul className="subs">
            {todo.subtasks.map((s) => (
              <li key={s.id}>
                <label className="sub-check">
                  <input type="checkbox" checked={s.done} onChange={() => setSubs(todo.subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x))} />
                  <span className={s.done ? "struck" : ""}>{s.text}</span>
                </label>
                <button className="link" onClick={() => setSubs(todo.subtasks.filter((x) => x.id !== s.id))} aria-label={`Remove subtask ${s.text}`}>Remove</button>
              </li>
            ))}
          </ul>
          <form className="proj-add" onSubmit={(e) => { e.preventDefault(); if (sub.trim()) { setSubs([...todo.subtasks, { id: uid(), text: sub.trim(), done: false }]); setSub(""); } }}>
            <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Add a subtask" aria-label="New subtask" />
            <button className="seg-btn on" type="submit">Add</button>
          </form>
        </div>

        <div className="modal-foot">
          <span className="hint">Created {fmt(todo.createdAt)} · Updated {fmt(todo.updatedAt)}</span>
          <button className="primary" onClick={onToggle}>{todo.done ? "Reopen task" : "Mark complete"}</button>
        </div>
      </div>
    </div>
  );
}
