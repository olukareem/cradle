-- Cradle — initial schema.
-- Four tables: profiles (1:1 with auth.users), rooms, room_members, messages.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null check (char_length(username) between 2 and 32),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table public.rooms (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 60),
  description  text check (char_length(description) <= 280),
  is_private   boolean not null default false,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

create table public.room_members (
  room_id      uuid not null references public.rooms(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  role         text not null default 'member' check (role in ('owner','admin','member')),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  content    text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at  timestamptz,
  deleted_at timestamptz
);

-- Descending index on (room_id, created_at) powers "latest N" + paginated scroll-up.
create index messages_room_created_idx on public.messages (room_id, created_at desc);
create index room_members_user_idx     on public.room_members (user_id);
