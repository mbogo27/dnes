// Server-side revalidation of every rule the client already checks.
// "The client checks are UX; the Worker checks are the actual constraint." — scope §9

export const AXES = ['mtaa', 'matatu', 'situ', 'comr', 'bunge', 'other'];

export const HANDLE_RE = /^[a-z0-9._]{3,22}$/;
export const PHONE_RE = /^(?:\+?254|0)?7\d{8}$/;

export const BID_TIERS = [500, 2000, 5000, null]; // null = "Let's talk"

// Three, identical on every splash — change-spec v2 §2. No email anywhere
// in this pass (sponsor leads and claims are WhatsApp-only, §9).
export const REACTIONS = ['fire', 'heart', 'down'];

// Live-maintained core; KV BLOCKLIST layers on top of this at request time.
export const STATIC_BLOCKLIST = [
  'admin', 'dobaness', 'doba', 'official', 'support', 'mod', 'moderator',
  'help', 'root', 'system', 'staff', 'team', 'ruto', 'safaricom', 'mpesa',
  'kplc', 'equity', 'ncba', 'nation', 'citizen', 'ktn', 'police', 'gov',
  'kenya', 'statehouse',
];

export function wordCount(body) {
  return String(body || '').trim().split(/\s+/).filter(Boolean).length;
}

export function normalizeHandle(raw) {
  return String(raw || '').trim().replace(/^@/, '').toLowerCase();
}

export async function isBlocked(env, handle) {
  if (STATIC_BLOCKLIST.includes(handle)) return true;
  if (env.BLOCKLIST) {
    const hit = await env.BLOCKLIST.get('handle:' + handle);
    if (hit) return true;
  }
  return false;
}

export async function saltedHash(env, value) {
  const salt = env.IP_SALT || 'dev-salt';
  const data = new TextEncoder().encode(salt + ':' + value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function ipHash(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  return saltedHash(env, ip);
}

export function uaHash(env, request) {
  const ua = request.headers.get('User-Agent') || '';
  return ua ? saltedHash(env, ua) : Promise.resolve(null);
}

// submissions.user_agent is a raw string column (§6.1), unlike ip_hash which
// is always hashed (§6.5) — never store a raw IP, but the UA string itself
// isn't identity-sensitive the same way.
export function rawUserAgent(request) {
  return (request.headers.get('User-Agent') || '').slice(0, 300);
}

export function uuid() {
  return crypto.randomUUID();
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function ok(extra = {}) {
  return json(Object.assign({ ok: true }, extra));
}

export function fail(error, status = 400) {
  return json({ ok: false, error }, status);
}
