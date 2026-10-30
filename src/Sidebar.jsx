import { useState } from "react";
import { colorOf } from "./store.js";

export default function Sidebar({ projects, todos, view, setView, onAdd, onRename, onDelete, onColor }) {
  const [name, setName] = useState("");
  const open = todos.filter((t) => !t.done);
  const nav = [
    ["today", "Today", open.filter((t) => t.due && t.due <= new Date().toISOString().slice(0, 10)).length],
    ["inbox", "Inbox", open.filter((t) => !t.projectId).length],
    ["all", "All tasks", open.length],
    ["focus", "Focus", ""],
  ];
  const Btn = ({ id, label, count }) => (
    <button className={`nav-btn ${view === id ? "on" : ""}`} onClick={() => setView(id)} aria-current={view === id}>
      <span>{label}</span>
      {count !== "" && <span className="count">{count}</span>}
    </button>
  );
  return (
    <nav className="sidebar" aria-label="Main">
      <div className="nav-group">
        {nav.map(([id, label, count]) => <Btn key={id} id={id} label={label} count={count} />)}
      </div>
      <p className="nav-title">Projects</p>
      <div className="nav-group">
        {projects.map((p) => {
          const mine = todos.filter((t) => t.projectId === p.id);
          const act = mine.filter((t) => !t.done).length;
          return (
            <div className="proj" key={p.id}>
              <Btn id={p.id} label={<><i className="dot" style={{ background: colorOf(p) }} />{p.name}</>} count={`${act}/${mine.length - act}`} />
              <span className="proj-actions">
                <input type="color" value={colorOf(p)} onChange={(e) => onColor(p.id, e.target.value)} aria-label={`Color for ${p.name}`} />
                {!p.builtin && (<>
                  <button className="link" onClick={() => onRename(p.id)} aria-label={`Rename ${p.name}`}>Rename</button>
                  <button className="link" onClick={() => onDelete(p.id)} aria-label={`Delete ${p.name}`}>Delete</button>
                </>)}
              </span>
            </div>
          );
        })}
      </div>
      <form className="proj-add" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onAdd(name.trim()); setName(""); } }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project" aria-label="New project name" />
        <button className="seg-btn on" type="submit">Add</button>
      </form>
      <p className="hint">Counts on projects: active / done</p>
    </nav>
  );
}
