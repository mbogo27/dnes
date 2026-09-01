import { REACTIONS, uuid, ok, fail } from './_lib/validate.js';

// POST /api/react  [{ post_id, emoji, bundle?, session_id? }, ...]
// Plain event log — every row is a real reaction (revision-spec §6.1).
export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail('malformed request');
  }

  const events = Array.isArray(payload) ? payload : [payload];
  const valid = events.filter(e =>
    e && typeof e.post_id === 'string' && e.post_id && REACTIONS.includes(e.emoji)
  );
  if (!valid.length) return fail('no valid reaction events');

  const now = Date.now();
  const statements = valid.map(e =>
    env.DB.prepare(
      'INSERT INTO reactions (id, splash_id, bundle, reaction, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(uuid(), e.post_id, e.bundle || null, e.emoji, e.session_id ? String(e.session_id).slice(0, 100) : null, now)
  );

  await env.DB.batch(statements);
  return ok({ recorded: valid.length });
}
