# DOBANESS — Change Spec v2

**Against:** current prototype (`dobaness.html`)
**Nature:** narrowing. Fewer surfaces, more capture.
**Deploy target:** unchanged — Cloudflare Pages + Workers + D1

---

## 0. Summary

| | Before | After |
|---|---|---|
| Axes | 6 walls, filterable, own sheet | Pill on the splash. No filtering, no sheet. |
| Reactions | 5 emoji, decorative + user | 3 emoji, clickable, toggleable, affects dwell |
| Emoji splashes | Standalone splash type | Removed |
| Actions | 4 (Splash It, Nominate, Share, Sponsor) | 3 (Share top; Add to the wall + Claim a slot bottom) |
| Bottom nav | 4-item navigation bar | 2 action buttons |
| Forms | Opened cold from a splash | Side widget first, then form |
| Desktop layout | Full-bleed | 65% centred column |
| Type | Narrow band, tier-scaled | Two fixed sizes, identical on every device |
| Entry | Straight to wall | Intro screen |

Net: three fewer surfaces, one new one (the widget), and a wall that does one thing.

---

## 1. Removals

Delete outright:

- `sheet-axes` and the whole axis-filter mechanism (`axisFilter`, `paintAxes`, `buildDeck` filtering, header axis label)
- The 4-item `#nav`, replaced by a 2-button bar
- The standalone sticker/emoji splash type
- Seeded decorative reactions (`source: seeded`) — every reaction is now a real user action
- `sheet-splash` in its current form (renamed and re-scoped, see §7)
- The `Wall` and `About` nav items — About moves into the intro screen

Keep in the data layer even though it leaves the UI: **`axis` and `origin` stay on every post.** The pill needs `axis`; `origin` is what tells you later whether Football Banter earned its own wall back.

---

## 2. Reactions

### Set

| Emoji | Means | Signal |
|---|---|---|
| 🔥 | this is legendary / has been going | Peak — the thing worth featuring |
| ❤️ | I like this / I feel this | Warm — relatable, true |
| 👎 | this didn't land | Cut candidate |

Three, identical on every splash, in this order. Do not vary the set per splash or per axis — an emoji offered on 40% of splashes will out-score one offered on 15% regardless of sentiment, and you'd be measuring your own garnish choices.

No skin-tone modifiers. Unmodified emoji render more consistently and a personalised negative gesture is a strange note.

### Behaviour

```
default        →  three emoji visible on the blob rim
tap one        →  it pops outward along the rim and enlarges
                  the other two disappear
                  +1.2s dwell bonus, once per splash
tap it again   →  reaction removed, all three reappear instantly
                  dwell bonus is NOT reclaimed
```

Rules:

- **Single choice.** Selecting is exclusive; there is no multi-react.
- **Bonus is one-time and non-cumulative.** React, un-react, re-react = one bonus total. Otherwise a user who reacts to everything grinds the wall to a stop.
- **Re-expansion is instant, not animated.** The un-react window is ~1.5s in practice; nobody wants to watch three emoji fade back in.
- **Pop outward, not in place.** The enlarged emoji moves further along the rim so it never lands over the body text.
- 1.2s rather than 1s: the pop animation itself eats ~400ms, so a flat second leaves almost no beat to enjoy it.

### Placement

Rim only, on the lower arc, clear of the type. Positions stay fixed relative to the blob so they travel with it as it breathes.

### Dwell model

| Input | Effect |
|---|---|
| React | +1.2s, once |
| Hold | Pause while held. **Pause, don't reset** — resetting punishes looking closer. |
| Tap the splash body | Dismiss immediately (see §3) |

---

## 3. Tap grammar — unified

The current grammar has one rule for one-up and another for many-up. Replace both with a single rule that works at any count:

> **Tapping a splash dismisses it and pulls the next one.**

| Target | Result |
|---|---|
| Splash body | That splash exits, next enters in its place |
| Emoji on a splash | React / un-react. Does not dismiss. |
| Widget button inside a sponsor splash | Opens the side widget. Does not dismiss. |
| Empty wall | Nothing |
| Bottom buttons | Their own action |

Why this is better than "tap anywhere advances": at 2–3 splashes, "advance" has no referent — advance *which one*? Tap-to-dismiss is unambiguous at every count and reads as physical.

### Sponsor splashes need a visible affordance

Tap-to-dismiss must never be violated by surprise. A sponsor splash contains a small explicit button (a pill reading `More` or `See slot`) inside the blob. Tapping the paint around it still dismisses; tapping the button opens the widget.

If some blobs dismiss and others open a panel with no visual difference, the wall feels broken.

### Keyboard

`→` / `Space` dismiss the oldest splash. `1` `2` `3` react. `Esc` closes widgets and forms.

---

## 4. Type and blob sizing

### Consistent across devices — with one deliberate exception

Same post = same font size = same blob, on a phone and on a desktop. This is what makes the motion portable to social (§10).

Two sizes only:

| Class | Applies to | Size |
|---|---|---|
| Standard | 5+ words | 27px |
| Short-form | ≤ 4 words | 35px (1.3×) |

Both are absolute and identical on every device. The only scaling is a **floor below 360px viewport width**, where type scales proportionally so a blob still fits. One narrow exception, not a per-tier scale.

### Why a short-form size exists

About a third of your collected archive is under five words — "Usitakejua", "ni uchungu sana", "najua mko huku". With fixed type, blob size derives from text length, so a three-word post makes a small blob at exactly the moment you want splashes filling the screen.

Two mechanisms together:

1. **Short-form type at 1.3×** — punchy lines read as punchy, not as an afterthought
2. **Minimum blob radius: 0.30 × the board's shorter dimension** — short posts get padded with paint rather than inflated type

Padding is the better half of the fix. A short line centred in generous paint looks deliberate; oversized type in a tight blob looks like a mistake.

### Word-count rules by source

| Source | Rule |
|---|---|
| Collected archive posts | **1–12 words.** No enforcement — reality doesn't comply. |
| User submissions (Add to the wall) | **7–9 words**, enforced client and server |
| Sponsor wall message | **7–9 words**, enforced client and server |

The 7–9 constraint is what makes submissions and sponsor messages look native next to collected content. It is not a property of the archive.

### Sizing math (unchanged, still correct)

Per line of width `w` at vertical offset `y`, it fits when `(w/2)² + y² ≤ (rmin · R)²`. Solve per line, take the max, pad 7%, then apply the minimum-radius floor.

---

## 5. Splash composition

Stack, top to bottom:

```
        ┌─────────────────────┐
        │   [ body text ]     │   heavy, 27px or 35px
        │   [ 2–4 lines  ]    │
        │                     │
        │ ⬤ MTAA VIBES  @kevo_fresh_47 │   ← one line
        └─────────────────────┘
              🔥  ❤️  👎          ← on the rim
```

### The pill and handle share a line

`⬤ MTAA VIBES · @kevo_fresh_47` — pill left, handle trailing after a separator.

Stacking them as separate rows costs an entire row of vertical budget, and because the blob is sized to contain everything, that row makes every blob bigger and the wall emptier. One line preserves the hierarchy (loud → small → quiet) at half the cost.

Pill: axis colour, uppercase, ~11px. Handle: mono, ~12px, 62% opacity.

### Emoji in body text

Strip trailing emoji from collected post bodies (`😂😂`, `🔥🔥`, `🥺`). They compete visually with the reaction row, add width to the blob, and duplicate a signal the reactions now carry. Keep them only where load-bearing — e.g. `😳` in the Kenya Prisons post is doing work.

Strip emoji from handles too (`@shanne511😍` → `@shanne511`), for the same width reason.

---

## 6. Layout

### Desktop — 65% centred column

The board, header, and action bar all occupy a centred column at **65% of viewport width**, capped at 1000px. Outside the column: flat ink, no texture, no content.

```
┌──────────────────────────────────────────────────┐
│          ┌────────────────────────┐              │
│          │ DOBANESS      [Share]  │              │
│          ├────────────────────────┤              │
│  ink     │                        │      ink     │
│          │      ( splash )        │              │
│          │              ( splash )│              │
│          │                        │              │
│          ├────────────────────────┤              │
│          │ [Add to the wall][Claim a slot] │     │
│          └────────────────────────┘              │
└──────────────────────────────────────────────────┘
```

**This narrowing is also what fixes the proportion problem.** With type held constant, a blob is a fixed physical size — so on a 1440px full-bleed board it looks small. Narrow the board to ~936px and the same blob occupies 40% of the width instead of 26%. The column isn't only a style borrowed from TikTok; it's the mechanism that makes fixed type read as large.

### Counts and proportions

| Tier | Breakpoint | Board width | Splashes | Blob diameter as % of board width |
|---|---|---|---|---|
| Mobile | < 720 | 100% | 1 | 55–85% |
| Tablet | 720–1099 | 88% | 1–2 | 45–65% |
| Desktop | ≥ 1100 | 65%, max 1000px | 2–3 | 36–45% |

At 2–3 on desktop, blobs may interlock and overlap slightly at the fingers — that is correct for thrown paint, and their irregular outline means they read as separate even when edges touch. Text zones must never overlap; the placement search rejects positions where two text blocks collide.

### Transitions between splashes

- Enter: `easeOutBack`, 620ms, from 0 scale
- Exit: `easeInCubic`, 460ms, fading and shrinking 4%
- On dismiss, incoming starts at +150ms so the two overlap by about a third. Sequential reads as a stall; simultaneous reads as a collision.
- Multi-splash tiers: hold jittered ±35% so they never expire in unison

---

## 7. Actions — three, not four

| Position | Label | Opens |
|---|---|---|
| Header right | `Share` | Native share sheet / clipboard |
| Bottom left | `Add to the wall` | Widget → form |
| Bottom right | `Claim a slot` | Widget → form |

Nominate-as-a-separate-action is gone. Recommending a comment **is** "Add to the wall" — you saw something good somewhere, you send it here. One action, clearer value.

### Copy

**Add to the wall**
Widget headline: *Saw a comment that deserves this?*
Body: what you're collecting, that it's curated, that good ones go up with credit.

**Claim a slot**
Widget headline: *Your brand, same paint, same nine words.*
Body: what a slot is, that Taskbee is a live example, that nothing is charged yet.

"Claim a slot" beats "sponsor the wall" — concrete, and implies scarcity.

---

## 8. Side widgets

New surface. Slides in from the right (desktop/tablet) or up from the bottom (mobile). Not a modal over the wall — the wall stays visible and running behind it.

### Three widgets, one shape

| Trigger | Content | CTA |
|---|---|---|
| Taskbee splash → `More` | What Taskbee is, the offer, why it's on the wall | **Visit taskbee.co.ke** → external |
| `Claim a slot` splash or button | What a slot is, references the Taskbee splash directly | **Reserve a slot** → form |
| `Add to the wall` button | What you're collecting and what happens to it | **Add a comment** → form |

**The Taskbee and Claim widgets sharing a shape is the argument, not a collision.** A prospective sponsor taps Claim, sees the identical panel they just saw for a real paying brand, and understands exactly what they're buying. Make the Claim copy say so: *"You saw the Taskbee splash. That's a slot."*

One warning: those two widgets end in **opposite directions** — Taskbee sends you off-site, Claim pulls you into a form. Same container, opposite intent. The buttons must be visually distinct (external gets an outbound icon and a different fill) so nobody taps through to the wrong place.

### Not for `Add to the wall` alone

Every extra step costs conversion. The widget earns its place for the two sponsor paths because a slot genuinely needs explaining. For Add to the wall it's borderline — the headline does real work in setting up "a comment you found," which the form alone can't. Keep it, but keep it to two sentences and a button.

---

## 9. Forms

### Add to the wall

| Field | Rule |
|---|---|
| The comment | 7–9 words, live counter |
| Where you saw it | optional, free text or URL |
| Axis | select, 6 options |

**Zero PII at this stage.** No name, no phone. The nomination must stay frictionless — this is now your only volume signal.

### Claim your name — offered *after* submission, in the success state

Never as a field inside the nomination form. Putting it inline suppresses exactly the volume you want.

Success state: *"That's in the queue. Want to claim your name on the wall while you're here?"*

| Field | Rule |
|---|---|
| Name | 3–22 chars, `[a-z0-9._]`, blocklist checked |
| WhatsApp number | `^(?:\+?254\|0)?7\d{8}$` |

**Phone over email**, one field not both. Email in this demographic goes to Promotions and dies; a WhatsApp message gets read. Phone is also a harder identity to fake at volume, which matters for seeding a username base.

Say the purpose at the field, not in a policy: *"We'll WhatsApp you when your name goes live. Nothing else."* That sentence will move conversion more than anything else on the form.

### Claim a slot

| Field | Rule |
|---|---|
| Brand | 2–40 chars |
| WhatsApp number | Kenyan mobile |
| Message on the wall | 7–9 words |
| What a week is worth | tier selector: `KSh 500` · `KSh 2,000` · `KSh 5,000` · `Let's talk` |

Email dropped — one contact channel is enough at capture stage.

### Compliance

Collecting phone numbers makes you a data controller under Kenya's Data Protection Act. At this scale that means: state the purpose (done, at the field), honour deletion requests, don't share the list. One line in the intro screen covers it.

---

## 10. Intro screen

Kept, and doing three jobs the wall can't:

1. **Set expectations honestly** — curated, pre-launch, nothing goes up automatically
2. **Play the splash motion once, clean** — this is the identity, shown deliberately rather than glimpsed
3. **Carry the disclosures** — anonymised handles, data purpose

Required line: *"Some handles are real, as collected. Others are anonymised placeholders."*

That distinction is honest and it costs nothing. It's also the difference between a mistake and a misrepresentation if a placeholder ever collides with a real account.

Entry: **Enter the wall**.

---

## 11. Motion identity — the export path

The splash animation becomes DOBANESS's motion signature across social, not just the site.

For that to be real it must be reproducible **outside the browser**. Two routes:

**A. Motion spec** — a written document precise enough for a designer to rebuild in After Effects or Rive: easing curve, grow duration, droplet count/delay/spread, when text appears relative to the paint, exit behaviour.

**B. Headless render script** *(recommended)* — a Node script that takes any text + handle + axis and outputs an MP4 and a transparent MOV of the splash sting.

Given you'll be collecting and posting comments constantly, **B is probably worth more than any feature in this spec.** Every comment you collect becomes a branded clip at zero marginal cost, and the wall and the feed reinforce each other because it is literally the same motion.

One caveat: 3s is right for the wall, wrong for a sting. The spec needs a **short variant at ~900ms** — same curve, compressed — plus a 1080×1920 and 1080×1080 output.

---

## 12. Handles

### Templates

Three business-safe patterns. All three are multi-part, which is what makes accidental collision with a live account unlikely.

| # | Pattern | Examples |
|---|---|---|
| 1 | first name + attribute + **county** code | `Kevo_Fresh_47` · `Lisa_Smart_32` · `Mercy_Bidii_22` |
| 2 | last name + attribute + **country** code (254) | `Njoroge_Rada_254` · `Otieno_Poa_254` · `Kipkoech_Moto_254` |
| 3 | `Wa-[X]` + location or interest | `Wa-Njoroge Soko` · `Wa-Mama Gikomba` · `Wa-Jesu Kayole` |

County codes for reference: Nairobi 47, Kiambu 22, Nakuru 32, Mombasa 1, Kisumu 42, Machakos 16, Uasin Gishu 27.

No stylized Unicode. `𝑺𝑨𝑴𝑷𝑨𝑼𝑳` is Mathematical Bold Italic; handles render in a mono face, and mono fonts essentially never include math alphanumerics — it would show as tofu boxes and is unreadable to screen readers. Emoji brackets render fine if you want the decoration: `🩸SAMPAUL🩸`.

### Two kinds of handle in the data

```
handle          string
handle_source   collected | placeholder
```

Collected handles keep their real form (`@africanmachine`, `@comikenyan`) because attributing public content to its author is correct. Placeholders fill in where the comment arrived unattributed. The intro screen discloses that both exist.

Before seeding any placeholder, check it against TikTok and Instagram. Ten minutes. A generated handle that happens to be live puts words in a real person's mouth.

---

## 13. Content — current archive

26 posts as supplied. `axis` is the displayed pill; `origin` preserves the finer taxonomy.

### Collected — real handles, keep as-is

| Handle | Body | Axis | Words |
|---|---|---|---|
| `@shanne511` | hawa wakiachana me ndio naenda therapy | Situationship Files | 6 |
| `@africanmachine` | ukiona mtu anacheka jokes zake wachana na yeye | Mtaa Vibes | 8 |
| `@dj.montezz.kenya` | Nani amenotice Mosiria anadance kama AI | Mtaa Vibes | 6 |
| `@comikenyan` | ongeza chakula, kwani matanga ni yako | Mtaa Vibes | 6 |
| `@astro_kenya` | kitu watu huogopa ni kuoga tu | Mtaa Vibes | 6 |
| `@Its_Atinah` | nitafutie ya Oscar Sudi akiongea English Parliament | Ka Bunge | 7 |
| `@Pablo_drip` | hawa dio walifanya guka yangu asiniachie shamba Nairobi | Mtaa Vibes | 8 |
| `@WAZIRI` | peana password uekewe vitu kwa folder | Mtaa Vibes | 6 |
| `@saneolemasharen` | Heha movers don't just move you they give you a fresh start too | Others (Biashara) | 14 → **trim** |
| `@frosty` | pliz everyone be safe, hii pombe hatuezi maliza but inamaliza mayut | Mtaa Vibes | 11 |
| `@zoro` | msee anafungua, anapiga flash, na bado ako na time ya kufunga | Mtaa Vibes | 12 |
| `@MC_Gold` | si hubonga kilami tukitaka doh itoke | Mtaa Vibes | 6 |
| `@Lucie` | Kuna morio wangu najua awez ondokea huyu | Situationship Files | 7 |
| `@kijana_misa` | mafans wa man city nasikia hawawezi jaza hata supermetro moja | Others (Football) | 10 |
| `@omwoyos42` | kiburi Fc mtatumaliza na kelele buana | Others (Football) | 6 |
| `@lewy` | mapenzi ni kama matatu ukiachwa songa kwa next | Situationship Files | 8 |

`@saneolemasharen` at 14 words won't lay out well — the blob would be enormous. Trim to **"Heha movers don't just move you, they give you a fresh start"** (12) or drop it.

### Unattributed — need placeholder handles

| Body | Axis | Words | Class |
|---|---|---|---|
| Usitakejua | Mtaa Vibes | 1 | short-form |
| naskia usitoh | Mtaa Vibes | 2 | short-form |
| ni uchungu sana | Mtaa Vibes | 3 | short-form |
| najua mko huku | Mtaa Vibes | 3 | short-form |
| unajua unacheka kwa nini | Mtaa Vibes | 4 | short-form |
| msijifanye hamjaona mahali chelsea | Others (Football) | 4 | short-form |
| ukikosa msichana, unatafuta mumama | Situationship Files | 4 | short-form |
| hii kenya mko na mambo | Mtaa Vibes | 5 | standard |
| hio plot kuna vacant, natafuta nyumba? | Mtaa Vibes | 6 | standard |
| siku hizi Kenya prisons wanatoa hadi adverts 😳 | Ka Bunge | 7 | standard |

Ten of twenty-six are short-form. That is a high enough proportion that the short-form type class and the minimum-radius floor are load-bearing, not edge cases.

### Distribution warning

Mtaa Vibes holds 15 of 26. On a wall with no filtering, the pill will read MTAA VIBES most of the time and the taxonomy will look decorative. Either collect deliberately against the thinner axes before launch, or accept that the pill is mostly flavour for now.

---

## 14. Data model changes

```sql
-- posts (compiled into the bundle, not queried)
axis            TEXT     -- displayed pill
origin          TEXT     -- finer taxonomy, retained
handle          TEXT
handle_source   TEXT     -- collected | placeholder
source_url      TEXT     -- permalink, captured at collection
word_class      TEXT     -- standard | short

-- reactions: seeded rows removed entirely
CREATE TABLE reactions (
  post_id    TEXT NOT NULL,
  emoji      TEXT NOT NULL,   -- fire | heart | down
  created_at INTEGER NOT NULL,
  ip_hash    TEXT
);

-- submissions: renamed from splash_queue
CREATE TABLE submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  body        TEXT NOT NULL,
  axis        TEXT NOT NULL,
  seen_at     TEXT,            -- "where you saw it", optional
  word_count  INTEGER NOT NULL,
  status      TEXT DEFAULT 'pending',
  created_at  INTEGER NOT NULL
);

-- claims: decoupled from submissions
CREATE TABLE name_claims (
  handle     TEXT PRIMARY KEY,
  whatsapp   TEXT NOT NULL,
  claimed_at INTEGER NOT NULL,
  status     TEXT DEFAULT 'held'
);

-- sponsor_leads: email column dropped
```

`submissions` and `name_claims` are deliberately unlinked. A claim is optional and offered after; joining them would imply the nomination required identity.

---

## 15. Open questions

1. **Does 👎 stay?** It's the honest option and useful for curation, but a public negative on a wall of jokes can chill submissions. Alternative: keep it, don't display counts.
2. **Reaction cost.** Every reaction is a Worker write. At any volume, batch client-side and flush on `pagehide` — or move to Analytics Engine and keep D1 for queues only.
3. **Mtaa Vibes dominance** — collect against thin axes, or drop the pill until the distribution is real?
4. **Short-form ceiling.** 1.3× is a guess. Worth eyeballing "Usitakejua" against a 9-word post before committing.
5. **Widget on `Add to the wall`** — measure it. If the extra step costs more than the framing gains, go straight to the form.
6. **Motion export** — is the headless render script in this build or the next one? It's the highest-leverage item here and it's independent of everything else, so it could ship first.

---

## 16. Order of work

1. Removals (§1) — smallest diff, clears the ground
2. Type classes + minimum radius (§4) — everything else depends on blob sizing
3. Splash composition: pill + handle on one line (§5)
4. Unified tap grammar (§3)
5. Reactions (§2)
6. Desktop column + counts (§6)
7. Bottom bar, widgets, forms (§7–9)
8. Intro screen (§10)
9. Content pass: trim, strip emoji, assign placeholder handles, verify against live accounts (§12–13)
10. Motion export script (§11) — independent, can run in parallel
