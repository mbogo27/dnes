import { AXES, PHONE_RE, uuid, ok, fail } from './_lib/validate.js';

// POST /api/claim-slot { brand_name, contact_name, whatsapp, bundle_pref?, notes?, session_id? }
// Founding sponsor capture — fixed offer, no payment integration in this
// revision (revision-spec §4). Interest only; deposit is taken manually.
export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail('malformed request');
  }

  const brandName = String(payload.brand_name || '').trim();
  const contactName = String(payload.contact_name || '').trim();
  const whatsapp = String(payload.whatsapp || '').replace(/[\s-]/g, '');
  const bundlePref = payload.bundle_pref ? String(payload.bundle_pref) : null;
  const notes = payload.notes ? String(payload.notes).trim().slice(0, 280) : null;
  const sessionId = payload.session_id ? String(payload.session_id).slice(0, 100) : null;

  if (!brandName) return fail('brand name is required');
  if (!contactName) return fail('contact name is required');
  if (!PHONE_RE.test(whatsapp)) return fail('enter a valid Kenyan WhatsApp number');
  if (bundlePref && !AXES.includes(bundlePref)) return fail('pick one of the six walls, or leave it blank');

  const now = Date.now();
  await env.DB
    .prepare(
      `INSERT INTO slot_claims (id, brand_name, contact_name, whatsapp, bundle_pref, notes, status, session_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'interest', ?, ?)`
    )
    .bind(uuid(), brandName, contactName, whatsapp, bundlePref, notes, sessionId, now)
    .run();

  return ok();
}
