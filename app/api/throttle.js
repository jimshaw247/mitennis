// Brute-force lockout backed by a Supabase table (<prefix>_login_attempts).
// Policy: 5 failed attempts inside a 15-minute window -> 15-minute lockout,
// keyed per-identity (the caller builds the key, e.g. per-IP). Serverless-safe:
// the counter lives in the DB, not memory, so it survives Lambda cold starts.
// The table has RLS enabled with no anon/authenticated policies, so only the
// server's service_role key can touch it — same model as the app's other tables.

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'] || '';
  const ip = String(xff).split(',')[0].trim();
  return ip || req.socket?.remoteAddress || 'unknown';
}

// { locked: true, retryAfterSec } while this key is inside a lockout, else { locked:false }.
export async function checkLock(db, table, key) {
  const { data, error } = await db.from(table)
    .select('locked_until').eq('id', key).maybeSingle();
  if (error) { console.error('throttle read failed:', error.message); return { locked: false }; }
  const until = data?.locked_until ? Date.parse(data.locked_until) : NaN;
  if (Number.isFinite(until) && until > Date.now()) {
    return { locked: true, retryAfterSec: Math.ceil((until - Date.now()) / 1000) };
  }
  return { locked: false };
}

export async function recordFailure(db, table, key) {
  const now = Date.now();
  const { data } = await db.from(table)
    .select('fail_count, first_fail_at').eq('id', key).maybeSingle();
  const windowFresh = data?.first_fail_at && (now - Date.parse(data.first_fail_at) < WINDOW_MS);
  const count = windowFresh ? (data.fail_count || 0) + 1 : 1;
  const firstFailAt = windowFresh ? data.first_fail_at : new Date(now).toISOString();
  const lockedUntil = count >= MAX_FAILS ? new Date(now + LOCK_MS).toISOString() : null;
  const { error } = await db.from(table).upsert({
    id: key, fail_count: count, first_fail_at: firstFailAt,
    locked_until: lockedUntil, updated_at: new Date(now).toISOString(),
  });
  if (error) console.error('throttle write failed:', error.message);
}

export async function recordSuccess(db, table, key) {
  await db.from(table).delete().eq('id', key);
}
