// Anonymous play stats for the playtest: one row per run and per side-hustle attempt.
// No names, no IDs, nothing personal. Stored in Supabase (table `runs`, see docs/supabase/04-run-stats.sql).
// If the table isn't there (or anything fails), it quietly gives up: the game never waits for it.

import { insertRow, leaderboardEnabled } from './leaderboard.js';

const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let broken = false;
let hasRunNo = true; // until the database says it doesn't know the run_no column yet

function send(row) {
  if (broken || !leaderboardEnabled()) return;
  const full = { source: isLocal ? 'dev' : 'live', ...row };
  if (!hasRunNo) delete full.run_no;
  insertRow('runs', full).catch((err) => {
    if (err.status === 400 && 'run_no' in full) { // older database: send it again without run_no
      hasRunNo = false;
      send(row);
    } else broken = true;
  });
}

const isPhone = () => window.innerHeight > window.innerWidth;

// runNo: 1 for the first run since the game was opened, 2 for the next... (shows when people stop, and if ads make them leave)
export function recordRun({ steps, cause, seconds, rush, walker, runNo }) {
  send({ kind: 'run', run_no: runNo, steps, cause: String(cause).slice(0, 24), seconds: Math.min(7200, Math.round(seconds)), rush, walker, phone: isPhone() });
}

export function recordHustle({ game, won, walker }) {
  send({ kind: 'hustle', game, won, walker, phone: isPhone() });
}
