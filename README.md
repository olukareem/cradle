# Cradle

Real-time chat, built to hold conversations.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Postgres, Auth, Realtime, Presence) |
| Client state | Zustand |
| UI primitives | Radix UI + CVA |

---

## Local setup

### 1. Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed globally

### 2. Clone and install

```bash
git clone <repo-url>
cd cradle
npm install
```

### 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your project values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key (never expose this client-side) |

### 4. Push the database schema

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This applies four migrations:

| Migration | Purpose |
|---|---|
| `0001_init.sql` | Tables: profiles, rooms, room_members, messages |
| `0002_rls.sql` | Row Level Security policies |
| `0003_triggers.sql` | Auto-create profile on signup |
| `0004_realtime.sql` | Enable realtime on messages + room_members |

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/sign-in` since no session exists yet.

---

## Features

- **Auth** — email/password sign-up and sign-in, magic-link via Supabase Auth
- **Rooms** — create, browse public rooms, join, leave; private-room support
- **Messaging** — realtime via Supabase `postgres_changes`; infinite scroll up for history
- **Typing indicators** — Supabase Presence channel; debounced, auto-clears after 3 s idle
- **Online presence** — right rail shows all users currently in the room
- **Edit/delete** — inline edit with Enter/Esc; soft-delete (message placeholder preserved)
- **Unread counts** — per-room badge driven by `last_read_at` cursor; clears on focus
- **Connection banner** — offline state detected via browser events
- **Dark theme** — single Inter font, Discord-inspired three-pane layout

---

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit (must be zero errors)
npm run lint         # eslint
npm run format       # prettier --write .
```

---

## Deploy

### Vercel + Supabase Cloud

1. Push the repo to GitHub.
2. Import in [Vercel](https://vercel.com/new).
3. Add the three env vars from `.env.local` in Vercel project settings.
4. Deploy. Vercel auto-detects Next.js; no extra config needed.

---

## Project structure

```
app/
  (auth)/           Sign-in + sign-up pages (no shell)
  (app)/            Authenticated shell: rooms, messages
  auth/             Route handlers: magic-link callback, sign-out
components/
  auth/             SignInForm, SignUpForm
  chat/             MessageList, MessageItem, MessageInput, TypingIndicator
  presence/         PresenceProvider, MembersPanel
  rooms/            SidebarContent, RoomView, CreateRoomDialog, BrowseRoomsDialog
  shell/            AppShell, SessionProvider, UserProfileCorner, ConnectionBanner
  ui/               Button, Input, Label, Badge, Toast
lib/
  db/               Server-side typed queries (messages, rooms)
  realtime/         usePresence, useUnread hooks
  stores/           Zustand: session, rooms, ui
  supabase/         client.ts, server.ts, proxy.ts
  types/            database.ts (generated from schema)
  utils/            cn, groupMessages, time helpers
supabase/
  migrations/       SQL migrations 0001-0004
proxy.ts            Next 16 session-refresh proxy + auth redirect
```
