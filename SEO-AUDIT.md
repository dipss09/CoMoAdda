# SEO Audit — comoadda.shop

**Date:** 2026-07-16
**Branch:** `seo-optimisation`
**Scope:** Phase 0 (audit only) per the SEO optimization brief. No code changed in this phase.

---

## 1. Stack Identification

- **No framework, no build system.** There is no `package.json`, no bundler config, no SSR/SSG framework anywhere in the repo. This is hand-authored vanilla HTML + inline `<script>` JS.
- **Styling:** Tailwind CSS is loaded via the **Tailwind CDN script** (`https://cdn.tailwindcss.com?plugins=forms,container-queries`) in both `index.html:76` and `admin.html:7` / `code.html:9`, with an inline `tailwind.config` block. Tailwind's own docs mark the CDN build as **not for production** — it ships the full JIT compiler to the browser and recompiles styles client-side.
- **Backend/data:** **Firebase** (Firestore + Auth, compat SDK v10.9.0), loaded via `<script defer>` tags at `index.html:856-858`. `firebaseConfig` is inline at `index.html:1885` (client-side Firebase config — this is normal/expected for Firebase, not a secret leak, since Firestore security rules are the actual gate).
- **Hosting/deploy:** `vercel.json` at repo root configures HSTS + CSP headers and a host-based redirect (`comoadda.shop` → `www.comoadda.shop`). No `vercel-build`/install command — Vercel will serve this as a **static site**, deploying every file in the repo root as-is.
- **Two Python scripts** (`optimize.py`, `process_logo.py`) — one-off local image-processing utilities, not part of any build pipeline; they don't run automatically on deploy.

## 2. Rendering Model — **this is the single biggest SEO problem in the codebase**

| Content type | Where it lives | Rendered how |
|---|---|---|
| Hero, About/story text, feature cards, footer, JSON-LD business info | Hardcoded in `index.html` | ✅ Present in initial HTML |
| **Products** (name, desc, price, image, stock) | `db.collection("products")` in Firestore | ❌ Fetched client-side via `onSnapshot()` (`index.html:4223`) and injected into `#product-grid` by `renderProducts()` (`index.html:2108`). **Empty in the raw HTML response.** |
| **Collections/categories grid** | Firestore `settings/storeConfig` doc (`data.collectionsData`) | ❌ Client-side, `index.html:4006-4014` |
| **Reviews** | `db.collection("reviews")` where `status == "approved"` | ❌ Client-side, `index.html:4252` |
| Store open/closed state, hours | Firestore `settings/storeConfig` (`autoLive` + `schedule`) | ❌ Client-side, `index.html:3916-4220` |
| Instagram URL, WhatsApp number (footer + hero links) | Firestore `settings/storeConfig` (`data.instagram`, `data.whatsapp`) | ❌ Overwritten client-side over static placeholder hrefs, `index.html:3955-4004` |

**Important nuance:** there's a `DEFAULT_PRODUCTS` / `DEFAULT_COLLECTIONS` fallback array (`index.html:3860-3873`) that renders if Firestore is slow (>1.2s) or errors. **This fallback data is not the real catalog** — it's placeholder copy with AI-generated placeholder images (`lh3.googleusercontent.com/aida-public/...` — Google AI Studio / "aida" prototyping tool output), product ids like `fallback-caramel`. It cannot be used as a source for real Product JSON-LD or static pre-rendering.

**Consequence:** a crawler (or an AI answer engine) fetching `https://www.comoadda.shop/` sees zero real products, zero real prices, zero real reviews, and a static open/closed state — the exact content that matters most for "cold brew Majhitar" queries never appears in the document a bot receives, unless that bot executes JS and waits for Firestore (Googlebot mostly does this on a delay; most other crawlers and AI answer engines do not).

**This is a real architectural constraint for Phase 3**, not just a code fix: static pre-rendering of the real catalog requires either (a) a build step that reads Firestore at build/deploy time (needs a service-account key + a build command Vercel would run — currently there is none), or (b) a periodically-refreshed static JSON snapshot committed to the repo and rendered inline, kept in sync manually or via a script. **I'll need your input on which approach you want before Phase 3** — see open questions at the end.

## 3. URL & Routing Structure

Confirmed: **it is a single HTML document with anchor navigation**, plus a handful of *other, separate* HTML files that are not linked from it:

- `/` (`index.html`) — the real site. Sections addressed by anchors: `#home`, `#categories`/`#the-collection`, `#products`, `#about`, `#rewards`, `#order-section`/`#contact`.
- `/admin.html` — admin dashboard (Firebase-authenticated). Correctly `Disallow`'d in `robots.txt:5`, but has **no `noindex` meta tag** as a second layer of defense (see §9).
- `/code.html` — **orphaned file, not linked from anywhere in the site** (confirmed via repo-wide grep). Appears to be an earlier export/snapshot of the homepage (uses `cdn.tailwindcss.com` directly, different `<title>`). Since Vercel serves every file in the repo root, this is publicly reachable at `https://www.comoadda.shop/code.html` today and is a duplicate-content risk sitting in robots' and crawlers' path unintentionally.
- `/downloaded_index.html` — same situation: **orphaned, unlinked**, and its own `og:url` meta tag points to `https://comoadda.web.app/` (a Firebase Hosting default domain), not `comoadda.shop`. This strongly suggests there is (or was) a **second live deployment on Firebase Hosting** separate from the Vercel one. I can't tell from the repo alone whether `comoadda.web.app` is still live and publicly indexed — **flagging as an open question**, since if it is, it's a duplicate-content/canonical problem outside this repo's control.

No `/products/<slug>` routes, no other real pages exist.

## 4. Head & Metadata Inventory

`index.html:1-71` (the only page meant to be indexed) has a fairly complete head already:
title, meta description, `robots: index, follow`, canonical (`https://www.comoadda.shop/`), OG tags, Twitter Card tags, and — notably — **JSON-LD `LocalBusiness` + `WebSite` schema already exists** (`index.html:34-70`), with correct NAP values matching your CONFIRMED FACTS (phone `+918101244865`, Majhitar/Sikkim/IN, Instagram sameAs). This is more mature than a from-scratch build; Phase 2 should **extend**, not replace, this block.

Conflicts/duplicates found:
- **Brand name spacing inconsistency:** `<title>`, JSON-LD `name`, footer, and `<meta name="author">` all say **"CoMoAdda"**, but the visible **H1 says "CoMo Adda"** (with a space) — `index.html:1482`. Byte-identical NAP requires picking one; CONFIRMED FACTS says `CoMoAdda`.
- `code.html` and `downloaded_index.html` each carry their **own conflicting title/description/OG tags** (different copy, and in `downloaded_index.html`'s case, a different canonical domain via `og:url`). Since both are publicly reachable, this is duplicate/conflicting metadata Google could pick up.
- No `google-site-verification` meta tag exists anywhere in the repo — I searched case-insensitively for "verification" repo-wide and found nothing. **This contradicts the brief's assumption** that a placeholder verification tag exists; it's simply absent. Phase 1 will need to *add* a placeholder/TODO rather than *replace* one.
- `og:image`/`twitter:image` both point to an external `lh3.googleusercontent.com` AI-prototyping URL, no `og:image:width`/`height` tags, and no confirmation it's 1200×630.

## 5. Known-Bugs Checklist (from the brief) — confirmed / corrected

| Claimed bug | Status |
|---|---|
| Placeholder phone `919999999999` in wa.me/tel: links | **Confirmed**, but nuanced: `index.html:1762` (wa.me) and `:1774` (tel:) are static placeholders in the raw HTML. JS (`applyOwnerConfig()` at `:3211` and the Firestore listener at `:3970-3979`) overwrites them with the real number (`918101244865`) at runtime. So real users never see the wrong number, but **any crawler reading raw HTML sees the placeholder** — still worth fixing at the source. `downloaded_index.html:1149/1160` has the same placeholder (orphaned file, lower priority). |
| `google-site-verification` set to literal placeholder string | **Not confirmed** — no such tag exists in the repo at all (see §4). |
| Instagram links pointing to `#` | **Confirmed**: `code.html:437`, `index.html:1839` (footer), `index.html:1491` (hero) all start as `href="#"` and are only rewritten by JS if `data.instagram` is set in Firestore. The Instagram URL in your CONFIRMED FACTS section was left as a placeholder (`<PASTE REAL INSTAGRAM URL>`) — I'll mark this TODO rather than guess. Note the JSON-LD already says `https://www.instagram.com/comoadda` (`index.html:55`), so that may be the real handle — please confirm. |
| Empty/placeholder image `src` | **Confirmed but lower severity than implied**: `popup-media` (`:1150`), `spin-wheel-custom-img` (`:1204`), `spin-float-img` (`:1461`), `about-story-img` (`:1541`) all start with `src=""`. All four are either `hidden` by default or admin-configurable and only shown once populated — they're not broken content images on a normal page load, but they do lack `width`/`height` so if/when populated they can cause layout shift. |

## 6. Heading Structure

- Exactly **one `<h1>`** on the page: `index.html:1482`, `"CoMo Adda"` — brand-only, not descriptive, and inconsistent spelling (see §4).
- `<h2>` used correctly for major section headers (Collection, Why CoMoAdda, What They Say, Redeem Your Rewards, Get Your Fix) — reasonable outline.
- `<h3>` is overloaded: used correctly for feature/product/review sub-headings, but **also used inside every modal** (cart, checkout, auth, profile, order-confirmation — `index.html:965,1005,1123,1242,1361` etc.) which are not part of the main document outline when hidden. Not a bug, just noting for Phase 2 restructuring — these shouldn't be touched since they're transactional UI, not content.
- No `<h4>`+ found; no skipped levels in the main content flow.

## 7. Image Audit

- 14 static `<img>` tags in `index.html`, plus several more generated by JS template strings for products/collections/reviews.
- **All statically-present images have `alt` text** except one: the **Instagram logo hotlinked from Wikimedia** (`index.html:1493`, `<img src="https://upload.wikimedia.org/.../Instagram_logo_2016.svg" class="...">`) — **no `alt` attribute at all**. Same file also appears in `downloaded_index.html:908` (orphaned).
- **No image has explicit `width`/`height` or `aspect-ratio`** — all sizing is via Tailwind utility classes (`w-full h-48`, etc.), which don't reserve layout space before the image loads → real CLS risk, especially on the hero and story image.
- **Hotlinked external images:**
  - `og:image`/`twitter:image` → `lh3.googleusercontent.com/aida-public/...` (Google AI prototyping tool asset, not owned/hosted by this project)
  - Instagram icon → `upload.wikimedia.org/.../Instagram_logo_2016.svg`
  - All product/collection fallback images in `DEFAULT_PRODUCTS`/`DEFAULT_COLLECTIONS` → same `lh3.googleusercontent.com/aida-public/...` host
  - The real product images (from Firestore) are whatever URL the admin panel stores — likely also externally hosted; can't audit without DB access.
- `logo.png` (340 KB) and `screen.png` (327 KB) in the repo root are large for what are likely a logo and a screenshot — candidates for compression in Phase 4. The `frames/` directory (34 PNG frames, ~155-186 KB each, ~5.9 MB total) looks like a sprite-sheet source for a gif/animation — worth checking whether all 34 frames are actually used or shipped to the browser.

## 8. Performance Red Flags

- **Tailwind CDN script is render-blocking** and explicitly not-for-production per Tailwind's own docs (`index.html:76`, also preloaded at `:75` which doesn't help since it still blocks on execution). This is the top performance fix available without a build step (self-hosting a compiled Tailwind CSS file, or at minimum moving the script tag to `defer`/end of body — though Tailwind CDN's JIT needs to run before paint to avoid FOUC, so a real fix means precompiling CSS).
- Firebase SDK scripts (`:856-858`) and EmailJS (`:83`) are correctly `defer`red — good.
- Google Fonts links already use `display=swap` (no explicit `font-display` needed) — good, but they're render-blocking `<link rel="stylesheet">` tags with only `preconnect` (no `preload`) — minor.
- `index.html` is 5,034 lines / ~245 KB unminified, all inline (no external JS/CSS bundle) — everything ships on every load, nothing is code-split or cached separately from the HTML.
- No `Cache-Control` headers configured in `vercel.json` for static assets (`logo.png`, `screen.png`, `frames/*`) — Vercel applies sensible defaults for static files, but nothing explicit is set.
- `code.html` and `downloaded_index.html` also load the Tailwind CDN independently — irrelevant if they're removed (see §3).

## 9. Crawlability

- `robots.txt` exists (`Allow: /`, disallows `/admin.html` + `/admin.js`, references sitemap) — reasonable, but doesn't cover `/code.html` or `/downloaded_index.html` (should either delete those files or disallow them).
- `sitemap.xml` exists but only lists the homepage + 4 anchor fragments (`#categories`, `#products`, `#about`, `#contact`). **Anchor fragments (`#...`) are not meaningful sitemap entries** — Google treats everything before the `#` as the same URL, so this sitemap effectively lists one URL five times. This isn't harmful, just not useful; a real sitemap needs real distinct URLs (see Phase 3 discussion on product pages).
- Structured data: `LocalBusiness` + `WebSite` JSON-LD present (see §4) but no `Product` schema (can't be added correctly until product data has a server-visible source — see §2).
- No `hreflang` — correctly not needed (single-locale IN/English site).
- `admin.html` is disallowed in `robots.txt` but has no `<meta name="robots" content="noindex">` — defense-in-depth gap; a disallowed-but-linked (footer has `<a href="admin.html">Admin Login</a>` at `index.html:1849`) page can still get indexed by URL if some crawler ignores robots.txt or the link gets crawled from elsewhere.
- `meta name="geo.placename" content="India"` (`index.html:17`) is oddly generic given you have exact Majhitar/Sikkim coordinates already in the JSON-LD — low-value legacy meta tag (geo meta tags are largely deprecated/ignored by Google anyway; JSON-LD geo is what matters).

## 10. Accessibility ↔ SEO Overlaps

- **79 occurrences of `material-symbols-outlined` icon usage** in `index.html`, but only **1 `aria-label`** in the entire file. Many of these are icon-only buttons (carousel prev/next at `:2149-2150`, various modal close buttons, etc.) with no visible text and no `aria-label` — a real accessibility gap that also affects how assistive tech and some crawlers interpret interactive elements.
- No `<main>` landmark anywhere in `index.html` (there is a `<nav>` at `:921` and a `<footer>` at `:1830`, but all page content sits in bare `<div>`/`<section>` with no `<main>` wrapper).
- The Instagram logo image missing `alt` (§7) is also an accessibility miss, not just SEO.
- Form inputs (contact form, review form, claim-gift form) — need a closer per-field pass in Phase 4; a first look shows visible `<label>` elements paired with each input via layout but not always via `for`/`id` association — flagging for verification during Phase 4, not confirmed as broken yet.

---

## Findings by Severity

### Critical
1. **Product catalog, reviews, and store-hours content are 100% client-rendered from Firestore — absent from the initial HTML.** This is the main blocker to ranking for product-intent queries and to AI answer engines surfacing real menu/price info. (§2)
2. **Placeholder phone number `919999999999` present in raw HTML** at `index.html:1762,1774` (only corrected after JS runs). (§5)
3. **Instagram links are `href="#"` in raw HTML** at `index.html:1491,1839` and `code.html:437`, real URL unconfirmed in your brief. (§5)

### High
4. **Orphaned duplicate pages `/code.html` and `/downloaded_index.html`** are publicly deployed, unlinked, carry conflicting metadata, and one points its `og:url` at a different domain (`comoadda.web.app`) — possible second live deployment causing duplicate content. (§3, §4)
5. **Tailwind CDN script is render-blocking and not production-safe** per Tailwind's own guidance — affects LCP/FCP sitewide. (§8)
6. **No `Product` JSON-LD** — blocked on §2 being resolved first.
7. **Sitemap only contains anchor-fragment "URLs"**, which are not distinct crawlable pages — effectively a sitemap of one URL. (§9)

### Medium
8. **Brand name inconsistency**: H1 "CoMo Adda" vs. everywhere-else "CoMoAdda". (§4, §6)
9. **H1 is brand-only**, not descriptive of the offering/location. (§6)
10. **No image has `width`/`height`**, real CLS risk. (§7)
11. **Hotlinked external images** (Instagram SVG from Wikimedia, `og:image` from `lh3.googleusercontent.com`, and all fallback product/collection images from the same host). (§7)
12. **`admin.html` lacks a `noindex` meta tag** as defense-in-depth beyond robots.txt. (§9)
13. **79 icon-only UI affordances, 1 `aria-label`** — accessibility gap with SEO/AI-crawler-comprehension overlap. (§10)

### Low
14. Instagram logo `<img>` missing `alt` text. (§7, §10)
15. Four `src=""` placeholder images without `width`/`height` reserved (popup, spin wheel, hero float, about-story). (§5)
16. `meta name="geo.placename" content="India"` is low-value/legacy given precise JSON-LD geo already exists. (§9)
17. No `<main>` landmark. (§10)
18. `logo.png` (340 KB) / `screen.png` (327 KB) are large for their apparent purpose; `frames/` (~5.9 MB across 34 PNGs) worth checking for actual usage. (§7)
19. Google Fonts stylesheets have `preconnect` but not `preload`. (§8)

---

## Open Questions (need your input before I go further)

1. **Instagram URL**: your CONFIRMED FACTS left this as `<PASTE REAL INSTAGRAM URL>`. The existing JSON-LD already says `https://www.instagram.com/comoadda` — is that correct, or is there a different handle?
2. **`comoadda.web.app`**: is this Firebase Hosting URL still live/public? If so it's a duplicate-content source outside this repo, and I'd want to know whether you control it (e.g., can redirect it to `comoadda.shop`) before Phase 3.
3. **`/code.html` and `/downloaded_index.html`**: since neither is linked from the live site and they contain stale/conflicting metadata, my recommendation is to **delete both** (or if you want them kept as design references, at minimum add them to `robots.txt` disallow and strip their conflicting meta tags). Which do you want?
4. **Product data for Phase 3 (SSR/SSG of the catalog)** — this is the big architectural decision:
   - **Option A**: Add a small build step (e.g., a Node script run at Vercel build time) that pulls from Firestore using a service-account key (stored as a Vercel env var) and injects static product HTML + `Product` JSON-LD before deploy. Requires you to provision a Firebase service account key and add it as a Vercel secret.
   - **Option B**: Periodically export the current Firestore catalog to a committed static JSON/HTML snapshot (manually, or via a script you run occasionally), rendered inline as the initial HTML with the existing JS still hydrating stock/price live on top. Simpler, no new credentials, but the SEO-visible content will only be as fresh as the last export.
   - **Option C**: Minimal viable alternative per the brief — skip per-product URLs, and just ensure the *current* catalog (via whichever of A/B) is present in the static HTML of the single `/` page and `sitemap.xml` stays as-is.

   I'd lean toward **B** as the pragmatic starting point given there's no existing build tooling in this repo, but want your call before touching Phase 3.
5. **Reviews `AggregateRating`**: real review documents exist in Firestore with a `rating` field, but the submission form (`index.html:3728`) **always hardcodes `rating: 5`** — there's no UI for users to actually choose a star rating. So while the data is technically real (not fabricated by me), every review is a forced 5. Do you want `AggregateRating` added on that basis, or would you rather add a real star-picker to the review form first so ratings are genuine?

---

**No code has been changed.** Awaiting your approval to proceed with Phase 1 (critical, non-structural fixes) and your answers to the open questions above — particularly #4, since it determines the shape of Phase 3.
