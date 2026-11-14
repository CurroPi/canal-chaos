-- Canal Chaos: "report this name" on the leaderboard (the app stores want a way to flag offensive names)
-- Run once in Supabase > SQL Editor. Safe to run again.
--
-- Players tap the little flag next to a name on the Top 10. The game hides that name for them straight away
-- and adds a row here. Nobody except you can read this table (no select policy for the public key).
--
-- To deal with reports: Supabase > Table Editor > reports. If a name is rude, open the `scores` table,
-- filter by that name, and delete its rows. Then delete the report row too.

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 12),   -- the leaderboard name that was reported
  score integer check (score between 0 and 200000)                  -- the score shown next to it
);

-- The server sets the time (nobody can fake it)
create or replace function public.reports_guard() returns trigger language plpgsql as $$
begin
  new.created_at := now();
  return new;
end $$;
drop trigger if exists reports_guard on public.reports;
create trigger reports_guard before insert on public.reports for each row execute function public.reports_guard();

-- Anyone can send a report; nobody can read, edit or delete (only you, in the dashboard)
alter table public.reports enable row level security;
drop policy if exists "anyone can report a name" on public.reports;
create policy "anyone can report a name" on public.reports for insert to anon with check (true);

create index if not exists reports_recent_idx on public.reports (created_at desc);
