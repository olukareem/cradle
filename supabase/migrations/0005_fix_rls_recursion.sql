-- Fix: Drop the recursive room_members SELECT policy.
-- The original policy queried room_members from within a room_members policy,
-- causing Postgres to loop infinitely on every SELECT. Replace with a direct
-- column check: each user can only read their own membership rows.
-- Cross-user presence (online members list) is handled via Supabase Presence
-- channels, not DB queries, so this restriction has no functional downside.
drop policy if exists "members_read_if_member" on public.room_members;

create policy "members_read_own"
  on public.room_members
  for select
  using (user_id = auth.uid());

-- Rename misleadingly-named soft-delete policy.
-- It is FOR UPDATE (writes deleted_at), not a DELETE policy.
drop policy if exists "messages_delete_self" on public.messages;

create policy "messages_soft_delete_self"
  on public.messages
  for update
  using (auth.uid() = user_id);
