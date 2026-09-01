import { uuid, ok, fail } from './_lib/validate.js';

// POST /api/events  [{ event, ...fields, session_id?, t? }, ...]
// Batched raw events — impressions and everything else the client tracks.
// D1 only, never GA4 (revision-spec §6.4).
export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail('malformed request');
  }

  const events = Array.isArray(payload) ? payload : [payload];
  const valid = events.filter(e => e && typeof e.event === 'string');
  if (!valid.length) return fail('no valid events');

  const now = Date.now();
  const statements = valid.map(e => {
    const { event, session_id, splash_id, post_id, bundle, axis, ...rest } = e;
    return env.DB.prepare(
      'INSERT INTO events (id, name, splash_id, bundle, props_json, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      uuid(), event, splash_id || post_id || null, bundle || axis || null,
      JSON.stringify(rest), session_id ? String(session_id).slice(0, 100) : null, now
    );
  });

  await env.DB.batch(statements);
  return ok({ recorded: valid.length });
}
