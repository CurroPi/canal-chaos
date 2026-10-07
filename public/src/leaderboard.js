// Online leaderboard, stored in Supabase. Talks to its REST API directly (no extra libraries).
// The URL and key below are the project's PUBLIC values: they're meant to live in website code.
// Security comes from the database rules (anyone can read and add scores; nobody can edit or delete).

const SUPABASE_URL = '';      // e.g. 'https://abcdefgh.supabase.co'
const SUPABASE_ANON_KEY = ''; // the "anon" / "publishable" key, never the secret one

export const leaderboardEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

async function request(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers(), ...options.headers } });
  if (!res.ok) throw new Error(`Leaderboard error ${res.status}`);
  return res;
}

// The top scores, best first
export async function topScores(limit = 10) {
  const res = await request(`scores?select=id,name,score,walker&order=score.desc,created_at.asc&limit=${limit}`);
  return res.json();
}

// Save a score; returns the saved row (with its id)
export async function submitScore(name, score, walker) {
  const res = await request('scores', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name, score, walker }),
  });
  const [row] = await res.json();
  return row;
}

// Your position: 1 + how many scores beat yours
export async function rankOf(score) {
  const res = await request(`scores?select=id&score=gt.${score}`, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  const total = Number((res.headers.get('content-range') || '*/0').split('/')[1]) || 0;
  return total + 1;
}

// Names: capitals, numbers and spaces only, 12 characters max, and nothing too rude
const BLOCKED = ['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAG', 'WANK', 'TWAT', 'DICK', 'COCK', 'PISS', 'SLUT', 'WHORE', 'RAPE', 'NAZI'];
export function cleanName(raw) {
  const name = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
  const squashed = name.replace(/ /g, '');
  return BLOCKED.some((w) => squashed.includes(w)) ? '' : name;
}
