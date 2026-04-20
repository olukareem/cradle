-- Cradle — Row Level Security.
-- Every table is read-gated by membership; writes are self-authoring only.

alter table public.profiles     enable row level security;
alter table public.rooms        enable row level security;
alter table public.room_members enable row level security;
alter table public.messages     enable row level security;

-- profiles: public read, self write.
create policy "profiles_read_all"    on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);

-- rooms: public rooms visible to anyone logged in; private rooms only to members.
create policy "rooms_read_public_or_member" on public.rooms for select using (
  not is_private
  or exists (
    select 1 from public.room_members rm
    where rm.room_id = rooms.id and rm.user_id = auth.uid()
  )
);
create policy "rooms_insert_authed"  on public.rooms for insert with check (auth.uid() = created_by);
create policy "rooms_update_creator" on public.rooms for update using (auth.uid() = created_by);

-- room_members: a member sees the whole roster of rooms they're in;
-- users manage their own membership row (join, leave, update last_read_at).
create policy "members_read_if_member" on public.room_members for select using (
  exists (
    select 1 from public.room_members self
    where self.room_id = room_members.room_id and self.user_id = auth.uid()
  )
);
create policy "members_insert_self"          on public.room_members for insert with check (auth.uid() = user_id);
create policy "members_delete_self"          on public.room_members for delete using (auth.uid() = user_id);
create policy "members_update_self_lastread" on public.room_members for update using (auth.uid() = user_id);

-- messages: members read the room feed; sender must be self AND a room member;
-- author can update their own (used for edit + soft-delete).
create policy "messages_read_if_member" on public.messages for select using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id and rm.user_id = auth.uid()
  )
);
create policy "messages_insert_self_if_member" on public.messages for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.room_members rm
    where rm.room_id = messages.room_id and rm.user_id = auth.uid()
  )
);
create policy "messages_update_self" on public.messages for update using (auth.uid() = user_id);
-- Note: no DELETE policy. Deletion is a soft-delete performed as UPDATE deleted_at = now().
