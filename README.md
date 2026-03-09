# Task Manager Pro

A full-featured task manager web app converted from a Chrome extension. Built with Next.js 15, PostgreSQL, and NextAuth.

## Features

- **4 Views** — List (sortable table), Kanban (drag-and-drop), Calendar (monthly), Timeline (Gantt-style)
- **Sidebar** — Live overview stats (Total, Done, Active, Overdue) + filter by Priority and Status with counts
- **Task Modal** — 2-column layout with rich text description (supports Jira paste formatting)
- **Auth** — Register, login, and sign out with JWT sessions
- **User CRUD** — Update name, email, and password via `/api/users/me`
- **Dark theme** — Default dark UI matching the original extension palette
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
openssl rand -base64 32
```

### 3. Set up the database

```bash
bunx prisma generate
bunx prisma migrate dev
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
│   ├── (dashboard)/         # Protected dashboard at /dashboard
│   ├── api/
│   │   ├── auth/            # NextAuth route handler
│   │   ├── tasks/           # GET, POST, PUT, DELETE tasks
│   │   ├── register/        # User registration
│   │   └── users/me/        # Profile update + account delete
│   └── globals.css          # Dark theme CSS variables
├── components/
│   ├── task-manager.tsx     # Main orchestrator (state, CRUD, keyboard shortcuts)
│   ├── sidebar.tsx          # Overview stats + Priority/Status filters
│   ├── header.tsx           # View tabs + Search + Sort
│   ├── task-modal.tsx       # Create/Edit modal (2-column)
│   ├── task-card.tsx        # Card used in Kanban view
│   ├── rich-text-editor.tsx # Contenteditable editor with Jira paste sanitization
│   ├── ui/toast.tsx         # Toast notifications
│   └── views/               # list-view, kanban-view, calendar-view, timeline-view
├── lib/
│   ├── auth.ts              # NextAuth full config (with DB)
│   ├── auth.config.ts       # Edge-safe auth config (for proxy/middleware)
│   ├── db.ts                # Prisma client singleton
│   ├── sanitize.ts          # Server-side HTML sanitization
│   └── utils.ts             # cn(), formatDate(), sanitizeHtml(), etc.
├── schemas/                 # Zod validation schemas
├── types/                   # Shared TypeScript types + constants
└── proxy.ts                 # Next.js 16 route protection (replaces middleware)
```

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Create a new account |
| `GET` | `/api/tasks` | Get all tasks for the current user |
| `POST` | `/api/tasks` | Create a new task |
| `GET` | `/api/tasks/:id` | Get a single task |
| `PUT` | `/api/tasks/:id` | Update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `GET` | `/api/users/me` | Get current user profile |
| `PUT` | `/api/users/me` | Update name, email, or password |
| `DELETE` | `/api/users/me` | Delete account (cascades tasks) |

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
- Description field is sanitized both client-side (on paste) and server-side (on save)
