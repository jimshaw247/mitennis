-- Brute-force lockout for the admin password gate (GET /api/state auth check).
-- Policy: 5 failed attempts in a 15-minute window -> 15-minute lockout, keyed
-- per client IP (id = 'ip:<addr>'). A correct password resets the counter.
-- Enforced server-side in app/api/state.js via app/api/throttle.js.
--
-- IMPORTANT: mitennis's Supabase tables (tennis_state) live in the *vibemini*
-- project (jijhzhumjntngwvnmfxf), NOT the shared "invite" project. This table
-- goes there too, next to tennis_state. RLS is ENABLED with NO anon/
-- authenticated policies, so only the server's service_role key can touch it —
-- the same write model as tennis_state.

create table if not exists public.tennis_login_attempts (
  id            text primary key,
  fail_count    int not null default 0,
  first_fail_at timestamptz,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.tennis_login_attempts enable row level security;
