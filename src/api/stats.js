import { json } from './_lib/validate.js';

// GET /api/stats -> { splashes, founding_slots_left }
// SEED_COUNT (a wrangler.toml var) is the archive baked into the client
// bundle — D1 only knows about writes, so the live total is that baseline
// plus approved submissions since (revision-spec §1.3, §4).
export async function onRequestGet({ env }) {
  const seedCount = Number(env.SEED_COUNT || 0);

  const approved = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM submissions WHERE status = 'approved'")
    .first();
  const confirmed = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM slot_claims WHERE status = 'confirmed'")
    .first();

  const splashes = seedCount + (approved ? approved.n : 0);
  const foundingSlotsLeft = Math.max(0, 10 - (confirmed ? confirmed.n : 0));

  return json({ splashes, founding_slots_left: foundingSlotsLeft });
}
