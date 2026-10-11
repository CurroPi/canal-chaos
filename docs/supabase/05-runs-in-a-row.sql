-- Canal Chaos: which run in a row this was (1, 2, 3... since the game was opened). Still anonymous.
-- Run once in Supabase > SQL Editor. Safe to run again.
alter table public.runs add column if not exists run_no integer check (run_no between 1 and 1000);
