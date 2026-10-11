-- Canal Chaos: anonymous play stats for the friends playtest
-- Run once in Supabase > SQL Editor. Safe to run again.
-- One row per finished run (or side-hustle attempt). No names, no IDs, nothing personal.

create table if not exists public.runs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null default 'live' check (source in ('live', 'dev')),  -- 'dev' = Claude testing on the local preview
  kind text not null default 'run' check (kind in ('run', 'hustle')),
  steps integer check (steps between 0 and 200000),                      -- runs: the score
  cause text check (char_length(cause) <= 24),                            -- runs: what got you, e.g. 'delivery-behind'
  seconds integer check (seconds between 0 and 7200),                    -- runs: how long it lasted
  rush integer check (rush between 0 and 50),                            -- runs: rush level reached
  walker text check (char_length(walker) <= 16),
  phone boolean,                                                          -- played on a phone (tall screen)?
  game text check (char_length(game) <= 16),                              -- hustles: pool / courtship / pottery
  won boolean                                                             -- hustles: did they win?
);

-- The server sets the time (nobody can fake it)
create or replace function public.runs_guard() returns trigger language plpgsql as $$
begin
  new.created_at := now();
  return new;
end $$;
drop trigger if exists runs_guard on public.runs;
create trigger runs_guard before insert on public.runs for each row execute function public.runs_guard();

-- Anyone can add a row and read the totals; nobody can edit or delete (only you, in the dashboard)
alter table public.runs enable row level security;
drop policy if exists "anyone can add a run" on public.runs;
create policy "anyone can add a run" on public.runs for insert to anon with check (true);
drop policy if exists "anyone can read runs" on public.runs;
create policy "anyone can read runs" on public.runs for select to anon using (true);

create index if not exists runs_recent_idx on public.runs (source, created_at desc);
