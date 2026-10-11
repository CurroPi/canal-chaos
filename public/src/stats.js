// Anonymous play stats for the playtest: one row per run and per side-hustle attempt.
// No names, no IDs, nothing personal. Stored in Supabase (table `runs`, see docs/supabase/04-run-stats.sql).
// If the table isn't there (or anything fails), it quietly gives up: the game never waits for it.

import { insertRow, leaderboardEnabled } from './leaderboard.js';

const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let broken = false;

function send(row) {
  if (broken || !leaderboardEnabled()) return;
  insertRow('runs', { source: isLocal ? 'dev' : 'live', ...row }).catch(() => { broken = true; });
}

const isPhone = () => window.innerHeight > window.innerWidth;

export function recordRun({ steps, cause, seconds, rush, walker }) {
  send({ kind: 'run', steps, cause: String(cause).slice(0, 24), seconds: Math.min(7200, Math.round(seconds)), rush, walker, phone: isPhone() });
}

export function recordHustle({ game, won, walker }) {
  send({ kind: 'hustle', game, won, walker, phone: isPhone() });
}
