# DOBANESS — MVP Scope

**Status:** pre-launch, interest-gauging
**Target:** Cloudflare (Pages + Workers + D1)
**Primary device:** mid-range Android on metered data, Kenya

---

## 1. What this is

A wall of Kenyan comments. Each one lands as thrown paint — seven to nine words, a name below it, one of six walls it belongs to. You tap through them. You react if something lands. You nominate what deserves to stay up.

The MVP is not a social network. It is a **capture instrument wearing a wall**. Every interaction either teaches the gesture or fills a queue we curate by hand. There is no live UGC, no feed, no accounts, no comment threads.

**What we are actually buying with this build:**

| Signal | Where it comes from |
|---|---|
| Do people want a name here? | Splash It queue volume + name reservation rate |
| Which content actually lands? | Reactions + nominations per post |
| Is the nine-way taxonomy real? | Engagement per stored `origin`, not per displayed axis |
| Will brands pay, and roughly what? | Sponsor leads + bid tier distribution |
| Does the tap-through hold attention? | Splashes per session, session length |

If the build ships and none of those five fill up, the answer is useful and the next thing is cheap.

---

## 2. Scope boundaries

### In

- The wall: splash rendering, motion, tap grammar, six axes
- Reactions (seeded + user, no auth)
- Four actions: Splash It, Nominate, Share, Sponsor a Board
- Three write queues to D1, curated manually
- Name reservation with a blocklist
- Basic analytics event stream
- Share sheet / clipboard fallback

### Out — explicitly, for now

- Accounts, login, sessions, passwords
- Live UGC (everything queued goes through a human)
- Comment threads, replies, follows, DMs
- Payments (sponsor is capture-only)
- Push notifications
- Native apps
- Admin UI (curation runs on SQL + a CLI for v1)
- Image or video posts
- Localisation beyond the Sheng/English mix already in the copy

### Deferred but designed for

- Real reaction counts replacing seeded ones (already a `source` flag)
- Restoring dropped axes from `origin` data (already stored)
- Sponsor self-serve and payment (schema has the bid field)
- Post source attribution surfacing publicly (URL already captured)

---

## 3. Content model

### Displayed register — six

| Key | Title | Emoji |
|---|---|---|
| `mtaa` | Mtaa Vibes | 🏘️ |
| `matatu` | Matatu Diaries | 🚐 |
| `situ` | Situationship Files | 💔 |
| `comr` | Comrades' Corner | 🎓 |
| `bunge` | Ka Bunge | 🏛️ |
| `other` | Others | ✳️ |

### Stored taxonomy — nine

Every post carries an `origin` field holding the original label: Mtaa Vibes, Matatu Diaries, Situationships, Comrades' Corner, Siasa Hub, Football Banter, Biashara Street, Office Chronicles, Showbiz.

**The collapse to six is a display decision, not a data decision.** When you later ask whether Football Banter earned its own wall back, you answer from engagement data rather than a guess. Restoring an axis is a config change.

### Post record

```
id            string    stable hash of handle + body
body          string    7–9 words
handle        string    @name, as it appeared at source
axis          enum      one of the six displayed
origin        string    one of the nine stored
source_url    string    permalink to the original comment
source_platform string  tiktok | instagram | x | facebook | youtube
collected_at  timestamp
```

`source_url` is the hyperlink you flagged early. It is the thread back to the original user, post, and commenter — captured at seed time even though nothing surfaces it yet. Without it, the archive is anonymous and unverifiable; with it, attribution and rights conversations stay possible later.

### Seed content ships in the bundle

The wall's posts are **static, compiled into the HTML**, not fetched. Reasons:

- Zero network round-trip before the first splash — the wall is instant
- Works on a flaky connection, which is the common case
- No read path to secure, cache, or rate-limit
- Content changes are infrequent and ship with a deploy

D1 holds **writes only**. This is the single biggest performance decision in the build.

---

## 4. The splash primitive

### Typography — fixed first, blob second

The rule: **type is constant, the blob is derived.** Never the reverse.

- Body: Arial Black / Archivo Black, 900 weight
- Target size ~27px, modulated ±7% for hand-made feel, per-tier factor of 0.92–1.04
- Never shrinks past 80% of target — if text won't fit, the blob grows
- Line height 1.16
- Wrap chosen from 2–5 candidate line counts, picking the block closest to a 1.5:1 aspect (a blob is roughly round; a wide flat block wastes paint)
- Handle sits **below** the body, at 46% of body size, with a 0.8em gap
- Handle width and position feed the blob sizing, so it never crowds the rim

**Blob sizing constraint.** For each line of width `w` at vertical offset `y`, it fits when:

```
(w/2)² + y² ≤ (rmin · R)²
```

where `rmin` is the blob's minimum vertex radius. Solve per line, take the maximum, add 7% padding. This is exact and far more generous than fitting the whole block into a rectangle.

Acceptance: font range within a tier ≤ 1.2×; zero text corners outside the blob polygon across all posts × viewports.

### Motion

| Phase | Duration | Curve |
|---|---|---|
| Grow | 620ms | easeOutBack |
| Hold | 3000ms ±35% | — |
| Exit | 460ms | easeInCubic |

The ±35% hold jitter matters on multi-splash tiers: identical timers make the wall pulse in unison and read as a slideshow.

On one-at-a-time tiers, advance overlaps outgoing exit and incoming entrance by roughly a third (150ms offset). Sequential reads as a stall; simultaneous reads as a collision.

`prefers-reduced-motion` collapses all transitions to instant.

### Density — two interaction models, not one design at three sizes

| Tier | Condition | Count | Model | Tap means |
|---|---|---|---|---|
| Mobile | width < 720 | 1 | Sequence | Advance |
| Tablet portrait | 720–1099, h ≥ w | 1 | Sequence | Advance |
| Tablet landscape | 720–1099, w > h | 3–6 | Composition | Throw paint here |
| Desktop | ≥ 1100 | 3–6 | Composition | Throw paint here |

Tablet keys off **orientation, not width alone**. Two concurrent splashes was cut: it is neither a sequence nor a composition, and it makes the tap ambiguous — the user cannot tell whether tapping advances or adds.

The composition count is **derived from board area**, not fixed. Because type is held constant, blobs must be free to grow; a hard-coded 6 buries itself on a short window. Formula: `clamp(round(W·H / (π·R²·3.4)), 3, 6)`.

### Tap grammar

- **Tap** — advance (sequence) or throw (composition). One tap, one splash.
- **Tap an action splash** — opens its form
- **Tap a reaction on the rail** — reacts, does not advance
- **Hold** — pause (deferred to v1.1)
- Double-tap is **not** used; the disambiguation delay makes tap-to-advance feel broken
- Keyboard: Space / → advance, Esc closes sheets

**Cut: the lip-bop / blow-detection input.** Mic permission on first load costs conversions before anyone sees a splash, and it fails exactly where the users are — matatu, street, office. Nobody blows raspberries at their phone in public. Keep as an unlockable easter egg if ever.

---

## 5. Reactions

Five: 😂 💀 🔥 👀 🫡

- 0–2 visible per splash; third onward becomes a `+n` chip
- Anchored to the blob **rim on the lower arc**, never over the body copy
- Ride the blob as it breathes and drifts
- Rendered as canvas-drawn glyphs on a white disc — **not GIF, not Lottie**

**On the rendering choice.** The wall is a single canvas. Lottie runs in DOM or its own canvas, which means tracking canvas coordinates with an absolutely-positioned overlay every frame — jank, and it desyncs from the splash it's attached to. If richer animation is wanted later, use a **sprite-sheet atlas** (one WebP, drawn with `image()` sub-rects): one decode, canvas-native, cannot desync. GIF is out on data cost alone.

**Seeded vs real.** Pre-launch there are no users, so seeded reactions are decoration whose job is to *teach the gesture*. Every reaction row carries `source: seeded | user`. Switching to real counts is a flag, not a rewrite.

**Payoff animation.** Tapping the rail flies the emoji onto the rim and adds ~700ms of dwell so you watch it land. That single tween teaches the whole mechanic.

Reactions feed an engagement score. The score sets rotation weight — high-scoring splashes come around more often **for everyone**. Deliberately not live per-session: durations shifting under your own taps reads as jank because the causality isn't perceptible.

---

## 6. The four actions

All four arrive **as splashes**, in the same paint and typography as content. This is the thing that makes it a wall rather than a landing page with a form bolted on. Cadence: every 7th slot, cycling.

Only **Splash It** is duplicated in the bottom nav, because it is the primary conversion and shouldn't depend on waiting for it to cycle around. The others stay splash-only.

### 6.1 Splash It

Claim a name, put 7–9 words on the wall.

| Field | Rule |
|---|---|
| Name | 3–22 chars, `[a-z0-9._]`, lowercased, `@` stripped |
| Axis | select, six options |
| Body | **7–9 words, hard-enforced**, live counter |

- Name checked against reserved blocklist and existing reservations
- Counter states the range on failure: "5 words — needs 7 to 9"
- Submit disabled until valid
- On success: name is held, post joins `splash_queue`

**Reserved blocklist** (non-negotiable — no auth means someone claims `@safaricom` on day one): `admin, dobaness, doba, official, support, mod, moderator, help, root, system, staff, team, ruto, safaricom, mpesa, kplc, equity, ncba, nation, citizen, ktn, police, gov, kenya, statehouse` — plus a live-maintained list in KV.

### 6.2 Nominate a post

- **One tap on the splash**, not a three-field form. Pre-launch, with only seeded content on the wall, the signal we want is *which splash*. The "why" is optional and secondary.
- Captures post `id` automatically
- No personal details requested
- Joins `nominations`

### 6.3 Share Dobaness

`navigator.share` where available, clipboard fallback, toast confirmation. Also lives as the single header CTA.

### 6.4 Sponsor a Board

| Field | Rule |
|---|---|
| Brand | 2–40 chars |
| Phone | Kenyan mobile, `^(?:\+?254\|0)?7\d{8}$` |
| Email | standard validation |
| Message | **7–9 words**, same constraint as everyone |
| Bid | **tier selector**, not a free-text box |

Bid tiers: `KSh 500` · `KSh 2,000` · `KSh 5,000` · `Let's talk`

A blank bid box anchors at zero and produces noise. Tiers give comparable data and anchor upward. Store `null` for "Let's talk".

No payment. Copy states plainly that we'll be in touch.

**The sponsor message is constrained to 7–9 words like everything else** — that is what makes paid splashes look native rather than pasted in.

### Sponsor rotation — frequency, not duration

Paid splashes get **the same 3s hold** and **higher deck weight** (~2.6× in MVP).

A splash that visibly lingers 50% longer is the single most detectable ad tell there is, and users train a skip reflex on it within one session. Weighting gets the sponsor more total impressions, keeps the wall's rhythm constant, and nobody learns "the slow one is the ad."

---

## 7. Forms

Forms **splash out**, they don't pop up: an SVG blob generated from the same vertex code scales in on easeOutBack with a slight rotation, card fades in behind it at +160ms.

They stay **real DOM modals** — focus management, Escape, autofill, and the native keyboard all matter, and matter most on the sponsor form where someone is typing a phone number. Nothing moves into the canvas.

Required for v1: focus trap (Tab must not escape behind the veil). Currently Escape and veil-click close, tabbing leaks.

---

## 8. Layout

```
┌──────────────────────────────────┐
│ DOBANESS              [ Share ]  │  header, 58px + safe-area
│ MTAA VIBES                       │
├──────────────────────────────────┤
│                                  │
│            ( splash )            │  canvas, flex: 1
│                                  │
│      😂  💀  🔥  👀  🫡          │  reaction rail (sequence tiers)
├──────────────────────────────────┤
│  ▦      ◈      ✚       ◍        │  nav, 60px + safe-area
│ Wall   Axes  Splash   About      │
└──────────────────────────────────┘
```

- Header carries logo + current axis + **one** CTA. Two header CTAs plus a bottom nav costs ~150px of a 700px Android viewport, on a screen whose whole appeal is being full-bleed.
- Canvas is bounded by real flex layout, not percentage guesses, so splashes never render under the chrome.
- `env(safe-area-inset-*)` on header and nav for iOS and tall Androids.
- Nav is **navigation**, not a duplicate action bar.

---

## 9. Tech stack — Cloudflare

| Layer | Choice | Why |
|---|---|---|
| Hosting | **Cloudflare Pages** | Static single file, global edge, free tier covers pre-launch |
| API | **Pages Functions** (Workers runtime) | Same repo, same deploy, no separate service |
| Database | **D1** (SQLite at the edge) | Matches the existing SQLite plan; queues are low-volume writes |
| Fast lookups | **Workers KV** | Reserved-name blocklist, feature flags, kill switch |
| Bot defence | **Turnstile** | Invisible, no CAPTCHA friction, free |
| Rate limiting | **Cloudflare Rate Limiting rules** | Per-IP caps on write endpoints, config not code |
| Events | **Analytics Engine** | High-cardinality, high-write-rate event stream; wrong shape for D1 |
| Media (later) | **R2** | Not in MVP |

Cloudflare has a **Nairobi PoP**, so edge latency for the primary audience is good. Verify D1's primary region is set to the closest supported location; D1 writes go to the primary, reads can be local.

**No framework.** The app is one HTML file with inline CSS and JS, no p5, no React, no build step. This is a deliberate performance decision, not laziness — see §11.

### Repo shape

```
/
├── public/
│   └── index.html          the whole app
├── functions/
│   └── api/
│       ├── splash.ts       POST — join splash queue
│       ├── nominate.ts     POST — nominate a post
│       ├── sponsor.ts      POST — sponsor lead
│       ├── react.ts        POST — reaction event
│       └── name.ts         GET  — name availability
├── schema/
│   └── 0001_init.sql
├── seed/
│   └── posts.json          compiled into index.html at deploy
├── scripts/
│   ├── build-seed.mjs      inlines posts.json into the HTML
│   └── curate.mjs          CLI over D1 for the queues
└── wrangler.toml
```

### API

All write endpoints: `POST`, JSON body, Turnstile token required, rate limited, respond `{ ok: true }` or `{ ok: false, error }`.

| Endpoint | Body | Notes |
|---|---|---|
| `GET /api/name?h=` | — | `{ available: bool, reason? }`. Checks KV blocklist then D1. |
| `POST /api/splash` | `handle, axis, body, ts` | Re-validates 7–9 words server-side. Never trust the client counter. |
| `POST /api/nominate` | `post_id, why?` | `why` optional, 160 char cap |
| `POST /api/sponsor` | `brand, phone, email, message, bid_tier` | Re-validates phone and word count |
| `POST /api/react` | `post_id, emoji` | Batched client-side, flushed every ~5s or on page hide |

**Server-side revalidation of every rule is mandatory.** Word counts, name charset, phone format, blocklist. The client checks are UX; the Worker checks are the actual constraint.

### D1 schema

```sql
CREATE TABLE name_reservations (
  handle      TEXT PRIMARY KEY,          -- lowercased, no @
  claimed_at  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'held',  -- held | approved | rejected
  ip_hash     TEXT
);

CREATE TABLE splash_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  handle      TEXT NOT NULL,
  axis        TEXT NOT NULL,
  body        TEXT NOT NULL,
  word_count  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at  INTEGER NOT NULL,
  ip_hash     TEXT,
  ua_hash     TEXT
);

CREATE TABLE nominations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     TEXT NOT NULL,
  why         TEXT,
  created_at  INTEGER NOT NULL,
  ip_hash     TEXT
);
CREATE INDEX idx_nom_post ON nominations(post_id);

CREATE TABLE sponsor_leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  brand       TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  bid_tier    INTEGER,                   -- NULL = "let's talk"
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  INTEGER NOT NULL
);

CREATE TABLE reaction_totals (
  post_id     TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  source      TEXT NOT NULL,             -- seeded | user
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, emoji, source)
);
```

IP is stored **hashed with a rotating salt**, for abuse throttling only. Do not store raw IPs.

### Curation workflow (v1, no admin UI)

```
wrangler d1 execute dobaness --command \
  "SELECT * FROM splash_queue WHERE status='pending' ORDER BY created_at"
```

`scripts/curate.mjs` wraps approve/reject and, on approve, appends to `seed/posts.json` for the next deploy. Manual and deliberate — an admin UI is not MVP.

---

## 10. Analytics events

Written to Analytics Engine, not D1.

| Event | Fields |
|---|---|
| `splash_shown` | post_id, axis, origin, tier, is_sponsor |
| `splash_advanced` | post_id, dwell_ms, method (tap/timer) |
| `reaction` | post_id, emoji |
| `action_opened` | action (splash/nom/share/spon) |
| `action_completed` | action |
| `axis_selected` | axis |
| `session` | tier, splashes_seen, duration_ms |

`origin` on `splash_shown` is what tells you whether the collapsed axes deserve to come back.

---

## 11. Performance budget

Non-negotiable, because the audience is on metered data and mid-range Android.

| Metric | Budget |
|---|---|
| Total transfer, first load | **< 60 KB** gzipped |
| JS | 0 KB external (all inline, no framework, no p5) |
| Time to first splash | < 800ms on 3G |
| Frame rate | 60fps on a 2019-era mid-range Android |
| Fonts | System stack only — no web font download |

Rules:

- Animate **opacity and transform only**. Blur and `filter` transitions drop frames badly on mid-range Android.
- Canvas backed by `devicePixelRatio` capped at 2.
- Cancel the RAF loop on `visibilitychange` — never burn battery in a background tab.
- Board texture generated once and cached, regenerated only on resize.
- Reaction events batched client-side, flushed on a timer or `pagehide`.

---

## 12. Accessibility

- All actions reachable by keyboard; Space/→ advances the wall
- Focus trap in sheets (**outstanding**)
- Visible focus rings, gold on the dark chrome, ink on the light cards
- `prefers-reduced-motion` collapses animation to instant
- Form fields have real `<label>` elements, correct `autocomplete` and `inputmode`
- Toast is `role="status"`
- Sheets are `role="dialog" aria-modal="true"`

The canvas wall is inherently visual. A text-list fallback of the current axis is a v1.1 item, not MVP.

---

## 13. Safety and abuse

| Risk | Mitigation |
|---|---|
| Name squatting / impersonation | Reserved blocklist in KV, live-maintained |
| Form spam | Turnstile + per-IP rate limits |
| Offensive queued content | Nothing goes live without human curation — this is the whole reason for the queue |
| Ka Bunge political content | Same curation gate. Kenyan political speech is live territory; the queue is the control, and it should stay strict. |
| Scraped-content rights | `source_url` captured on every seeded post so attribution and takedown are possible |

---

## 14. Build phases

**Phase 1 — the wall** (done in prototype)
Splash engine, text-first sizing, tap grammar, tier density, reactions, six axes, four action splashes, forms as splash-out modals. Client-side only, in-memory queue.

**Phase 2 — the spine**
Cloudflare Pages deploy, D1 schema, five API endpoints, Turnstile, rate limiting, server-side revalidation. Replace the in-memory `__DOBANESS_QUEUE` stub with real posts.

**Phase 3 — the instruments**
Analytics Engine events, reaction batching, engagement-weighted rotation, `curate.mjs`.

**Phase 4 — the loop**
Approve first real user splashes into the seed, ship, watch whether the queue refills. This is the actual test.

---

## 15. Open decisions

1. **Hold-to-pause** — borrowed from Stories, essentially free, but adds a gesture to disambiguate against tap. In or out for v1?
2. **Axis persistence** — should a selected axis survive a reload, or does the wall always open on everything?
3. **Nomination without a visible post** — if someone taps the Nominate action splash while no post is on screen, currently it prompts them to pick one. Better: queue the *previous* post.
4. **Seeded reaction honesty** — do we ever disclose that pre-launch counts are seeded? Recommend yes, in About, one line.
5. **Sponsor weight ceiling** — 2.6× is a guess. Needs a rule tied to the ratio of paid to organic slots so the wall never tips past ~1 in 8.
6. **Domain** — `.co.ke` or `.com`? Given the audience is Kenyan and the content is Sheng, `.co.ke` argues for itself here even though the venture side sits on `.com`.

---

## Appendix A — Additional seed posts

24 posts, all 7–9 words, in the same voice as the existing set. `source_url` and `source_platform` left blank; fill at collection time.

### Mtaa Vibes

| Handle | Body | Words |
|---|---|---|
| `@plot_ya_tatu` | landlord akipiga kengele kabla ya tarehe tano | 7 |
| `@mtaa_watch` | kila mtu kwa hii plot anajua story yako | 8 |
| `@bila_maji` | maji imekatika lakini bill inakuja kama kawaida | 7 |
| `@usingizi_ni_ndoto` | jirani anacheza gospel saa nane ya usiku | 7 |
| `@mama_mboga_hq` | mama mboga ndio bank ya mwisho mtaani | 7 |

### Matatu Diaries

| Handle | Body | Words |
|---|---|---|
| `@stage_ya_ngara` | condakta ananiambia nishuke gari bado inaenda kasi | 7 |
| `@subwoofer_ke` | sound system ni kubwa kuliko injini yenyewe | 7 |
| `@change_yangu` | amelipa fifty anataka change ya twenty tano | 7 |
| `@thika_road_daily` | traffic ya Thika road ni sehemu ya maisha | 8 |
| `@mlango_wa_gari` | ukikaa mlango uko na kazi ya kufungua | 7 |

### Situationship Files

| Handle | Body | Words |
|---|---|---|
| `@status_ni_single` | ananiambia tuko poa status yake ni single | 7 |
| `@saa_nne_text` | amenitext saa nne anasema alikuwa amelala mapema | 7 |
| `@bila_title` | tumekuwa tunaenda date miezi sita bila title | 7 |
| `@bestie_alert` | akikuita bestie ujue umefika mwisho wa safari | 7 |

### Comrades' Corner

| Handle | Body | Words |
|---|---|---|
| `@group_assignment` | group assignment ni mtu mmoja na majina saba | 8 |
| `@helb_imeingia` | HELB imeingia leo kesho tunarudi kwa maandazi | 7 |
| `@class_ya_saa_mbili` | lecturer amecancel class baada ya kila mtu kufika | 8 |
| `@attachment_life` | attachment ya miezi tatu allowance ya wiki moja | 8 |

### Ka Bunge

| Handle | Body | Words |
|---|---|---|
| `@barabara_bado` | wameahidi barabara tangu nilikuwa shule ya msingi | 7 |
| `@maji_ya_kura` | kila uchaguzi tunapewa maji baadaye inakauka tena | 7 |
| `@miaka_mitano` | mheshimiwa anakuja mtaa mara moja kila miaka mitano | 8 |

### Others

| Handle | Body | Origin | Words |
|---|---|---|---|
| `@fare_imepanda` | bei ya mafuta imepanda boda amepandisha fare mara mbili | Biashara Street | 9 |
| `@insta_biz` | mtu anauza soksi kwa instagram anaitwa entrepreneur | Biashara Street | 7 |
| `@keeper_wetu` | keeper wetu ana hands za kununua sukari | Football Banter | 7 |
| `@group_imekimya` | derby imeisha group ya WhatsApp imekuwa kimya ghafla | Football Banter | 8 |
| `@update_ya_jana` | boss ananiuliza update ya kitu aliniambia jana jioni | Office Chronicles | 8 |
| `@jumamosi_ni_kazi` | team building ni kazi ya siku ya Jumamosi | Office Chronicles | 8 |
| `@streams_ziko_wapi` | kila artist ana album hakuna anayeskiza mpaka mwisho | Showbiz | 8 |

> Note: commas were dropped from several bodies above so word counts stay unambiguous against a `split(/\s+/)` counter. Add punctuation back only if the counter is updated to match.

---

## Appendix B — Decisions log

Choices made during design that are easy to accidentally reverse later.

| Decision | Rationale |
|---|---|
| Nine axes collapsed to six | Nine walls pre-launch each look abandoned; density is the appeal |
| `origin` retained on every post | Collapse the display, never the data |
| Nominate is one tap, not a form | ~10× the volume for the same curation signal |
| Bid tiers, not a free-text box | A blank box anchors at zero and yields noise |
| Sponsors get frequency, not dwell | Longer dwell is the loudest possible ad tell |
| Type fixed, blob derived | Old approach let font vary ~9× between adjacent splashes |
| Handle below body, not above | Reads as attribution; above, it competes with the line |
| Tablet keys on orientation | 1–2 splashes is neither sequence nor composition |
| Desktop count derived from area | Fixed 6 buries itself when type is held constant |
| No p5, no framework | ~900KB saved on a metered-data audience |
| Seed posts compiled into the bundle | Instant first splash, no read path to secure |
| Lip-bop input cut | Mic permission before first value; fails in public |
| Actions render as splashes | The thing that makes it a wall, not a landing page |
| Only Splash It duplicated in nav | Primary conversion shouldn't wait for rotation |
