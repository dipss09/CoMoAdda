# SEO Changes — comoadda.shop

Branch: `seo-optimisation` — 4 commits, one per phase. This document is the Phase 5 handoff: what changed, what you need to do, and what was deliberately left alone.

See `SEO-AUDIT.md` for the original Phase 0 findings this work was based on.

---

## Summary by phase

### Phase 1 — `fix: critical SEO bugs — NAP consistency, placeholder values` (`61c7f22`)

- **Phone number**: `919999999999` → `918101244865` as the *static* HTML default in the WhatsApp/call buttons (`index.html`), not just the JS-applied value. Verified no other placeholder-phone instances remained anywhere in the repo.
- **Instagram**: static defaults set to `https://www.instagram.com/comoadda` (hero link, footer link in `index.html`; default value in `admin.js`) — matches the value you confirmed and the JSON-LD's existing `sameAs`. Note: the *live* Firestore `settings/storeConfig.instagram` value is currently `https://instagram.com/brewdipu` (see TODO list below — this is a data conflict in Firestore itself, not something this branch fixes).
- **`noindex, nofollow`** meta added to `admin.html` as defense-in-depth alongside the existing `robots.txt` disallow.
- Deleted `code.html` and `downloaded_index.html` — unlinked, publicly-deployed duplicates with conflicting metadata (one pointed `og:url` at `comoadda.web.app`, which you confirmed is a dead Firebase Hosting URL). Recoverable from git history if ever needed.
- You separately added a real `google-site-verification` meta tag while this was in progress — see the TODO list, the value looks like the wrong format for a meta tag.

### Phase 2 — `feat: local SEO metadata + JSON-LD structured data` (`f6dd7c9`)

- Title: `CoMoAdda | Cold Brew & Mojito Delivery in Majhitar, Sikkim` (58 chars).
- Meta description: local-intent, CTR-focused, 125 chars.
- `geo.*` meta tags corrected from generic "India" to precise Majhitar/Sikkim coordinates.
- H1 rewritten: kept the large "CoMoAdda" brand mark at full size (required by the design system — see `DESIGN.md`), added a smaller but still-inside-`<h1>` descriptive line ("Artisanal Cold Brew & Mojito Delivery in Majhitar, Sikkim") so the tag is both on-brand visually and descriptive for SEO/AI-crawler purposes.
- **Stopped the runtime JS override** of `#hero-title`/`#about-content` from Firestore's `heroTitle`/`aboutText` fields — those are stale "Brew Dipu"-era copy that would have silently replaced the new SEO copy after page load. **This means the admin panel's Hero Title / About Text fields no longer do anything** — see TODO list, you'll need to edit `index.html` directly (or ask me to re-wire this differently) to change hero/about copy going forward.
- Generated `og-image.png` (1200×630, real logo composited on brand color) to replace the hotlinked `lh3.googleusercontent.com` placeholder. Regenerate with `python generate_og_image.py` after changing `logo.png`.
- Generated a full favicon/icon set (`favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`) and `site.webmanifest` — none existed before. Regenerate with `python generate_favicons.py`.
- Extended the existing `LocalBusiness` JSON-LD with an `image` field. Did not touch `Product`/`AggregateRating`/`openingHours` here — those are Firestore-sourced and handled in Phase 3 instead, to keep one source of truth for dynamic data.

### Phase 3 — `feat: crawlable product content, sitemap, robots` (`50855dd`)

- **`export-catalog.js`** (new, re-runnable): pulls the real product catalog (37 products) and store schedule from Firestore via the public REST API — no service-account credentials needed, since those collections already allow public reads (confirmed: the site itself reads them unauthenticated). Injects:
  - A static, real, crawlable product grid into `index.html` (between `<!-- EXPORT:PRODUCTS:START -->` / `END` markers).
  - `Product` JSON-LD (37 entries — name, description, image, INR price, stock-based availability) as a second JSON-LD block (between `EXPORT:PRODUCT_JSONLD` markers).
  - `openingHoursSpecification` into the existing `LocalBusiness` JSON-LD, from Firestore's `schedule`.
  - **Run this again whenever the menu changes** (products added/removed/repriced/restocked via the admin panel): `node export-catalog.js`, review the diff, commit.
- **Product images are base64-encoded inside Firestore documents**, not hosted URLs. The export script decodes and writes them to `products/*.jpg` (deduped by content hash) instead of inlining base64 into `index.html` — inlining would have bloated the page by several MB. 69 image files, ~2.1 MB total, vs. what would have been ~7+ MB of embedded base64 text.
- Fixed `renderProducts()` to no-op when `PRODUCTS` is empty, instead of blanking `#product-grid` — it ran immediately on page load, before Firestore responds, and would otherwise wipe the static export on every single page load before hydrating.
- Fixed the 1.2s slow-network fallback (`triggerFallbackData()`) to not overwrite the real exported catalog with the fake placeholder `DEFAULT_PRODUCTS` array.
- Fixed `processAddToCart()` to guard against the product not being found yet (already true of `processBuyNow()`) — needed because the catalog is now visible and clickable immediately, not only after Firestore hydration, which widens a previously-narrow race window.
- Idempotency verified: running the script twice in a row with no Firestore changes produces a byte-identical `index.html` and no duplicate image files.
- `sitemap.xml` rewritten to list only the one real URL (was 5 entries, 4 of them anchor fragments that Google treats as the same URL as the homepage). The export script now bumps its `lastmod` on every run.
- `robots.txt` was already correctly scoped — no changes needed.
- **No per-product URLs** — per your direction, this stays one crawlable page with the full catalog inline, not separate `/products/<slug>` pages.

### Phase 4 — `perf: image optimization, lazy loading, semantic HTML` (`0839215`)

- **Replaced the Tailwind CDN script** (render-blocking, explicitly not-for-production per Tailwind's own docs) with a precompiled, minified local `styles.css`, built via the Tailwind CLI from the same design tokens that were previously inline `tailwind.config` blocks in `index.html` and `admin.html`.
  - This is the **first build step this repo has had**. `package.json`'s `build` script runs `npm run build:css` automatically on every Vercel deploy.
  - `vercel.json` now sets `"outputDirectory": "."` — required once a build script exists, since this site's output isn't a separate `public/` folder, it's the repo root itself.
  - **Regenerate after any markup/class change**: `npm run build:css` (or it runs automatically on deploy).
- Self-hosted the Instagram glyph (`instagram-icon.svg`) instead of hotlinking Wikimedia.
- Added `width`/`height` to the nav logo (also removed unnecessary `loading="lazy"` + added `fetchpriority="high"`, since it's always above-the-fold) and to the product grid images in the *client-side* `renderProducts()` template, matching what `export-catalog.js` already emits.
- Added `aria-label` to the 5 icon-only modal close buttons and 2 carousel prev/next buttons — the clearest icon-only accessibility gaps. Did **not** attempt all ~79 icon usages in the audit; most already pair an icon with visible text (e.g. "+Cart") and are already accessible by name.
- Added a `<main>` landmark around the content sections (previously absent — page only had `<nav>`/`<footer>`).
- Normalized remaining "CoMo Adda" (with space) → "CoMoAdda" in `admin.html` (login subtitle, sidebar logo alt, features heading) and the `index.html` nav logo alt.
- **Reported, not changed**: `frames/` (34 PNGs, ~5.9 MB) — confirmed it's used (a continuously auto-playing canvas coffee-pour animation, `index.html`'s `initCanvasAnimation()`), not dead code, so I didn't delete it. It's already reasonably deferred (first frame loads immediately for paint, the rest load sequentially 1.5s after page `load`) but is a strong candidate for WebP/video conversion to cut that payload significantly — left untouched pending your decision, per your instruction to report rather than optimize unilaterally.

---

## TODO list for you / the client

1. ~~Fix the Google Search Console verification tag.~~ **Done.** Switched to the HTML-file-upload method: `google3a1effaa0ac78b24.html` now exists at the site root with the required `google-site-verification: google3a1effaa0ac78b24.html` content, and the (incorrectly-formatted) meta tag was removed. This required setting `"cleanUrls": false` in `vercel.json` — `cleanUrls: true` was 308-redirecting the exact `.html` URL Google's verifier requests to a clean URL that doesn't serve the file, which would have failed verification. Trade-off: pages no longer auto-redirect from `/page.html` to `/page` (e.g. `/admin.html` stays `/admin.html` instead of redirecting to `/admin`) — every page still works fine at its normal `.html` address, this only affects the optional extension-less alias.
2. **Firestore `settings/storeConfig.instagram` is stale** (`https://instagram.com/brewdipu`) — doesn't match the `comoadda` handle now hardcoded into the site. Update it via the admin panel's Instagram URL field so the two stay consistent. (Low priority: because of the Phase 2 change below, the admin panel's Instagram field *does* still take effect on the live buttons — only Hero Title / About Text were disconnected.)
3. **Admin panel's Hero Title and About Text fields no longer affect the live site** (Phase 2). If you want to keep editing these from the admin panel, tell me and I'll re-wire it — e.g., have it only apply if the value isn't the stale "Brew Dipu" copy, or add a proper "override" flag. For now, edit the hero `<h1>` / About section directly in `index.html`.
4. **Re-run `node export-catalog.js` whenever the menu changes** — new products, price changes, restocks, category changes. It's not wired into the build automatically (deliberately — it hits Firestore over the network, which shouldn't happen on every deploy). Review the diff and commit.
5. **`og-image.png` is a placeholder-quality asset** — logo centered on a solid brand-color background, 1200×630, generated by `generate_og_image.py`. No proper lifestyle/product photography existed in the repo to use instead. Swap in a real photo if you have one (keep it 1200×630, then update `og:image`/`twitter:image`/JSON-LD `image` if you rename the file).
6. **`frames/` animation (~5.9MB)** — reported in Phase 4, not touched. Consider converting the 34 PNG frames to WebP (smaller, same quality) or replacing the whole canvas-frame-sequencer with a compressed video/Lottie animation if you want to meaningfully cut this payload.
7. **AggregateRating was deliberately not added** to the JSON-LD (per your instruction) because the review submission form hardcodes `rating: 5` for every review — there's no real user-chosen rating yet. You asked for the star-picker to become interactive (1–5, real values) before this gets revisited; that wasn't part of the agreed scope for this branch and hasn't been implemented — let me know if you want it done as a follow-up.
8. **`comoadda.web.app`** — you confirmed this 404s / isn't live. Nothing to do, just noting it's not a lingering duplicate-content concern.

## Post-deploy checklist

1. Merge/deploy this branch, confirm `npm run build` succeeds on Vercel (it will run automatically).
2. In Google Search Console: fix verification (see TODO #1), then submit `https://www.comoadda.shop/sitemap.xml`.
3. Run the [Rich Results Test](https://search.google.com/test/rich-results) against the live homepage — should show `LocalBusiness`, `WebSite`, and 37 `Product` entries with no errors.
4. Run PageSpeed Insights against the live homepage — compare LCP/CLS/TBT before/after; the Tailwind CDN removal and image `width`/`height` additions should show up as real improvements.
5. Search `site:comoadda.shop` a few days after deploy to confirm `code.html`/`downloaded_index.html` drop out of the index (they were never properly indexed as far as I could tell, but worth a check since they were live for a while).
6. Spot-check a few product names in Google after a week or two to see if they start surfacing for long-tail queries.
7. Manually click through the site once on the live deploy: add to cart, open a product's customization modal, complete the WhatsApp order flow, log in / check rewards — all core flows were traced through the code and none of the business logic was touched, but I don't have browser tooling in this environment to visually click through myself. Treat this as unverified until you or someone does a manual pass.

## What I deliberately did not do, and why

- **No per-product URLs.** You chose the single-page approach (Phase 3, option C-in-B). If you want individual `/products/<slug>` pages with their own meta/JSON-LD later, that's a bigger structural change (real routing, since this is currently a static-file Vercel deploy with no framework) — happy to scope it separately.
- **No AggregateRating** — see TODO #7.
- **Didn't touch `frames/`** — reported per your instruction, not optimized without your sign-off.
- **Didn't attempt all ~79 icon-only accessibility gaps** — fixed the clearest ones (modal close buttons, carousel arrows); a full pass would be a larger, separate accessibility audit.
- **Didn't restructure the DOM to keep modal overlays strictly outside `<main>`** — a few `position:fixed` modal divs end up nested inside `<main>` because they're interspersed with content sections in the existing markup. This is harmless (modals are visually and semantically distinct via their own `role`/fixed positioning regardless of DOM nesting) but a "by the book" fix would mean moving many elements referenced extensively by JS — too large a change for the value it adds.
- **Didn't compress `logo.png`/`screen.png`** — flagged in the audit as candidates, not part of any explicitly-scoped phase; low impact compared to the Tailwind CDN and image-export work.
- **Didn't add width/height to every dynamically-inserted image** (cart drawer thumbnails, product zoom modal, collections carousel) — only the ones affecting initial-paint CLS (nav logo, product grid). The others render after user interaction, where CLS impact is minimal.
- **No visual/browser QA performed by me** — see post-deploy checklist item 7. Type/syntax checking (JS syntax validation, JSON-LD schema validation, HTTP-level smoke tests via `vercel dev`) was done throughout; actual rendered-UI verification was not, because this environment has no browser automation tooling available.
