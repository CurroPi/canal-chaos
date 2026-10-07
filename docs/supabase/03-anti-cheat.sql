-- Canal Chaos: anti-cheat and speed-ups for the leaderboard
-- Run once in Supabase > SQL Editor. Safe to run again.

-- 1. How long the run lasted (the game sends it with each score)
alter table public.scores add column if not exists seconds integer;

-- 2. Rules for every new score (existing scores are left alone)
alter table public.scores drop constraint if exists scores_name_format;
alter table public.scores add constraint scores_name_format
  check (name ~ '^[A-Z0-9 ]{1,12}$') not valid;

alter table public.scores drop constraint if exists scores_name_polite;
alter table public.scores add constraint scores_name_polite
  check (replace(name, ' ', '') !~* '(fuck|shit|cunt|nigg|fag|wank|twat|dick|cock|piss|slut|whore|rape|nazi)') not valid;

-- Nobody walks faster than ~20 points a second, even at full rush speed
alter table public.scores drop constraint if exists scores_plausible;
alter table public.scores add constraint scores_plausible
  check (seconds is not null and seconds between 1 and 7200 and score <= seconds * 20 + 300) not valid;

-- 3. No spamming: one score per name every 10 seconds, and the server sets the time
create or replace function public.scores_guard() returns trigger language plpgsql as $$
begin
  new.created_at := now();
  if exists (select 1 from public.scores where name = new.name and created_at > now() - interval '10 seconds') then
    raise exception 'Slow down';
  end if;
  return new;
end $$;
drop trigger if exists scores_guard on public.scores;
create trigger scores_guard before insert on public.scores for each row execute function public.scores_guard();

-- 4. Keep the "best per person" leaderboard fast as it grows
create index if not exists scores_name_best_idx on public.scores (name, score desc, created_at);
