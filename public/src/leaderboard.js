// Online leaderboard, stored in Supabase. Talks to its REST API directly (no extra libraries).
// The URL and key below are the project's PUBLIC values: they're meant to live in website code.
// Security comes from the database rules (anyone can read and add scores; nobody can edit or delete).

const SUPABASE_URL = 'https://vqbdhewgjdqpdipzuhoq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3-pxFuYA0YGiKwz0M31_CQ_sbSWKBzw'; // public "publishable" key, never the secret one

export const leaderboardEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Older "anon" keys are JWTs (start with eyJ) and also go in the Authorization header;
// newer "sb_publishable_..." keys only go in the apikey header.
const headers = () => ({
  apikey: SUPABASE_ANON_KEY,
  ...(SUPABASE_ANON_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
  'Content-Type': 'application/json',
});

async function request(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers(), ...options.headers } });
  if (!res.ok) {
    const err = new Error(`Leaderboard error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

// "best_scores" is a database view with each name's best score. If it hasn't been created yet,
// fall back to the raw scores and sort out the duplicates here.
let useView = null;
async function hasView() {
  if (useView === null) {
    try {
      await request('best_scores?select=id&limit=1');
      useView = true;
    } catch (err) {
      if (err.status !== 404 && err.status !== 400) throw err;
      useView = false;
    }
  }
  return useView;
}

const FIELDS = 'select=id,name,score,walker';

function bestPerName(rows) {
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.name) ? false : seen.add(r.name)));
}

// The top scores, one per name, best first
export async function topScores(limit = 10) {
  if (await hasView()) {
    const res = await request(`best_scores?${FIELDS}&order=score.desc,created_at.asc&limit=${limit}`);
    return res.json();
  }
  const res = await request(`scores?${FIELDS}&order=score.desc,created_at.asc&limit=300`);
  return bestPerName(await res.json()).slice(0, limit);
}

// Where a score would place: 1 + how many people's best beats it
export async function rankOf(score) {
  if (!(await hasView())) {
    const res = await request(`scores?select=name,score&score=gt.${Math.floor(score)}&limit=5000`);
    return new Set((await res.json()).map((r) => r.name)).size + 1; // one per name
  }
  const res = await request(`best_scores?select=id&score=gt.${Math.floor(score)}`, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  const total = Number((res.headers.get('content-range') || '*/0').split('/')[1]) || 0;
  return total + 1;
}

// A name's best score (or null)
export async function bestOf(name) {
  const res = await request(`scores?${FIELDS}&name=eq.${encodeURIComponent(name)}&order=score.desc&limit=1`);
  const [row] = await res.json();
  return row || null;
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

// Names: capitals, numbers and spaces only, 12 characters max, and nothing too rude
const BLOCKED = ['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAG', 'WANK', 'TWAT', 'DICK', 'COCK', 'PISS', 'SLUT', 'WHORE', 'RAPE', 'NAZI'];
export function cleanName(raw) {
  const name = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
  const squashed = name.replace(/ /g, '');
  return BLOCKED.some((w) => squashed.includes(w)) ? '' : name;
}
