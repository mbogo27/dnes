import { uuid, ok, fail } from './_lib/validate.js';

// POST /api/share { splash_id?, session_id? } -> { ok, url }
// Mints a share token so an inbound WhatsApp visit is visible as a
// share_return event rather than silence (revision-spec §6.3).
export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json().catch(() => ({}));
  } catch {
    payload = {};
  }

  const splashId = payload.splash_id ? String(payload.splash_id) : null;
  const sessionId = payload.session_id ? String(payload.session_id).slice(0, 100) : null;
  const token = uuid().replace(/-/g, '').slice(0, 12);
  const now = Date.now();

  await env.DB
    .prepare('INSERT INTO shares (id, share_token, splash_id, channel, session_id, created_at) VALUES (?, ?, ?, NULL, ?, ?)')
    .bind(uuid(), token, splashId, sessionId, now)
    .run();

  const url = new URL(request.url);
  const shareUrl = `${url.origin}/${splashId ? `?s=${encodeURIComponent(splashId)}&r=${token}` : `?r=${token}`}`;
  return ok({ url: shareUrl, share_token: token });
}
