# Cradle

Real-time chat with rooms, presence, typing indicators, and per-room unread counts. Built on Next.js 16 (App Router) and Supabase — no custom WebSocket server, no Redis, no polling.

**Live demo:** [cradle-lemon.vercel.app](https://cradle-lemon.vercel.app)

```
alice@example.com / test-alice-pw-2025
bob@example.com   / test-bob-pw-2025
```

---

## What it does

- **Auth** — email/password + magic link via Supabase Auth, session refresh via a Next 16 Proxy
- **Rooms** — create, browse public, join, leave; public-or-member visibility enforced in Postgres
- **Messages** — optimistic send, realtime receive via `postgres_changes`, infinite scroll for history, 2-minute sender grouping, inline edit, soft delete
- **Presence** — online members in the right rail, debounced typing indicator, auto-cleared after 3 s idle
- **Unread** — per-room badge driven by a `last_read_at` cursor; clears on focus
- **Resilience** — connection banner surfaces offline state from browser events

---

## Architecture

### Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, RSC) | RSC loads the initial 50 messages server-side for fast first paint; client components handle realtime deltas. |
| Language | TypeScript strict | `noUncheckedIndexedAccess`, zero `any`. |
| Styling | Tailwind CSS v4 | Single Inter font, dark theme, token-driven (`bg-800`, `accent`, `text-faint`). |
| Backend | Supabase (Postgres + Auth + Realtime + Presence) | Eliminates a bespoke server. Persistence, auth, broadcast, presence in one place. |
| Client state | Zustand | Session, joined rooms, active room, presence mirror. Small surface, no re-render storms. |
| Server state | Native Supabase client | `on('postgres_changes')` already pushes deltas; wrapping it in React Query would double-buffer. |
| UI primitives | Radix + CVA | Hand-built Shadcn-style components, no design system dependency. |

### Realtime strategy

Three channel types, each with a narrow job:

1. **`postgres_changes` on `messages`** filtered by `room_id` — pushes INSERT/UPDATE events to subscribed clients.
2. **Presence channel** `room:{roomId}:presence` — carries `{ userId, username, avatarUrl, typing, typingUntil }`. Typing is debounced on keystroke, cleared after 3 s idle.
3. **`postgres_changes` on `room_members`** — updates the sidebar when people join or leave.

Optimistic send writes a temp row to the Zustand store, then replaces it by `id` when the server INSERT response arrives. The realtime echo is deduped by the same `id` key.

### Row Level Security

Every table has RLS enabled. The model:

- `profiles` — public read, self write
- `rooms` — public readable by all; private readable by members; creator updates
- `room_members` — members see co-members; users manage their own membership and `last_read_at`
- `messages` — readable by room members, insertable by members as themselves, updatable only by the author; deletes happen as UPDATE-to-`deleted_at` (soft delete), so there is no DELETE policy by design

Migration `0005_fix_rls_recursion.sql` breaks a recursive `room_members` SELECT policy — the original "see co-members" policy referenced `room_members` inside its own `USING` clause, which Postgres evaluates as an infinite subquery against the same RLS-protected table. The fix uses a `SECURITY DEFINER` helper function that bypasses RLS for the recursion check.

---

## Local setup

### 1. Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project (free tier)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 2. Install

```bash
git clone <repo-url>
cd cradle
npm install
```

### 3. Environment

```bash
cp .env.local.example .env.local
```

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (server-only, never expose) |

### 4. Apply schema

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This applies five migrations:

| Migration | Purpose |
|---|---|
| `0001_init.sql` | Tables: profiles, rooms, room_members, messages |
| `0002_rls.sql` | Row Level Security policies |
| `0003_triggers.sql` | Auto-create profile on signup |
| `0004_realtime.sql` | Enable realtime on messages + room_members |
| `0005_fix_rls_recursion.sql` | Break recursive `room_members` SELECT policy; rename soft-delete UPDATE policy |

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/sign-in`.

---

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write .
```

---

## Testing

Two protocol-level end-to-end test scripts run against a live Supabase project — no browser, no Playwright, no flake. Both require seeded `alice@example.com` and `bob@example.com` accounts.

```bash
node scripts/realtime-test.mjs
node scripts/rls-test.mjs
```

### `realtime-test.mjs` — 18 checks

Exercises the full realtime surface over the actual WebSocket, not a mock:

- Signed `postgres_changes` subscription (INSERT, UPDATE/edit, UPDATE/soft-delete)
- Presence channel sync between two authenticated clients
- Typing-on / typing-off debounce
- Presence leave event on disconnect
- Auth round-trip for both Alice and Bob

Key finding baked into the test: the Supabase Realtime server needs roughly 3 seconds after `SUBSCRIBED` before a `room_id` filter is registered and INSERT events start flowing. Tests below that threshold flap.

### `rls-test.mjs` — 10 checks

Proves the RLS policy matrix holds. For every deny path, the test both reads back the response and cross-checks with a service-role client to ensure no mutation leaked:

- Anonymous (no JWT) SELECT and INSERT are rejected
- Bob cannot read, insert, edit, or soft-delete messages in a room he is not a member of
- Bob cannot edit or soft-delete Alice's messages in a shared room (both the UPDATE return must be empty *and* the service-role read must show unchanged content)
- Positive controls: Alice can read her rooms; Bob can read the shared room

### Pre-ship gate

A clean repo produces:

- `npm run typecheck` — zero errors
- `npm run lint` — zero errors, zero warnings
- `npm run build` — clean production build
- `node scripts/realtime-test.mjs` — 18/18
- `node scripts/rls-test.mjs` — 10/10

---

## Deploy

### Vercel + Supabase Cloud

1. Push the repo.
2. Import on [Vercel](https://vercel.com/new).
3. Add the three env vars from `.env.local`.
4. Deploy. Vercel auto-detects Next.js.

**Env var gotcha:** if you set Vercel env vars via the CLI, use `printf '%s'`, not `echo` — `echo` appends a newline that gets baked into the value, and Supabase Realtime URL-encodes the apikey verbatim, producing a `%0A` that fails JWT validation.

```bash
# wrong — trailing newline ends up in the stored value
echo "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# right
printf '%s' "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

---

## Project structure

```
app/
  (auth)/           sign-in + sign-up (no shell)
  (app)/            authenticated shell: rooms, messages
  auth/             route handlers: magic-link callback, sign-out
components/
  auth/             SignInForm, SignUpForm
  chat/             MessageList, MessageItem, MessageInput, TypingIndicator
  presence/         PresenceProvider, MembersPanel
  rooms/            SidebarContent, RoomView, CreateRoomDialog, BrowseRoomsDialog
  shell/            AppShell, SessionProvider, UserProfileCorner, ConnectionBanner
  ui/               Button, Input, Label, Badge, Toast
lib/
  db/               server-side typed queries (messages, rooms)
  realtime/         usePresence, useUnread hooks
  stores/           Zustand: session, rooms, ui
  supabase/         client.ts, server.ts, proxy.ts
  types/            database.ts (generated from schema)
  utils/            cn, groupMessages, time helpers
supabase/
  migrations/       0001 – 0005
scripts/
  realtime-test.mjs
  rls-test.mjs
proxy.ts            Next 16 session-refresh proxy + auth redirect
```

---

## Notable engineering details

- **Next 16 Proxy**, not middleware. Next 16 renamed `middleware.ts` to `proxy.ts` with a new API surface. See `node_modules/next/dist/docs/` for specifics.
- **Callback-slot pattern** for Supabase Realtime: `realtime-js` v2 rejects `.on()` calls after `.subscribe()`. All handlers are registered once up front against mutable callback slots; the slots are swapped between test phases rather than the handlers re-registered.
- **`viewport` export** — Next 14+ separated `colorScheme`/`themeColor` from `metadata` into a dedicated `viewport` export. `layout.tsx` uses the new API.
- **Lazy `useState` initializer** in `ConnectionBanner` — avoids the react-hooks/set-state-in-effect lint rule by seeding state from `navigator.onLine` at mount instead of inside `useEffect`.
- **`formatRelativeDay` purity** — `Date.now()` reads were removed from render paths because they produce SSR/client divergence near day and minute boundaries.

---

## License

Personal portfolio project. No license granted.
