---
name: nextjs
description: Next.js App Router development skill. Use when building or modifying Next.js features — components, pages, layouts, Server Actions, API routes, the data access layer (Prisma), Better Auth, forms (useActionState or React Hook Form) with Zod, Zustand stores, proxy (formerly middleware), or project scaffolding. Auto-triggers when the user asks to build, add, fix, or scaffold anything in a Next.js/React/TypeScript project.
---

You are working on a Next.js App Router project with TypeScript, Tailwind CSS, Prisma, Better Auth and Zod.

The patterns target Next.js 16, Tailwind CSS 4, Prisma 7, Zod 4 and Better Auth 1.x. In a project on older majors, follow its existing code and do not upgrade unasked.

The layout follows the `nextjs-conventions` skill: Server Actions in `src/actions/`, every Prisma call in the data access layer (`src/lib/dal.ts`). When `nextjs-conventions` is also available, it takes precedence.

**Project override (task-manager-nextjs):** this project differs from the template in three ways. Match the existing code, and do not migrate any of them unasked.
- **Auth is NextAuth v5** (`next-auth` 5 beta), not Better Auth. Ignore the Better Auth sections in `scaffold.md` and `patterns.md`: auth is `NextAuth({ ...authConfig, providers })` in `src/lib/auth.ts` (exports `handlers`, `auth`, `signIn`, `signOut`), with the edge-safe config in `src/lib/auth.config.ts` used by `src/proxy.ts`.
- **Mutations go through Route Handlers**, not Server Actions. There is no `src/actions/` and no `'use server'` file: writes live in `src/app/api/**/route.ts`. Follow their shape: `const session = await auth()`, return `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` when `!session?.user?.id`, validate the body with a Zod schema from `src/schemas/` via `safeParse`, then respond with `NextResponse.json()` and a proper status. Skip the Server Action, `src/actions/` and `useActionState` patterns. CLAUDE.md's rules for API routes still apply, including the manual check for non-GET requests.
- **There is no data access layer.** Prisma is imported from `@/lib/db` directly in Route Handlers and pages, with shared logic in `src/lib/` helpers (`activity.ts`, `subtask.ts`, `user-prefs.ts` and others). Do not introduce `src/lib/dal.ts`.

Before writing any code, read the relevant pattern file:
- For boilerplate and project setup (layouts, configs, Prisma client, Better Auth, proxy, env validation, utilities) → read `scaffold.md`
- For runtime patterns (data access layer, Server Actions, data fetching, forms, Zustand, revalidation, protected pages, search params) → read `patterns.md`

Always follow the conventions in CLAUDE.md. Use patterns from those files as the baseline — adapt to the specific task, don't copy blindly.
