# DOBANESS — Brand splash layout + tap targets (v2.2)

Patch to the wall screen. Fixes two bugs visible on mobile: the label, comment text and CTA overlap each other, and the CTA does not respond to taps.

---

## 1. Bug: CTA is not clickable

The `See slot` / `More` button is painted into the canvas, so there is no real hit target. On touch devices the wall's pan handler also swallows the gesture before any hit test runs.

**Fix — render brand-splash CTAs as DOM elements layered above the canvas.**

- Absolutely-positioned `<button>` in an overlay div above the p5 canvas, `pointer-events: none` on the overlay, `pointer-events: auto` on the buttons.
- Sync each button's position to its blob's screen coordinates on every frame (and on pan, zoom, resize).
- Minimum tap target **44 × 44px**, even when the visible pill is smaller — pad it out.
- `touch-action: manipulation` to kill the 300ms tap delay.

**Also fix tap-vs-drag on the canvas itself**, since the same bug will hit reaction chips: treat a pointer sequence as a tap only if total movement < 10px and duration < 300ms. Otherwise it's a pan. Do not `preventDefault()` on `touchstart` unconditionally — that's what is currently eating the tap.

---

## 2. Bug: overlapping content inside the blob

In the screenshots the label sits on top of the first text line, and the button covers the last line — `same nine words` and `for KSh 10,000` are both partly hidden.

**Fix — lay the contents out as a measured vertical stack, then position it. Never draw elements at independent fixed offsets.**

Stack order and gaps:

```
[ label pill ]        e.g. CLAIM A SLOT / SPONSOR ZERO
      ↕ 12px
[ comment text ]      1–3 lines, line-height 1.15
      ↕ 16px
[ CTA button ]        See slot / More
```

Algorithm:

1. Measure each element's height at the current font size.
2. Sum heights + gaps = `stackHeight`.
3. Compute the blob's largest inscribed rectangle, inset by **24px** on all sides.
4. If `stackHeight` > available height, shrink the text font in 2px steps down to a floor of 16px; if it still doesn't fit, grow the blob.
5. Centre the stack vertically and horizontally inside the inscribed rect.
6. Assert no two elements' bounding boxes intersect before drawing.

The label needs a solid pill background, not bare text — it is currently unreadable where it crosses the comment.

---

## 3. Blob must stay on screen

In two of the screenshots the blob runs off the right edge of the viewport. Clamp every splash so its bounding box sits within the canvas with a minimum **16px** margin on mobile, 24px desktop. Clamp after placement, before the first paint.

---

## 4. Contrast

Text and label colour are picked against the blob gradient (dark on yellow/green, white on orange/pink). Keep that, but enforce a **4.5:1** minimum against the gradient's midpoint, and give the CTA button its own solid fill so it never relies on the gradient behind it.

---

## 5. Tests

- Tap `See slot` and `More` on a real phone — both open the slot modal. Not an emulator.
- Tap target measures ≥44×44px in devtools.
- Pan the wall starting on a CTA: it pans, and does not fire the button.
- Quick tap on a CTA after a pan: it fires.
- Render all brand splashes at 390, 414 and 360px widths — no element overlaps another, nothing is clipped by the viewport edge.
- Longest brand copy (`Launch your online store for KSh 10,000`) renders in full with the label and button clear of it.
- Buttons stay aligned to their blobs while panning and after resize/orientation change.
- Contrast check on all six gradient families.
