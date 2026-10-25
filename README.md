# Taskdesk

A personal to-do app built with React + Vite. No backend: everything is saved in your browser's localStorage.

## Run it

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## Build for production

```bash
npm run build
npm run preview
```

## Features

- Add, edit (double-click or pencil), complete and delete tasks
- Priority (low / medium / high) and optional due date, with overdue highlighting
- Filter by all / active / completed, plus search
- Progress bar, light and dark theme
- Auto-saves to localStorage (keys: `taskdesk.todos`, `taskdesk.theme`)

Note: data lives in one browser on one device. Clearing site data erases it.
