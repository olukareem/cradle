-- Cradle — enable realtime replication.
-- The client subscribes to these tables with postgres_changes for push updates.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.room_members;
