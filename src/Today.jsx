import { addDays, dayFromTs, todayISO } from "./store.js";

export default function Today({ todos, renderItem }) {
  const t = todayISO();
  const wk = addDays(t, 7);
  const open = todos.filter((x) => !x.done);
  const doneToday = todos.filter((x) => x.done && x.completedAt && dayFromTs(x.completedAt) === t);
  const overdue = open.filter((x) => x.due && x.due < t);
  const dueToday = open.filter((x) => x.due === t);
  const sections = [
    ["Overdue", overdue],
    ["Due today", dueToday],
    ["High priority", open.filter((x) => x.priority === "high" && !(x.due && x.due <= t))],
    ["Next 7 days", open.filter((x) => x.due > t && x.due <= wk)],
    ["Completed today", doneToday],
  ].filter(([, list]) => list.length);

  const plan = doneToday.length + dueToday.length + overdue.length;
  const pct = plan ? Math.round((doneToday.length / plan) * 100) : 0;

  return (
    <div className="today">
      <div className="today-head">
        <strong>{doneToday.length}</strong>
        <span>{plan ? `of ${plan} planned for today done (${pct}%)` : "completed today"}</span>
      </div>
      {sections.length === 0 ? (
        <div className="empty">
          <h2>Nothing needs attention</h2>
          <p>No tasks are due, overdue or high priority. Add one above, or check your Inbox.</p>
        </div>
      ) : (
        sections.map(([title, list]) => (
          <section key={title} className="group">
            <h3>{title} <span className="count">{list.length}</span></h3>
            <ul className="list">{list.map(renderItem)}</ul>
          </section>
        ))
      )}
    </div>
  );
}
