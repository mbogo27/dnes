import { HANDLE_RE, PHONE_RE, normalizeHandle, isBlocked, uuid, ok, fail } from './_lib/validate.js';

// POST /api/claim-name { handle, whatsapp, splash_id? }
// Offered *after* a submission succeeds, never inline in that form — the
// nomination must stay frictionless (revision-spec §5). splash_id is
// nullable: this is usually claimed before any splash exists yet.
export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail('malformed request');
  }

  const handle = normalizeHandle(payload.handle);
  const whatsapp = String(payload.whatsapp || '').replace(/[\s-]/g, '');
  const splashId = payload.splash_id ? String(payload.splash_id) : null;

  if (!HANDLE_RE.test(handle)) {
    return fail('name must be 3–22 chars, lowercase letters, numbers, dots or underscores');
  }
  if (await isBlocked(env, handle)) {
    return fail('that name is reserved', 409);
  }
  if (!PHONE_RE.test(whatsapp)) {
    return fail('enter a valid Kenyan WhatsApp number');
  }

  const existing = await env.DB
    .prepare('SELECT id FROM name_claims WHERE handle = ?')
    .bind(handle)
    .first();
  if (existing) {
    return fail('that name is taken', 409);
  }

  const now = Date.now();
  await env.DB
    .prepare('INSERT INTO name_claims (id, splash_id, handle, whatsapp, verified, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .bind(uuid(), splashId, handle, whatsapp, now)
    .run();

  return ok({ handle });
}
