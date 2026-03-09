# Task Manager Pro

A full-featured task manager web app built with Next.js 16, PostgreSQL, and NextAuth. Jira-inspired with workboards, shareable task URLs, inline editing, and a rich text editor.

## Features

- **Workboards** — Jira-style project boards with auto-generated keys (e.g. `PROJ`). Each board has its own task counter (`PROJ-1`, `PROJ-2`, …)
- **Task Full Page** — Every task has a unique shareable URL at `/t/PROJ-1` with a Jira-like layout (title, description, status, priority, dates, Jira link)
- **Inline Editing** — Click any field on the task page to edit it in place (title, description, status, priority, due date, Jira URL) — no separate edit modal
- **Rich Text Editor** — Tiptap v3 with toolbar (bold, italic, headings, lists, code blocks, tables, links) and slash commands (`/heading`, `/table`, `/code`, etc.)
- **4 Views** — List (sortable table with task key), Kanban (drag-and-drop), Calendar (monthly), Timeline (Gantt-style)
- **Sidebar** — Workboard switcher, live overview stats (Total, Done, Active, Overdue), filter by Priority and Status with counts
- **Auth** — Register, login, and sign out with JWT sessions
- **User CRUD** — Update name, email, and password via `/api/users/me`
- **Dark theme** — Default dark UI with CSS variables
- **Keyboard shortcuts** — `N` to open new task, `Ctrl+Enter` to save, `Esc` to close

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| Auth | NextAuth v5 (JWT + Credentials) |
| Database | PostgreSQL |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Rich Text | Tiptap v3 (StarterKit, Table, Link, Placeholder) |
| Validation | Zod v4 + React Hook Form |
| Package manager | Bun |

## Getting Started

### Prerequisites

- Node.js 20+ and [Bun](https://bun.sh)
- PostgreSQL database

### 1. Clone and install

```bash
git clone https://github.com/chrisgen19/task-manager-nextjs.git
cd task-manager-nextjs
bun install
```

### 2. Environment variables

Create a `.env.local` file in the project root:

```env
DATABASE_URL="postgres://user:password@localhost:5432/taskmanager"
AUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secure `AUTH_SECRET`:

```bash
# Option 1 — OpenSSL
openssl rand -base64 32

# Option 2 — Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Set up the database

```bash
bunx prisma generate
bunx prisma migrate deploy
```

### 4. Run the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login + Register pages
│   ├── (dashboard)/
│   │   ├── dashboard/       # Main task dashboard (/dashboard)
│   │   └── t/[slug]/        # Task full page (/t/PROJ-1)
│   ├── api/
│   │   ├── auth/            # NextAuth route handler
│   │   ├── tasks/           # GET, POST, PUT, DELETE tasks
│   │   ├── tasks/by-slug/   # GET task by slug (PROJ-1)
│   │   ├── workboards/      # GET, POST, PUT, DELETE workboards
│   │   ├── register/        # User registration
│   │   └── users/me/        # Profile update + account delete
│   └── globals.css          # Dark theme CSS variables + rich text typography
├── components/
│   ├── task-manager.tsx         # Main orchestrator (state, CRUD, navigation)
│   ├── sidebar.tsx              # Workboards + Overview stats + Priority/Status filters
│   ├── header.tsx               # View tabs + Search + Sort
│   ├── task-modal.tsx           # Create task modal (2-column, board selector)
│   ├── task-detail.tsx          # Jira-like task full page with inline editing
│   ├── workboard-nav-sidebar.tsx # Sidebar for task detail pages
│   ├── rich-text-editor.tsx     # Tiptap editor with toolbar + slash commands
│   ├── ui/toast.tsx             # Toast notifications
│   └── views/                   # list-view, kanban-view, calendar-view, timeline-view
├── lib/
│   ├── auth.ts              # NextAuth full config (with DB)
│   ├── auth.config.ts       # Edge-safe auth config (for proxy/middleware)
│   ├── db.ts                # Prisma client singleton
│   ├── sanitize.ts          # Server-side HTML sanitization
│   └── utils.ts             # cn(), formatDate(), sanitizeHtml(), etc.
├── schemas/                 # Zod validation schemas (task, workboard, user)
├── types/                   # Shared TypeScript types + constants
└── proxy.ts                 # Next.js 16 route protection (replaces middleware)
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Create a new account |
| `GET` | `/api/workboards` | List all workboards for current user |
| `POST` | `/api/workboards` | Create a workboard |
| `PUT` | `/api/workboards/:id` | Update a workboard |
| `DELETE` | `/api/workboards/:id` | Delete a workboard (cascades tasks) |
| `GET` | `/api/tasks` | Get all tasks for the current user |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/:id` | Get a single task |
| `PUT` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/tasks/by-slug/:slug` | Get task by slug (e.g. `PROJ-1`) |
| `GET` | `/api/users/me` | Get current user profile |
| `PUT` | `/api/users/me` | Update name, email, or password |
| `DELETE` | `/api/users/me` | Delete account (cascades tasks) |

## Workboards & Task URLs

Each workboard has a short uppercase key (2–5 letters, e.g. `PROJ`). Tasks are numbered per board starting at 1. The resulting slug (`PROJ-1`, `PROJ-2`, …) becomes the shareable URL:

```
https://yourapp.com/t/PROJ-1
```

Clicking any task in List, Kanban, Calendar, or Timeline view navigates directly to its full page.

## Rich Text Editor

The description field uses [Tiptap v3](https://tiptap.dev) with:

- **Toolbar** — Undo/Redo, Bold, Italic, Strikethrough, Inline Code, H1/H2/H3, Bullet List, Numbered List, Code Block, Blockquote, Divider, Table, Link
- **Slash commands** — Type `/` to open the block picker. Supports: Text, Heading 1–3, Bullet List, Numbered List, Code Block, Blockquote, Divider, Table
- Navigate the slash menu with ↑↓ arrows, Enter to select, Esc to dismiss

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`
4. Run migrations against your production DB before first deploy:
   ```bash
   DATABASE_URL="..." bunx prisma migrate deploy
   ```

## Notes

- `src/generated/` is gitignored — run `bunx prisma generate` after cloning
- React Compiler is disabled (`reactCompiler: false`) — incompatible with React Hook Form
- Description is sanitized server-side on every save via `src/lib/sanitize.ts`
- `AUTH_SECRET` must be a cryptographically random string — generate with `openssl rand -base64 32`
- **SSL (production):** `src/lib/db.ts` strips `sslmode` from `DATABASE_URL` and configures SSL directly on the `pg` Pool (`rejectUnauthorized: false`) to avoid the pg v8 deprecation warning. If your provider requires strict certificate verification, set `rejectUnauthorized: true` instead.
- **Favicon:** `src/app/icon.svg` — blue rounded-square checkmark matching the sidebar logo. Next.js App Router serves it automatically.
