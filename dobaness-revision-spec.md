# DOBANESS — Revision Spec v2 (pre-launch)

**Target:** `dobaness.com` (already registered, DNS on Cloudflare)
**Stack:** Cloudflare Pages (static + p5.js front end) + Workers (API) + D1 (storage)
**Scope of this revision:** intro screen rebuild, wall-screen fixes, new seed content, founding-sponsor copy, D1 capture for all actions, GA4 event tracking, test pass.

Keep the existing visual identity: dark background (`#141518`-ish), generative gradient splash blobs with white outline + text shadow, sand-toned wall canvas, orange CTA gradient. Do not redesign the aesthetic. Everything below is correction and addition.

---

## 1. Intro screen

### 1.1 Layout

| Property | Desktop | Mobile |
|---|---|---|
| Outer container max-width | `1200px` (must equal the wall canvas content width) | `100vw - 32px` |
| Text measure (paragraphs) | `60ch`, centred inside the container | full width |
| Welcome splash render box | `540 × 540px` | `280 × 280px` |
| Padding around splash bbox | `80px` all sides | `24px` all sides |

**Critical fix — the splash is currently clipped.** The welcome blob is rendered into a container narrower than the blob's bounding box, so its top and left edges are cut off.

Required behaviour:
1. Generate the blob, compute its actual bounding box.
2. Fit-to-container: scale the blob so `bbox * scale` fits inside `renderBox - padding` on both axes.
3. Centre it on both axes inside the render box.
4. Container must be `overflow: visible`, or the SVG/canvas viewBox must include the padding.

Do **not** hardcode a blob size. The blobs are generative — a fixed size will clip a different blob shape tomorrow. Fit-to-bbox every render.

### 1.2 Splash label

- The welcome splash carries the text **`karibu Dobaness`** (as now).
- **Remove the `OTHERS` bundle pill.** The welcome splash is not a bundle.
- Replace it with the pre-launch status line, styled like a pill but in the muted/secondary treatment:

```
PRE-LAUNCH
```

### 1.3 Copy

Replace all intro copy with the following. Sentence case where shown; keep `DOBANESS` uppercase as the wordmark only.

```
DOBANESS

A wall of Kenyan comments, curated by hand.

Pre-launch — {N} splashes up. Nothing posts automatically.
```

`{N}` is live: fetch from `GET /api/stats` (see §6.4). If the fetch fails or is slow, render the last known count baked at build time — never render `0`, never render a spinner in the sentence.

Then the interaction block — this is new and mandatory. Three lines, icon + text, left-aligned as a block but the block itself centred:

```
🔥  Tap a splash to react
✍️  Spot a good comment? Add it to the wall
🟠  Brand? Claim a slot
```

Then the CTA button (unchanged style):

```
ENTER THE WALL
```

Then, **below** the button, the privacy note (moved down from its current position, tightened):

```
Handles shown as collected, or anonymised. We ask for a WhatsApp number
only if you claim a name or a slot. Never shared, deleted on request.
```

### 1.4 Type scale

| Element | Desktop | Mobile | Weight |
|---|---|---|---|
| `DOBANESS` wordmark | 44px | 32px | 800 |
| Tagline | 20px | 17px | 400 |
| Pre-launch status line | 18px | 15px | 600 |
| Interaction lines | 16px | 15px | 400 |
| Privacy note | 14px | 13px | 400, muted |

Current text is too small across the board — this table is the fix, not a suggestion.

### 1.5 Mobile

The blob, wordmark, tagline, status line and the `ENTER THE WALL` button must all be above the fold on a 390×844 viewport. The interaction block and privacy note may fall below.

---

## 2. Wall screen

### 2.1 Text-box collision (highest priority bug)

Splashes currently overlap so that text is unreadable — one blob covers another blob's comment.

Rule: **blob outlines may overlap freely; text boxes may never overlap.**

Implementation:
- Every splash owns a `textRect` (the bounding box of its rendered comment + handle pill).
- Placement algorithm: propose a position, reject it if `textRect` intersects any placed `textRect` inflated by a 12px margin. Retry up to N attempts, then expand the wall bounds and retry.
- Add a drop shadow to each blob so stacking reads as intentional: `0 8px 24px rgba(0,0,0,0.25)`.
- Maintain an explicit z-order (insertion order is fine); the top blob wins on outline overlap.

### 2.2 Reaction chips

Currently the 🔥 / ❤️ / 👎 chips float unanchored and it is unclear which splash they belong to.

Required:
- Each chip is anchored to its owning blob — positioned along the blob's edge, within 16px of the outline, clustered on the lower-right arc.
- Maximum three chip types per splash, each with a count when count > 0.
- Chips are tappable and are the react affordance. Tapping a chip increments and animates (scale pop, ~150ms). Tapping the blob body opens/expands the splash.
- One optimistic UI update, then POST. If the POST fails, roll the count back silently.

### 2.3 Button hierarchy

Flip the current weights:

- **`Add to the wall`** — primary. Orange gradient, full strength.
- **`Claim a slot`** — secondary. Outlined / dark fill, same width as primary.
- Equal widths, side by side on desktop; stacked on mobile with `Add to the wall` on top.

Brands arrive from a direct pitch, not from browsing. Add a deep link `dobaness.com/claim` that loads the wall and opens the slot modal immediately, so the sales conversation has its own entry point.

### 2.4 First-visit hint

One-time coach mark on first wall entry: a small toast near the centre reading `Tap a splash to react 🔥`. Dismiss on first tap or after 4s. Persist dismissal in `localStorage` under `dbn_hint_seen`.

---

## 3. Seed content

Add the following 12 posts to the seed set. Store `handle` exactly as written, including emoji and non-ASCII characters — ensure UTF-8 end to end (D1 column, Worker response headers, font fallback for emoji in the handle pill).

| Handle | Text | Bundle |
|---|---|---|
| `@lewy` | mapenzi ni kama matatu ukiachwa songa kwa next | Situationship Files |
| `@papichulo¥RN🐐` | toxicc on collabo is wild😅 | Others |
| `@steve` | hii ni rare kaa rangi mpya kamiti | Mtaa Vibes |
| `@KinyuaNick_` | Salaale! Mambo gani haya😂😂😂 | Others |
| `@Snowy_Kone` | Tulia morio upangwe😂😂😂 | Mtaa Vibes |
| `@LoffeSinexx🔥` | R.I.P stoopid boy 😭inauma sana baby mama akifika hapa atafeel aje | Others |
| `@Pearl` | mihadarati ni mbaya sana hope vijana you have learnt | Mtaa Vibes |
| `@pablo` | ishai shuka kwa jam then zikafunguliwa😂 | Matatu Diaries |
| `@Nadira` | Watu wa Ngong rd hawajui hapa ni wapi | Matatu Diaries |
| `@nickieee001` | Pia mimi nadai imezwe what are you saying | Situationship Files |
| `@sir_chrisz` | Hutaki tuenjoy greatness | Mtaa Vibes |
| `@Rchemistt` | Ukipewa chance najua huwezi kataa | Situationship Files |

Notes for the implementer:
- The three posts tagged showbiz map to **Others** (Showbiz was absorbed into Others).
- Four posts were untagged and have been assigned above by reading — `@lewy`, `@steve`, `@KinyuaNick_`, `@Snowy_Kone`. Flag these in the PR so Mbogo can override.
- **Length:** several of these exceed the 7–9 word limit that applies to the *Add to the wall* form. That limit is a submission constraint, not a rendering constraint. The text renderer must lay out up to ~16 words inside a blob without overflowing the outline — auto-shrink font size in steps down to a floor, then wrap to more lines, then grow the blob. Test specifically against the `@LoffeSinexx🔥` post, which is the longest.

---

## 4. Founding sponsor

Replace the current bid-tier copy in the `Claim a slot` modal with a fixed offer.

```
Founding sponsor — 10 slots

KES 10,000 for 12 months, locked.
Rate after launch: KES 3,000/month.

Hold a slot with a KES 1,000 M-Pesa deposit — deducted from the fee,
refunded in full if we don't launch by {LAUNCH_DATE}.
```

`{LAUNCH_DATE}` — Mbogo to fill before deploy. Do not ship with a placeholder visible.

Fields captured by the form:

| Field | Required | Notes |
|---|---|---|
| Brand name | yes | |
| Contact name | yes | |
| WhatsApp number | yes | Kenyan format validation, store E.164 |
| Preferred bundle | no | select from the 6 bundles, or "no preference" |
| Notes | no | free text, 280 char cap |

**No payment integration in this revision.** The form captures interest; Mbogo follows up on WhatsApp and takes the deposit manually. Nothing in the copy should imply payment happens on-site.

Also show a live remaining count: `{10 - claimed} of 10 founding slots left`, derived from `slot_claims` where `status = 'confirmed'`. Scarcity is the point.

**Taskbee is sponsor zero and sits outside the ten.** Render it as a real brand splash on the wall with a `SPONSOR ZERO` pill, and exclude it from the founding-slot count.

---

## 5. Contributor copy

`Add to the wall` modal:

```
Add to the wall

Heard something too good to lose? Put it up.
Your name stays on every splash you spot — and we're counting.
Early spotters keep their record when the wall opens properly.
```

Form fields as currently built (comment text 7–9 words, optional source, optional name claim with WhatsApp offered *after* submission — do not ask up front).

Post-submit confirmation:

```
Up for review. Nothing goes on the wall automatically —
we read everything first.
```

Name-claim prompt shown after a successful submission:

```
Want the credit? Claim your name and we'll tag you when it lands.
```

---

## 6. Data capture (D1)

Everything is written now; the reading interface comes later. Build the schema and the write path only.

### 6.1 Schema

```sql
CREATE TABLE submissions (
  id            TEXT PRIMARY KEY,
  text          TEXT NOT NULL,
  handle        TEXT,
  bundle        TEXT,
  source_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  session_id    TEXT,
  ip_hash       TEXT,
  user_agent    TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE reactions (
  id            TEXT PRIMARY KEY,
  splash_id     TEXT NOT NULL,
  bundle        TEXT,
  reaction      TEXT NOT NULL,                    -- fire | heart | down
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_reactions_splash ON reactions(splash_id);

CREATE TABLE slot_claims (
  id            TEXT PRIMARY KEY,
  brand_name    TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,
  bundle_pref   TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'interest', -- interest | confirmed | declined
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE name_claims (
  id            TEXT PRIMARY KEY,
  splash_id     TEXT NOT NULL,
  handle        TEXT,
  whatsapp      TEXT NOT NULL,
  verified      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE shares (
  id            TEXT PRIMARY KEY,
  share_token   TEXT NOT NULL UNIQUE,
  splash_id     TEXT,                             -- null = whole wall
  channel       TEXT,                             -- whatsapp | copy_link | x | other
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_shares_token ON shares(share_token);

CREATE TABLE events (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  splash_id     TEXT,
  bundle        TEXT,
  props_json    TEXT,
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_events_name_time ON events(name, created_at);
```

### 6.2 Worker routes

| Route | Method | Purpose |
|---|---|---|
| `/api/submit` | POST | Add to the wall |
| `/api/react` | POST | Reaction |
| `/api/claim-slot` | POST | Brand slot interest |
| `/api/claim-name` | POST | Name claim |
| `/api/share` | POST | Mint a share token, return the share URL |
| `/api/events` | POST | Batched raw events (impressions etc.) |
| `/api/stats` | GET | `{ splashes: N, founding_slots_left: M }` |

### 6.3 Share tokens

`/api/share` mints a token and returns `https://dobaness.com/?s={splash_id}&r={share_token}`. On page load, if `r` is present, write a `share_return` row into `events` with the token in `props_json` and strip the params from the URL with `history.replaceState`. Without this, WhatsApp shares are invisible.

### 6.4 Impressions

A splash counts as viewed when ≥50% of its bounds sit inside the viewport for ≥1 continuous second, deduped once per splash per session. Compute in the p5 draw loop — there is no DOM element, so `IntersectionObserver` will not work here.

Buffer events client-side, flush every 5s and on `visibilitychange` via `navigator.sendBeacon` to `/api/events`. **Impressions go to D1 only, never to GA4** (volume + GA's event limits).

### 6.5 Abuse control

Per-session and per-IP-hash caps on `/api/submit`, `/api/react`, `/api/claim-slot`. Hash IPs with a salt from an environment secret; do not store raw IPs. Cloudflare Turnstile is out of scope for this revision — note it as a follow-up.

---

## 7. Google Analytics 4

Add to `<head>` on every page:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-G9THQ97CJE"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-G9THQ97CJE');
</script>
```

### 7.1 Event taxonomy

Fire these alongside the D1 writes — GA gets discrete actions, D1 gets everything.

| GA4 event | Parameters | Fires when |
|---|---|---|
| `wall_enter` | — | `ENTER THE WALL` tapped |
| `splash_tap` | `splash_id`, `bundle` | Blob body tapped |
| `splash_react` | `splash_id`, `bundle`, `reaction` | Reaction chip tapped |
| `share_click` | `channel`, `splash_id` | Share initiated |
| `share_return` | `share_token` | Inbound visit with `?r=` |
| `submit_start` | — | Add-to-wall modal opened |
| `submit_complete` | `bundle` | Submission accepted |
| `name_claim_start` | `splash_id` | Claim prompt shown/tapped |
| `name_claim_complete` | `splash_id` | WhatsApp number submitted |
| `slot_claim_start` | `entry` (`button` or `deeplink`) | Slot modal opened |
| `slot_claim_complete` | `bundle_pref` | Slot form submitted |

Constraints to respect: parameter names ≤40 chars, values ≤100 chars, ≤25 params per event. Custom parameters must be registered as custom dimensions in the GA4 UI before they show in reports — list the ones above in the PR description so Mbogo can register them.

Do **not** send `whatsapp`, `brand_name`, `contact_name` or any free text to GA. Those live in D1 only.

---

## 8. Test pass

All of the below must pass before deploy.

**Automated** (`vitest` + `wrangler dev` against a local D1):
- Each API route: happy path, missing required field, oversized payload, rate-limit trip.
- `/api/stats` returns correct counts against a seeded DB.
- Share token round trip: mint → visit with `?r=` → `share_return` row written.
- UTF-8 integrity: insert and read back `@papichulo¥RN🐐` and `@LoffeSinexx🔥` unchanged.
- Text-box collision: place 40 splashes, assert zero `textRect` intersections.
- Blob fit: for 100 generated blobs, assert bbox fits inside the render box with padding intact.

**Manual QA:**
- Intro renders with no clipped splash at 1920, 1440, 1024, 768, 390 widths.
- Live splash count renders; kill the API and confirm the fallback number shows, not `0`.
- Longest seed post (`@LoffeSinexx🔥`) renders fully inside its blob at all breakpoints.
- Reaction chip anchors to the correct splash; count increments; rollback on forced API failure.
- Coach mark shows once, then never again after reload.
- `dobaness.com/claim` opens the slot modal directly.
- All three flows write rows — check D1 directly with `wrangler d1 execute`.
- GA4 DebugView shows every event in §7.1 firing with correct params.
- Mobile: intro CTA above the fold on 390×844; buttons stacked; canvas pans without page scroll fighting it.

---

## 9. Out of scope

Admin/read interface, payment integration, leaderboard and karma, brand-owned boards, rollup tables, Turnstile. Note them in the README as the next tranche.
