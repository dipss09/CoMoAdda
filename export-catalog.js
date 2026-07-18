#!/usr/bin/env node
/**
 * Export the live Firestore product catalog + store hours into index.html as
 * static, crawlable HTML + Product JSON-LD, so search engines and AI answer
 * engines see the real menu without executing JavaScript.
 *
 * Re-run this WHENEVER THE MENU CHANGES (products added/removed/priced/
 * restocked via the admin panel) or the store schedule changes:
 *
 *     node export-catalog.js
 *
 * Then commit the resulting diff (index.html + any new/changed files under
 * products/). The live site keeps working exactly as before in the meantime —
 * the existing Firestore onSnapshot listeners still hydrate on top of this
 * static baseline and fully replace it once real-time data loads (see
 * renderProducts() in index.html).
 *
 * Reads Firestore via the public REST API using the same project the client
 * SDK already uses (brewdipu-f2092) — no service-account credentials needed,
 * since the products/settings collections already allow public reads (the
 * site itself reads them unauthenticated in the browser).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const PROJECT_ID = "brewdipu-f2092";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const INDEX_HTML = path.join(__dirname, "index.html");
const SITEMAP_XML = path.join(__dirname, "sitemap.xml");
const PRODUCTS_DIR = path.join(__dirname, "products");
const SITE_URL = "https://www.comoadda.shop";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAME = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`GET ${url} -> ${res.statusCode}: ${body.slice(0, 500)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

// Convert a Firestore REST "Value" object into a plain JS value.
function fsValue(v) {
  if (v == null) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return parseInt(v.integerValue, 10);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fsValue);
  if ("mapValue" in v) return fsFields(v.mapValue.fields || {});
  if ("timestampValue" in v) return v.timestampValue;
  return null;
}

function fsFields(fields) {
  const out = {};
  for (const k of Object.keys(fields)) out[k] = fsValue(fields[k]);
  return out;
}

async function fetchAllDocs(collection) {
  const docs = [];
  let pageToken = "";
  do {
    const url = `${BASE_URL}/${collection}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = await httpsGetJson(url);
    (page.documents || []).forEach((d) => {
      docs.push({ id: d.name.split("/").pop(), ...fsFields(d.fields || {}) });
    });
    pageToken = page.nextPageToken || "";
  } while (pageToken);
  return docs;
}

async function fetchDoc(collection, docId) {
  const url = `${BASE_URL}/${collection}/${docId}`;
  const doc = await httpsGetJson(url);
  return fsFields(doc.fields || {});
}

function extFromDataUri(dataUri) {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,/.exec(dataUri);
  if (!m) return null;
  return m[1] === "jpeg" ? "jpg" : m[1];
}

// Decode a base64 data URI to a real file under products/, deduping by
// content hash so re-running the export doesn't churn unchanged images.
function materializeImage(productId, index, dataUri, seenHashes) {
  const ext = extFromDataUri(dataUri);
  if (!ext) return null; // not a data URI (already a hosted URL) — use as-is
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const buf = Buffer.from(base64, "base64");
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10);

  if (seenHashes.has(hash)) return seenHashes.get(hash); // duplicate image within this product
  const filename = `${productId}-${index}-${hash}.${ext}`;
  const filePath = path.join(PRODUCTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    fs.writeFileSync(filePath, buf);
  }
  const url = `/products/${filename}`;
  seenHashes.set(hash, url);
  return url;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function renderProductCard(p) {
  const isOutOfStock = p.outOfStock === true;
  const btnText = isOutOfStock ? "Out of Stock" : "Add to Cart";
  const btnIcon = isOutOfStock ? "block" : "arrow_forward";
  const name = escapeHtml(p.name || "");
  const desc = escapeHtml(p.desc || "");

  const priceBadge = `
          <div class="absolute top-1 right-1 md:top-4 md:right-4 bg-primary text-white px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-sm font-bold shadow-lg flex items-center gap-1">
             ${p.originalPrice && p.originalPrice > p.price ? `<span class="line-through text-white/70 text-[8px] md:text-xs font-normal">₹${p.originalPrice}</span>` : ""}
             ₹${p.price}
          </div>
          <div class="absolute top-1 left-1 md:top-4 md:left-4 bg-white/90 backdrop-blur text-primary px-1.5 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold shadow">${escapeHtml(p.badge || "")}</div>`;

  let media;
  if (p.images && p.images.length > 1) {
    media = `
          <div class="w-full h-full relative bg-white/5">
            ${p.images.map((url, i) => `<img class="absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${isOutOfStock ? "grayscale opacity-70" : ""} ${i === 0 ? "opacity-100" : "opacity-0"}" src="${escapeAttr(url)}" alt="${name} view ${i + 1}" loading="${i === 0 ? "eager" : "lazy"}" width="400" height="400">`).join("")}
          </div>`;
  } else {
    const src = (p.images && p.images[0]) || p.img || "";
    media = `
          <img class="w-full h-full object-contain ${isOutOfStock ? "grayscale opacity-70" : ""}" src="${escapeAttr(src)}" alt="${name}" loading="lazy" width="400" height="400"/>`;
  }

  const footer = isOutOfStock
    ? `
        <div class="mt-auto">
          <div class="w-full py-1.5 md:py-4 bg-red-100 text-red-700 rounded-lg md:rounded-xl font-black uppercase tracking-wide flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-base cursor-not-allowed border border-red-200">
            <span class="material-symbols-outlined text-[12px] md:text-base">block</span> Out of Stock
          </div>
        </div>`
    : `
        <div class="flex gap-1 md:gap-2 mt-auto">
          <button onclick="event.stopPropagation();addToCart('${p.id}')" class="flex-1 py-1.5 md:py-4 bg-surface-container-highest text-primary rounded-lg md:rounded-xl font-black uppercase tracking-wide flex items-center justify-center gap-0.5 md:gap-1 hover:bg-outline-variant transition-colors group/btn text-[10px] md:text-base">
            +Cart <span class="material-symbols-outlined text-[9px] md:text-sm hidden md:inline group-hover/btn:translate-x-1 transition-transform">add_shopping_cart</span>
          </button>
          <button onclick="event.stopPropagation();buyNow('${p.id}')" class="flex-1 py-1.5 md:py-4 bg-primary text-white rounded-lg md:rounded-xl font-black uppercase tracking-wide flex items-center justify-center gap-0.5 md:gap-1 hover:opacity-90 transition-opacity group/btn2 text-[10px] md:text-base" style="background-color: #331917; color: #ffffff;">
            Buy Now <span class="material-symbols-outlined text-[9px] md:text-sm hidden md:inline group-hover/btn2:translate-x-1 transition-transform">bolt</span>
          </button>
        </div>`;

  return `
      <div data-exported-product data-product-id="${escapeAttr(p.id)}" class="glass-card p-2 md:p-6 rounded-xl md:rounded-[2rem] hover:-translate-y-1 md:hover:-translate-y-4 transition-all duration-500 flex flex-col group cursor-pointer" onclick="openProductZoom('${p.id}')">
        <div class="relative mb-2 md:mb-8 aspect-square rounded-lg md:rounded-2xl overflow-hidden bg-surface-container">${media}${priceBadge}
        </div>
        <h3 class="text-xs md:text-2xl font-bold ${isOutOfStock ? "text-outline line-through" : "text-primary"} mb-0.5 md:mb-2 leading-tight truncate">${name}</h3>
        <p class="text-on-surface-variant text-[10px] md:text-sm mb-2 md:mb-6 flex-1 line-clamp-2 md:line-clamp-none leading-snug">${desc}</p>${footer}
      </div>`;
}

function renderProductGrid(products) {
  const categories = {};
  products.forEach((p) => {
    const cat = p.category && p.category.trim() !== "" ? p.category.trim() : "Other";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  });

  let html = "";
  for (const cat of Object.keys(categories)) {
    const catSlug = cat.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    html += `
      <div class="col-span-full mt-6 md:mt-12 pt-6 md:pt-12 border-t-2 border-outline/10 first:border-0 first:mt-0 first:pt-0" id="cat-${catSlug}">
        <h3 class="text-xl md:text-4xl font-black text-primary mb-2 md:mb-6 uppercase tracking-widest">${escapeHtml(cat)}</h3>
      </div>`;
    html += categories[cat].map(renderProductCard).join("");
  }
  return html;
}

function buildProductJsonLd(products) {
  return products.map((p) => ({
    "@type": "Product",
    "@id": `${SITE_URL}/#product-${p.id}`,
    name: p.name || "",
    description: p.desc || "",
    category: p.category || "Other",
    image: (p.images && p.images.length ? p.images : [p.img]).filter(Boolean).map((u) => `${SITE_URL}${u}`),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/#products`,
      priceCurrency: "INR",
      price: String(p.price ?? ""),
      availability: p.outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    },
  }));
}

function buildOpeningHours(storeConfig) {
  if (!storeConfig.autoLive || !storeConfig.schedule) return null;
  const spec = [];
  for (const day of DAY_ORDER) {
    const d = storeConfig.schedule[day];
    if (!d || d.closedAllDay) continue;
    spec.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY_NAME[day]}`,
      opens: d.open,
      closes: d.close,
    });
  }
  return spec.length ? spec : null;
}

function replaceBetweenMarkers(html, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers not found or out of order: ${startMarker} / ${endMarker}`);
  }
  return html.slice(0, start + startMarker.length) + replacement + html.slice(end);
}

async function main() {
  console.log("Fetching products from Firestore...");
  const rawProducts = await fetchAllDocs("products");
  console.log(`  -> ${rawProducts.length} products`);

  console.log("Fetching settings/storeConfig...");
  const storeConfig = await fetchDoc("settings", "storeConfig");

  if (rawProducts.length === 0) {
    console.error("ERROR: products collection is empty. Refusing to export — this would wipe the catalog.");
    process.exit(1);
  }

  console.log("Extracting embedded product images to products/ ...");
  const products = rawProducts.map((raw) => {
    const seenHashes = new Map();
    const sourceImages = (raw.images && raw.images.length ? raw.images : raw.img ? [raw.img] : []);
    const images = sourceImages
      .map((dataUriOrUrl, i) => {
        const materialized = materializeImage(raw.id, i, dataUriOrUrl, seenHashes);
        return materialized || dataUriOrUrl; // already a hosted URL
      })
      .filter((v, i, arr) => arr.indexOf(v) === i); // dedupe identical URLs

    return {
      id: raw.id,
      name: raw.name || "",
      desc: raw.desc || "",
      category: raw.category || "Other",
      price: raw.price,
      originalPrice: raw.originalPrice,
      badge: raw.badge || "",
      outOfStock: raw.outOfStock === true,
      images,
      img: images[0] || raw.img || "",
    };
  });

  let html = fs.readFileSync(INDEX_HTML, "utf8");

  console.log("Injecting static product grid...");
  const gridHtml = renderProductGrid(products);
  html = replaceBetweenMarkers(
    html,
    "<!-- EXPORT:PRODUCTS:START (generated by export-catalog.js — do not edit by hand) -->",
    "<!-- EXPORT:PRODUCTS:END -->",
    gridHtml + "\n      "
  );

  console.log("Injecting Product JSON-LD...");
  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": buildProductJsonLd(products),
  };
  const productJsonLdBlock = `\n  <script type="application/ld+json">\n${JSON.stringify(productJsonLd, null, 2)}\n  </script>\n  `;
  html = replaceBetweenMarkers(
    html,
    "<!-- EXPORT:PRODUCT_JSONLD:START (generated by export-catalog.js — do not edit by hand) -->",
    "<!-- EXPORT:PRODUCT_JSONLD:END -->",
    productJsonLdBlock
  );

  console.log("Updating LocalBusiness openingHoursSpecification...");
  const openingHours = buildOpeningHours(storeConfig);
  if (openingHours) {
    const ldMatch = html.match(/<script type="application\/ld\+json">\s*\n([\s\S]*?)\n\s*<\/script>/);
    if (!ldMatch) throw new Error("Primary JSON-LD block not found");
    const data = JSON.parse(ldMatch[1]);
    const business = data["@graph"].find((n) => n["@type"] === "LocalBusiness");
    if (business) {
      business.openingHoursSpecification = openingHours;
      const newBlock = `<script type="application/ld+json">\n  ${JSON.stringify(data, null, 2).replace(/\n/g, "\n  ")}\n  </script>`;
      html = html.slice(0, ldMatch.index) + newBlock + html.slice(ldMatch.index + ldMatch[0].length);
    }
  } else {
    console.log("  -> no autoLive schedule found in storeConfig, skipping openingHours");
  }

  fs.writeFileSync(INDEX_HTML, html, "utf8");

  if (fs.existsSync(SITEMAP_XML)) {
    const today = new Date().toISOString().slice(0, 10);
    let sitemap = fs.readFileSync(SITEMAP_XML, "utf8");
    sitemap = sitemap.replace(/<lastmod>.*?<\/lastmod>/, `<lastmod>${today}</lastmod>`);
    fs.writeFileSync(SITEMAP_XML, sitemap, "utf8");
    console.log(`Updated sitemap.xml lastmod to ${today}`);
  }

  console.log(`Done. Exported ${products.length} products.`);
  console.log("Review the diff, then commit index.html, sitemap.xml, and any new files under products/.");
}

main().catch((err) => {
  console.error("Export failed:", err.message);
  process.exit(1);
});
