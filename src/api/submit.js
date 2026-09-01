import { AXES, wordCount, ipHash, rawUserAgent, uuid, ok, fail } from './_lib/validate.js';

// POST /api/submit { body, axis, seen_at?, session_id? }
// "Add to the wall" — zero PII at this stage (revision-spec §5). Naming
// yourself is a separate, later step via /api/claim-name.
export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail('malformed request');
  }

  const text = String(payload.body || '').trim();
  const bundle = String(payload.axis || '');
  const seenAt = payload.seen_at ? String(payload.seen_at).trim().slice(0, 300) : null;
  const sessionId = payload.session_id ? String(payload.session_id).slice(0, 100) : null;
  const wc = wordCount(text);

  if (!AXES.includes(bundle)) {
    return fail('pick one of the six walls');
  }
  if (wc < 7 || wc > 9) {
    return fail(wc + ' words — needs 7 to 9');
  }

  const now = Date.now();
  const hash = await ipHash(env, request);

  await env.DB
    .prepare(
      `INSERT INTO submissions (id, text, handle, bundle, source_url, status, session_id, ip_hash, user_agent, created_at)
       VALUES (?, ?, NULL, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .bind(uuid(), text, bundle, seenAt, sessionId, hash, rawUserAgent(request), now)
    .run();

  return ok();
}
