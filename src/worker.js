/**
 * Yasmin restaurant — Cloudflare Worker
 * Public:  GET /api/site · GET/POST /api/reviews · POST /api/track · GET /img/:key · /r (Google review) · /sitemap.xml
 * Admin:   /api/admin/* (cookie session, password hashed with PBKDF2)
 * Static files (site + /admin) are served from ./public by Workers Assets.
 */
import SEED from "./seed.json";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK (id = 1), pass_hash TEXT NOT NULL, salt TEXT NOT NULL, iterations INTEGER NOT NULL, must_change INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts (ip, ts);
CREATE TABLE IF NOT EXISTS review_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rating INTEGER NOT NULL, text TEXT NOT NULL, lang TEXT, status TEXT NOT NULL DEFAULT 'pending', featured INTEGER NOT NULL DEFAULT 0, reply TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status, created_at);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, day TEXT NOT NULL, hour INTEGER, ts INTEGER NOT NULL, lang TEXT, ref TEXT, qty INTEGER DEFAULT 0, total REAL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_events_day ON events (day, type);
CREATE TABLE IF NOT EXISTS event_items (event_id INTEGER NOT NULL, item_id TEXT NOT NULL, name TEXT NOT NULL, qty INTEGER NOT NULL, day TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_event_items_day ON event_items (day);
`;

const PBKDF2_ITER = 100000;          // Workers' WebCrypto maximum
const SESSION_DAYS = 7;
const MAX_FAILS = 5;                 // per IP …
const FAIL_WINDOW = 15 * 60 * 1000;  // … per 15 minutes
const MAX_REVIEWS_PER_DAY = 3;       // per IP
const COOKIE = "__Host-yasmin";
/* view = page visit · kitchen = a kitchen menu opened · book / order / catering = WhatsApp message prepared */
const EVENT_TYPES = ["view", "kitchen", "book", "order", "catering", "chat", "call", "map", "review", "share"];
const MAX_IMAGE = 3 * 1024 * 1024;
const LANGS = ["ar", "de", "en"];

let schemaReady = false;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (!schemaReady) { await env.DB.exec(SCHEMA.replace(/\n/g, " ")); schemaReady = true; }
      const p = url.pathname;

      if (p === "/api/site" && req.method === "GET") return json(publicSite(await loadSite(env)), 200, { "Cache-Control": "public, max-age=20" });
      if (p === "/api/reviews" && req.method === "GET") return publicReviews(env);
      if (p === "/api/reviews" && req.method === "POST") return submitReview(req, env, url);
      if (p === "/api/track" && req.method === "POST") return track(req, env);
      if (p.startsWith("/img/") && req.method === "GET") return image(p.slice(5), env);
      if (p === "/r") return reviewRedirect(env);
      if (p === "/sitemap.xml") return sitemap(url);
      if (p === "/" || p === "/index.html") return homePage(req, env, url);

      if (p.startsWith("/api/admin/")) {
        const route = p.slice("/api/admin/".length);
        if (req.method !== "GET" && !sameOrigin(req, url)) return json({ error: "bad_origin" }, 403);
        if (route === "login" && req.method === "POST") return login(req, env);

        const session = await getSession(req, env);
        if (!session) return json({ error: "unauthorized" }, 401);

        if (route === "me" && req.method === "GET") return me(env);
        if (route === "logout" && req.method === "POST") return logout(req, env);
        if (route === "password" && req.method === "POST") return changePassword(req, env);
        if (route === "site" && req.method === "GET") return json(await loadSite(env), 200, { "Cache-Control": "no-store" });
        if (route === "site" && req.method === "PUT") return saveSite(req, env, ctx);
        if (route === "upload" && req.method === "POST") return upload(req, env);
        if (route === "reviews" && req.method === "GET") return adminReviews(url, env);
        const rm = route.match(/^reviews\/(\d+)$/);
        if (rm && req.method === "PATCH") return updateReview(req, env, Number(rm[1]));
        if (rm && req.method === "DELETE") return deleteReview(env, Number(rm[1]));
        if (route === "report" && req.method === "GET") return report(url, env);
        if (route === "report.csv" && req.method === "GET") return reportCsv(url, env);
        if (route === "stats" && req.method === "DELETE") return clearStats(url, env);
        return json({ error: "not_found" }, 404);
      }
      if (p.startsWith("/api/")) return json({ error: "not_found" }, 404);
      return env.ASSETS.fetch(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.code }, err.status);
      console.error(err && err.stack || err);
      return json({ error: "server_error" }, 500);
    }
  }
};

/* ------------------------------------------------------------------ helpers */
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", ...headers }
  });
}
/* Blocks requests sent from other websites (CSRF). Some browsers leave out Origin on same-site requests,
   so Sec-Fetch-Site and Referer are accepted as fallbacks. The session cookie is SameSite=Strict as well. */
function sameOrigin(req, url) {
  const o = req.headers.get("Origin");
  if (o) return o === url.origin;
  const site = req.headers.get("Sec-Fetch-Site");
  if (site) return site === "same-origin";
  const ref = req.headers.get("Referer");
  try { return !!ref && new URL(ref).origin === url.origin; } catch { return false; }
}
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
function randomToken(bytes = 32) { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return hex(a); }
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function pbkdf2(password, saltB64, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}
async function readJson(req, max = 512 * 1024) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > max) throw new HttpError(413, "too_large");
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, "too_large");
  try { return JSON.parse(text); } catch { throw new HttpError(400, "bad_json"); }
}
class HttpError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
function zoneParts(env, d = new Date()) {
  const tz = env.SHOP_TIMEZONE || "Europe/Vienna";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d)) % 24;
  return { day, hour };
}
/* IPs are only kept as a salted hash for rate limiting, and deleted after a day. */
const ipKey = async (req, env) => sha256((req.headers.get("CF-Connecting-IP") || "local") + "|" + (env.IP_SALT || "yasmin"));
const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ------------------------------------------------------------------ site data */
async function loadSite(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site'").first();
  return row ? JSON.parse(row.value) : SEED;
}
/* Hidden kitchens / sections / items never leave the server. */
function publicSite(site) {
  const s = JSON.parse(JSON.stringify(site));
  s.kitchens = (s.kitchens || []).filter((k) => !k.hidden).map((k) => {
    k.sections = (k.sections || []).filter((c) => !c.hidden).map((c) => { c.items = c.items.filter((i) => !i.hidden); return c; });
    return k;
  });
  s.gallery = (s.gallery || []).filter((g) => !g.hidden);
  return s;
}

const str = (v, max = 200) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "");
const i18n = (v, max = 200) => {
  const o = {};
  if (typeof v === "string") { const s = str(v, max); if (s) o.ar = s; return o; }
  if (v && typeof v === "object") LANGS.forEach((l) => { const s = str(v[l], max); if (s) o[l] = s; });
  return o;
};
const hasText = (o) => !!(o && (o.ar || o.de || o.en));
const httpsUrl = (v) => { const s = str(v, 500); if (!s) return ""; try { const u = new URL(s); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } };
const num = (v, min, max) => { if (v === null || v === "" || v === undefined) return null; const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : null; };
const slug = (v, fallback) => { const s = str(v, 40).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""); return s || fallback; };
const imgPath = (v) => { const s = str(v, 120); return /^\/img\/[a-z0-9-]+\.(webp|jpg|png)$/.test(s) || /^art\/[a-z0-9-]+\.svg$/.test(s) ? s : ""; };
const hm = (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null);
const ICONS = ["star", "dallah", "bread", "wrap", "cloche", "grill", "cup", "leaf", "sweet"];

function sanitizeSite(input) {
  if (!input || typeof input !== "object") throw new HttpError(400, "bad_site");
  const used = new Set();
  const uid = (v, prefix) => { let id = slug(v, prefix + "-" + randomToken(3)); while (used.has(id)) id += "-" + randomToken(2); used.add(id); return id; };

  const item = (it) => {
    const out = { id: uid(it.id, "item"), name: i18n(it.name, 80), desc: i18n(it.desc, 300) };
    if (!hasText(out.name)) throw new HttpError(400, "item_name_required");
    const img = imgPath(it.img); if (img) out.img = img;
    const opts = (Array.isArray(it.options) ? it.options : []).slice(0, 8)
      .map((o, i) => ({ id: slug(o.id, "o" + (i + 1)), name: i18n(o.name, 60), price: num(o.price, 0, 99999) }))
      .filter((o) => o.price != null && hasText(o.name));
    const seen = new Set(); opts.forEach((o) => { while (seen.has(o.id)) o.id += "x"; seen.add(o.id); });
    if (opts.length) out.options = opts;
    else { const p = num(it.price, 0, 99999); if (p == null) throw new HttpError(400, "item_price_required"); out.price = p; }
    const unit = i18n(it.unit, 30); if (hasText(unit)) out.unit = unit;
    const badge = i18n(it.badge, 30); if (hasText(badge)) out.badge = badge;
    const tags = (Array.isArray(it.tags) ? it.tags : []).filter((t) => ["veg", "spicy", "new"].includes(t)); if (tags.length) out.tags = [...new Set(tags)];
    if (it.hidden === true) out.hidden = true;
    if (it.soldOut === true) out.soldOut = true;
    const d = num(it.discount, 0, 90); if (d) out.discount = Math.round(d);
    return out;
  };

  const kitchens = (Array.isArray(input.kitchens) ? input.kitchens : []).slice(0, 8).map((k) => {
    const out = {
      id: uid(k.id, "kitchen"),
      icon: ICONS.includes(k.icon) ? k.icon : "star",
      type: k.type === "catering" ? "catering" : "menu",
      name: i18n(k.name, 60), short: i18n(k.short, 16), desc: i18n(k.desc, 300),
      sections: (Array.isArray(k.sections) ? k.sections : []).slice(0, 20).map((c) => {
        const sec = { id: uid(c.id, "sec"), name: i18n(c.name, 40), items: (Array.isArray(c.items) ? c.items : []).slice(0, 120).map(item) };
        if (!hasText(sec.name)) throw new HttpError(400, "section_name_required");
        if (c.hidden === true) sec.hidden = true;
        return sec;
      })
    };
    if (!hasText(out.name)) throw new HttpError(400, "kitchen_name_required");
    if (!hasText(out.short)) out.short = out.name;
    const img = imgPath(k.img); if (img) out.img = img;
    const mg = num(k.minGuests, 0, 1000); if (out.type === "catering" && mg) out.minGuests = Math.round(mg);
    if (k.hidden === true) out.hidden = true;
    return out;
  });

  const wa = str(input.whatsapp, 20).replace(/\D/g, "");
  if (wa && (wa.length < 8 || wa.length > 15)) throw new HttpError(400, "bad_whatsapp");
  const email = str(input.email, 120);
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(email)) throw new HttpError(400, "bad_email");

  const hours = (Array.isArray(input.hours) ? input.hours : []).slice(0, 14).map((h) => ({
    days: [...new Set((Array.isArray(h.days) ? h.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))],
    open: hm(h.open), close: hm(h.close)
  })).filter((h) => h.days.length && h.open && h.close && h.open < h.close);

  const social = {};
  ["instagram", "facebook", "tiktok", "youtube"].forEach((k) => { social[k] = httpsUrl(input.social && input.social[k]); });

  const g = input.google || {};
  const b = input.booking || {};
  const ord = input.ordering || {};
  const pickupTimes = [...new Set((Array.isArray(ord.pickupTimes) ? ord.pickupTimes : [0, 15, 30]).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 240))].sort((a, z) => a - z).slice(0, 8);
  const l = input.legal || {};
  const legal = {};
  ["company", "owner", "legalForm", "address", "phone", "email", "uid", "registerNo", "registerCourt", "gisa", "chamber", "authority", "trade"].forEach((k) => { legal[k] = str(l[k], 160); });

  const gallery = (Array.isArray(input.gallery) ? input.gallery : []).slice(0, 40).map((x) => {
    const img = imgPath(x.img); if (!img) return null;
    const o = { img, tag: ["place", "food", "events"].includes(x.tag) ? x.tag : "food", alt: i18n(x.alt, 120) };
    if (x.hidden === true) o.hidden = true;
    return o;
  }).filter(Boolean);

  return {
    name: str(input.name, 40) || "Yasmin",
    nameAr: str(input.nameAr, 40),
    logo: imgPath(input.logo),
    tagline: i18n(input.tagline, 120),
    seoDesc: i18n(input.seoDesc, 160),
    about: i18n(input.about, 1200),
    highlights: (Array.isArray(input.highlights) ? input.highlights : []).slice(0, 6).map((h) => i18n(h, 50)).filter(hasText),
    phone: str(input.phone, 30).replace(/[^\d+ ()/-]/g, ""),
    whatsapp: wa,
    email,
    address: str(input.address, 140),
    mapsQuery: str(input.mapsQuery, 160),
    google: { reviewUrl: httpsUrl(g.reviewUrl), rating: num(g.rating, 0, 5), count: Number.isInteger(Number(g.count)) && g.count !== "" && g.count !== null && Number(g.count) >= 0 ? Number(g.count) : null },
    social,
    hours,
    defaultLang: LANGS.includes(input.defaultLang) ? input.defaultLang : "de",
    currency: str(input.currency, 4) || "€",
    booking: {
      enabled: b.enabled !== false,
      maxGuests: num(b.maxGuests, 1, 500) || 20,
      slotMinutes: [15, 30, 60].includes(Number(b.slotMinutes)) ? Number(b.slotMinutes) : 30,
      lastSlotBeforeClose: num(b.lastSlotBeforeClose, 0, 240) ?? 60,
      daysAhead: num(b.daysAhead, 1, 365) || 60,
      note: i18n(b.note, 200),
      occasions: (Array.isArray(b.occasions) ? b.occasions : []).slice(0, 10).map((o) => i18n(o, 40)).filter(hasText)
    },
    ordering: { enabled: ord.enabled === true, pickupTimes: pickupTimes.length ? pickupTimes : [0] },
    messageLang: LANGS.includes(input.messageLang) ? input.messageLang : "ar",
    gallery,
    legal,
    kitchens
  };
}

async function saveSite(req, env, ctx) {
  const site = sanitizeSite(await readJson(req));
  await env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('site', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2")
    .bind(JSON.stringify(site), Date.now()).run();
  ctx.waitUntil(cleanupImages(env, site));
  return json({ ok: true, site });
}

/* Delete uploaded images that are no longer used (older than 1 hour, so fresh uploads survive). */
async function cleanupImages(env, site) {
  if (!env.IMAGES) return;
  const used = new Set([site.logo]);
  site.gallery.forEach((g) => used.add(g.img));
  site.kitchens.forEach((k) => { used.add(k.img); k.sections.forEach((c) => c.items.forEach((it) => used.add(it.img))); });
  const list = await env.IMAGES.list({ limit: 1000 });
  const old = Date.now() - 3600 * 1000;
  const dead = list.objects.filter((o) => !used.has("/img/" + o.key) && o.uploaded.getTime() < old).map((o) => o.key);
  if (dead.length) await env.IMAGES.delete(dead);
}

/* ------------------------------------------------------------------ home page: SEO data rendered on the server */
async function homePage(req, env, url) {
  const res = await env.ASSETS.fetch(new Request(new URL("/", url), { headers: req.headers }));
  if (!res.ok) return res;
  const site = await loadSite(env);
  const lang = LANGS.includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : site.defaultLang;
  const T = (o) => (o && (o[lang] || o.de || o.en || o.ar)) || "";
  const brand = lang === "ar" && site.nameAr ? `${site.nameAr} · ${site.name}` : site.name;
  const title = `${brand} – ${T(site.tagline)}`.slice(0, 60);
  const bookTxt = { ar: "احجز طاولتك عبر واتساب.", de: "Tisch per WhatsApp reservieren.", en: "Book a table on WhatsApp." }[lang];
  const desc = (T(site.seoDesc) || `${T(site.tagline)}: ${site.kitchens.filter((k) => !k.hidden).map((k) => T(k.name)).join(", ")}. ${bookTxt}`).slice(0, 158);
  const origin = url.origin;
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const ld = {
    "@context": "https://schema.org", "@type": "Restaurant", name: site.name, alternateName: site.nameAr || undefined,
    url: origin + "/", image: origin + (site.logo || "/logo.svg"), servesCuisine: ["Syrian", "Middle Eastern", "Gulf"],
    telephone: site.phone || undefined, email: site.email || undefined,
    address: site.address ? { "@type": "PostalAddress", streetAddress: site.address, addressLocality: "Wien", addressCountry: "AT" } : undefined,
    openingHours: site.hours.map((h) => `${h.days.map((d) => days[d]).join(",")} ${h.open}-${h.close}`),
    acceptsReservations: site.booking.enabled ? "True" : "False",
    hasMenu: origin + "/#menu"
  };
  return new HTMLRewriter()
    .on("html", { element(e) { e.setAttribute("lang", lang === "de" ? "de-AT" : lang); e.setAttribute("dir", lang === "ar" ? "rtl" : "ltr"); } })
    .on("title", { element(e) { e.setInnerContent(title); } })
    .on('meta[name="description"]', { element(e) { e.setAttribute("content", desc); } })
    .on('meta[property="og:title"]', { element(e) { e.setAttribute("content", title); } })
    .on('meta[property="og:description"]', { element(e) { e.setAttribute("content", desc); } })
    .on('meta[property="og:url"]', { element(e) { e.setAttribute("content", origin + "/"); } })
    .on('link[rel="canonical"]', { element(e) { e.setAttribute("href", origin + "/" + (lang !== site.defaultLang ? "?lang=" + lang : "")); } })
    .on('script[type="application/ld+json"]', { element(e) { e.setInnerContent(JSON.stringify(ld).replace(/</g, "\\u003c"), { html: false }); } })
    .on("head", { element(e) {
      LANGS.forEach((l) => e.append(`<link rel="alternate" hreflang="${l}" href="${escHtml(origin + "/?lang=" + l)}">`, { html: true }));
    } })
    .transform(new Response(res.body, { status: res.status, headers: htmlHeaders(res, lang) }));
}

function htmlHeaders(res, lang) {
  const h = new Headers(res.headers);           // keeps the security headers from public/_headers
  h.set("Content-Type", "text/html; charset=utf-8"); h.set("Cache-Control", "no-cache"); h.set("Content-Language", lang);
  h.delete("ETag"); h.delete("Content-Length");
  return h;
}

function sitemap(url) {
  const o = url.origin;
  const pages = ["/", "/?lang=ar", "/?lang=en", "/impressum.html", "/datenschutz.html"];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${escHtml(o + p)}</loc></url>`).join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

/* Short link (QR on tables): always points at the current Google review URL. */
async function reviewRedirect(env) {
  const site = await loadSite(env);
  const url = (site.google && site.google.reviewUrl) ||
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(site.mapsQuery || site.address || site.name + " Wien");
  const { day, hour } = zoneParts(env);
  await env.DB.prepare("INSERT INTO events (type, day, hour, ts) VALUES ('review', ?, ?, ?)").bind(day, hour, Date.now()).run();
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });
}

/* ------------------------------------------------------------------ reviews */
async function publicReviews(env) {
  const [list, stats] = await env.DB.batch([
    env.DB.prepare("SELECT id, name, rating, text, lang, featured, reply, created_at FROM reviews WHERE status = 'approved' ORDER BY featured DESC, created_at DESC LIMIT 30"),
    env.DB.prepare("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE status = 'approved'")
  ]);
  const s = stats.results[0] || { n: 0, avg: null };
  return json({ reviews: list.results, count: s.n, average: s.avg ? Math.round(s.avg * 10) / 10 : null }, 200, { "Cache-Control": "public, max-age=30" });
}

async function submitReview(req, env, url) {
  if (!sameOrigin(req, url)) return json({ error: "bad_origin" }, 403);
  const body = await readJson(req, 4096);
  if (str(body.website, 50)) return json({ ok: true });          // honeypot: bots fill every field
  if (body.consent !== true) return json({ error: "consent_required" }, 400);
  const name = str(body.name, 40);
  const text = str(body.text, 600);
  const rating = Number(body.rating);
  if (name.length < 2) return json({ error: "name_required" }, 400);
  if (text.length < 10) return json({ error: "text_too_short" }, 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: "rating_required" }, 400);
  if (/https?:\/\/|www\./i.test(text + name)) return json({ error: "no_links" }, 400);

  const ip = await ipKey(req, env);
  const now = Date.now();
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM review_attempts WHERE ip = ? AND ts > ?").bind(ip, now - 86400000).first();
  if (n.n >= MAX_REVIEWS_PER_DAY) return json({ error: "too_many" }, 429);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM review_attempts WHERE ts < ?").bind(now - 86400000),
    env.DB.prepare("INSERT INTO review_attempts (ip, ts) VALUES (?, ?)").bind(ip, now),
    env.DB.prepare("INSERT INTO reviews (name, rating, text, lang, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)")
      .bind(name, rating, text, LANGS.includes(body.lang) ? body.lang : null, now)
  ]);
  return json({ ok: true, pending: true });
}

async function adminReviews(url, env) {
  const status = ["pending", "approved", "hidden"].includes(url.searchParams.get("status")) ? url.searchParams.get("status") : null;
  const q = status
    ? env.DB.prepare("SELECT * FROM reviews WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status)
    : env.DB.prepare("SELECT * FROM reviews ORDER BY created_at DESC LIMIT 200");
  const [list, counts] = await env.DB.batch([q, env.DB.prepare("SELECT status, COUNT(*) AS n FROM reviews GROUP BY status")]);
  const c = { pending: 0, approved: 0, hidden: 0 }; counts.results.forEach((r) => (c[r.status] = r.n));
  return json({ reviews: list.results, counts: c }, 200, { "Cache-Control": "no-store" });
}
async function updateReview(req, env, id) {
  const body = await readJson(req, 4096);
  const row = await env.DB.prepare("SELECT id FROM reviews WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "not_found" }, 404);
  const sets = [], vals = [];
  if (["pending", "approved", "hidden"].includes(body.status)) { sets.push("status = ?"); vals.push(body.status); }
  if (typeof body.featured === "boolean") { sets.push("featured = ?"); vals.push(body.featured ? 1 : 0); }
  if (typeof body.reply === "string") { sets.push("reply = ?"); vals.push(str(body.reply, 400) || null); }
  if (!sets.length) return json({ error: "nothing_to_update" }, 400);
  await env.DB.prepare(`UPDATE reviews SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id).run();
  return json({ ok: true });
}
async function deleteReview(env, id) {
  await env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

/* ------------------------------------------------------------------ images */
async function upload(req, env) {
  if (!env.IMAGES) return json({ error: "storage_missing" }, 500);
  const form = await req.formData().catch(() => null);
  const file = form && form.get("file");
  if (!file || typeof file === "string") return json({ error: "no_file" }, 400);
  if (file.size > MAX_IMAGE) return json({ error: "too_large" }, 413);
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type) return json({ error: "bad_type" }, 415);
  const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" }[type];
  const key = `${Date.now().toString(36)}-${randomToken(6)}.${ext}`;
  await env.IMAGES.put(key, buf, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
  return json({ ok: true, url: "/img/" + key });
}
function sniff(b) {
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  return null;
}
async function image(key, env) {
  if (!/^[a-z0-9-]+\.(webp|jpg|png)$/.test(key) || !env.IMAGES) return new Response("Not found", { status: 404 });
  const obj = await env.IMAGES.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: { "Content-Type": obj.httpMetadata?.contentType || "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" }
  });
}

/* ------------------------------------------------------------------ tracking (no names or phone numbers are stored) */
async function track(req, env) {
  let body;
  try { body = await readJson(req, 4096); } catch { return new Response(null, { status: 204 }); }
  const type = EVENT_TYPES.includes(body.type) ? body.type : null;
  if (!type) return new Response(null, { status: 204 });
  const { day, hour } = zoneParts(env);
  const lang = LANGS.includes(body.lang) ? body.lang : null;
  const site = ["kitchen", "order", "catering"].includes(type) ? await loadSite(env) : null;

  let ref = null, qty = 0, total = 0, lines = [];
  if (type === "kitchen" && site) {
    ref = site.kitchens.some((k) => k.id === body.ref) ? body.ref : null;
    if (!ref) return new Response(null, { status: 204 });
  }
  if (type === "book" || type === "catering") qty = Math.min(1000, Math.max(0, parseInt(body.guests, 10) || 0));
  if (type === "order" && Array.isArray(body.items)) {
    // Prices are recomputed from the saved menu; the browser's numbers are never trusted.
    const index = {};
    site.kitchens.forEach((k) => k.sections.forEach((c) => c.items.forEach((it) => (index[it.id] = it))));
    lines = body.items.slice(0, 40).map((l) => {
      const it = index[l && l.id]; const q = Math.min(99, Math.max(1, parseInt(l && l.qty, 10) || 0));
      if (!it || !q) return null;
      const opt = it.options ? (it.options.find((o) => o.id === l.opt) || it.options[0]) : null;
      const base = opt ? opt.price : it.price;
      const price = it.discount ? Math.round(base * (100 - it.discount)) / 100 : base;
      const name = (it.name.ar || it.name.de || it.name.en) + (opt ? " – " + (opt.name.ar || opt.name.de || opt.name.en) : "");
      return { id: it.id + (opt ? ":" + opt.id : ""), name, qty: q, sum: price * q };
    }).filter(Boolean);
    if (!lines.length) return new Response(null, { status: 204 });
    qty = lines.reduce((a, l) => a + l.qty, 0);
    total = Math.round(lines.reduce((a, l) => a + l.sum, 0) * 100) / 100;
  }

  const res = await env.DB.prepare("INSERT INTO events (type, day, hour, ts, lang, ref, qty, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(type, day, hour, Date.now(), lang, ref, qty, total).run();
  if (lines.length) {
    const id = res.meta.last_row_id;
    await env.DB.batch(lines.map((l) => env.DB.prepare("INSERT INTO event_items (event_id, item_id, name, qty, day) VALUES (?, ?, ?, ?, ?)").bind(id, l.id, l.name, l.qty, day)));
  }
  return new Response(null, { status: 204 });
}

/* ------------------------------------------------------------------ auth */
function getCookie(req, name) {
  const c = req.headers.get("Cookie") || "";
  const m = c.split(/;\s*/).find((p) => p.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}
function sessionCookie(token, maxAge) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
async function getSession(req, env) {
  const token = getCookie(req, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await env.DB.prepare("SELECT token_hash, expires_at FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first();
  if (!row || row.expires_at < Date.now()) return null;
  return row;
}
async function createSession(env) {
  const token = randomToken();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    env.DB.prepare("INSERT INTO sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)").bind(await sha256(token), now + SESSION_DAYS * 86400000, now)
  ]);
  return token;
}
async function setPassword(env, password, mustChange) {
  const saltBytes = new Uint8Array(16); crypto.getRandomValues(saltBytes);
  const salt = b64(saltBytes);
  const hash = await pbkdf2(password, salt, PBKDF2_ITER);
  await env.DB.prepare("INSERT INTO admin (id, pass_hash, salt, iterations, must_change, updated_at) VALUES (1, ?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO UPDATE SET pass_hash = ?1, salt = ?2, iterations = ?3, must_change = ?4, updated_at = ?5")
    .bind(hash, salt, PBKDF2_ITER, mustChange ? 1 : 0, Date.now()).run();
}

async function login(req, env) {
  const ip = await ipKey(req, env);
  const now = Date.now();
  const fails = await env.DB.prepare("SELECT COUNT(*) AS n, MIN(ts) AS first FROM login_attempts WHERE ip = ? AND ts > ?").bind(ip, now - FAIL_WINDOW).first();
  if (fails.n >= MAX_FAILS) {
    const wait = Math.ceil((fails.first + FAIL_WINDOW - now) / 60000);
    return json({ error: "locked", minutes: Math.max(1, wait) }, 429);
  }
  let body; try { body = await readJson(req, 2048); } catch { return json({ error: "bad_json" }, 400); }
  const password = typeof body.password === "string" ? body.password : "";

  const admin = await env.DB.prepare("SELECT * FROM admin WHERE id = 1").first();
  let ok = false;
  if (admin) {
    ok = safeEqual(await pbkdf2(password, admin.salt, admin.iterations), admin.pass_hash);
  } else if (env.ADMIN_INITIAL_PASSWORD) {
    // First login: accept the setup secret once, then store it hashed and force a change.
    ok = password.length > 0 && safeEqual(await sha256(password), await sha256(env.ADMIN_INITIAL_PASSWORD));
    if (ok) await setPassword(env, password, true);
  } else {
    return json({ error: "not_configured" }, 503);
  }

  if (!ok) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO login_attempts (ip, ts) VALUES (?, ?)").bind(ip, now),
      env.DB.prepare("DELETE FROM login_attempts WHERE ts < ?").bind(now - 86400000)
    ]);
    return json({ error: "wrong_password", left: Math.max(0, MAX_FAILS - fails.n - 1) }, 401);
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  const token = await createSession(env);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86400) });
}

async function me(env) {
  const admin = await env.DB.prepare("SELECT must_change, updated_at FROM admin WHERE id = 1").first();
  const pending = await env.DB.prepare("SELECT COUNT(*) AS n FROM reviews WHERE status = 'pending'").first();
  return json({ ok: true, mustChange: !!(admin && admin.must_change), passwordUpdated: admin ? admin.updated_at : null, pendingReviews: pending.n }, 200, { "Cache-Control": "no-store" });
}

async function logout(req, env) {
  const token = getCookie(req, COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

async function changePassword(req, env) {
  let body; try { body = await readJson(req, 2048); } catch { return json({ error: "bad_json" }, 400); }
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  const admin = await env.DB.prepare("SELECT * FROM admin WHERE id = 1").first();
  if (!admin || !safeEqual(await pbkdf2(current, admin.salt, admin.iterations), admin.pass_hash)) return json({ error: "wrong_password" }, 401);
  if (next.length < 10 || next.length > 128) return json({ error: "weak_password" }, 400);
  if (next === current) return json({ error: "same_password" }, 400);
  await setPassword(env, next, false);
  await env.DB.prepare("DELETE FROM sessions").run();          // sign out every device
  const token = await createSession(env);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86400) });
}

/* ------------------------------------------------------------------ reports */
function yearOf(url) {
  const y = parseInt(url.searchParams.get("year"), 10);
  const now = new Date().getUTCFullYear();
  return Number.isInteger(y) && y >= 2020 && y <= now + 1 ? y : now;
}
const round2 = (n) => Math.round((n || 0) * 100) / 100;

async function report(url, env) {
  const r = await buildReport(url, env);
  return json(r, 200, { "Cache-Control": "no-store" });
}
async function buildReport(url, env) {
  const year = yearOf(url);
  const from = `${year}-01-01`, to = `${year}-12-31`;
  const [byMonth, top, kitchens, byWeekday, byHour, years, reviews] = await env.DB.batch([
    env.DB.prepare("SELECT type, CAST(substr(day, 6, 2) AS INTEGER) AS m, COUNT(*) AS n, SUM(total) AS total, SUM(qty) AS qty FROM events WHERE day BETWEEN ? AND ? GROUP BY type, m").bind(from, to),
    env.DB.prepare("SELECT item_id, name, SUM(qty) AS qty FROM event_items WHERE day BETWEEN ? AND ? GROUP BY item_id ORDER BY qty DESC LIMIT 10").bind(from, to),
    env.DB.prepare("SELECT ref, COUNT(*) AS n FROM events WHERE type = 'kitchen' AND day BETWEEN ? AND ? GROUP BY ref ORDER BY n DESC").bind(from, to),
    env.DB.prepare("SELECT CAST(strftime('%w', day) AS INTEGER) AS wd, COUNT(*) AS n FROM events WHERE type IN ('book', 'order') AND day BETWEEN ? AND ? GROUP BY wd").bind(from, to),
    env.DB.prepare("SELECT hour, COUNT(*) AS n FROM events WHERE type IN ('book', 'order') AND day BETWEEN ? AND ? GROUP BY hour").bind(from, to),
    env.DB.prepare("SELECT DISTINCT substr(day, 1, 4) AS y FROM events ORDER BY y DESC"),
    env.DB.prepare("SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE status = 'approved'")
  ]);
  const blank = () => Object.fromEntries([...EVENT_TYPES, "guests", "cateringGuests", "revenue", "items"].map((k) => [k, 0]));
  const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, ...blank() }));
  const totals = blank();
  byMonth.results.forEach((r) => {
    const mo = months[r.m - 1]; if (!mo) return;
    mo[r.type] = r.n; totals[r.type] += r.n;
    if (r.type === "book") { mo.guests = r.qty || 0; totals.guests += r.qty || 0; }
    if (r.type === "catering") { mo.cateringGuests = r.qty || 0; totals.cateringGuests += r.qty || 0; }
    if (r.type === "order") { mo.revenue = round2(r.total); mo.items = r.qty || 0; totals.revenue += r.total || 0; totals.items += r.qty || 0; }
  });
  totals.revenue = round2(totals.revenue);
  const weekdays = Array(7).fill(0); byWeekday.results.forEach((r) => (weekdays[r.wd] = r.n));
  const hours = Array(24).fill(0); byHour.results.forEach((r) => { if (r.hour != null) hours[r.hour] = r.n; });
  const yrs = years.results.map((r) => Number(r.y));
  if (!yrs.includes(year)) yrs.unshift(year);
  const rv = reviews.results[0] || {};
  return { year, years: [...new Set(yrs)].sort((a, b) => b - a), totals, months, top: top.results, kitchens: kitchens.results, weekdays, hours,
    reviews: { count: rv.n || 0, average: rv.avg ? Math.round(rv.avg * 10) / 10 : null } };
}

/* Spreadsheet apps run cells that start with = + - @ as formulas, so those cells get a leading apostrophe. */
const csvCell = (c) => {
  let s = String(c ?? "");
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};
async function reportCsv(url, env) {
  const r = await buildReport(url, env);
  const site = await loadSite(env);
  const kname = Object.fromEntries(site.kitchens.map((k) => [k.id, k.name.ar || k.name.de || k.id]));
  const names = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const rows = [["الشهر", "زيارات الموقع", "فتح المنيو", "طلبات حجز", "عدد الضيوف", "طلبات كترينج", "طلبات طعام", "قيمة الطلبات €", "محادثات واتساب", "اتصالات", "فتح الخريطة", "تقييم Google"]];
  r.months.forEach((m) => rows.push([names[m.m - 1], m.view, m.kitchen, m.book, m.guests, m.catering, m.order, m.revenue.toFixed(2), m.chat, m.call, m.map, m.review]));
  const t = r.totals;
  rows.push(["المجموع", t.view, t.kitchen, t.book, t.guests, t.catering, t.order, t.revenue.toFixed(2), t.chat, t.call, t.map, t.review]);
  rows.push([]); rows.push(["المطبخ", "مرات الفتح"]);
  r.kitchens.forEach((k) => rows.push([kname[k.ref] || k.ref, k.n]));
  if (r.top.length) { rows.push([]); rows.push(["الأكثر طلبًا", "الكمية"]); r.top.forEach((x) => rows.push([x.name, x.qty])); }
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="yasmin-report-${r.year}.csv"`, "Cache-Control": "no-store" } });
}

async function clearStats(url, env) {
  const year = yearOf(url);
  const from = `${year}-01-01`, to = `${year}-12-31`;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM events WHERE day BETWEEN ? AND ?").bind(from, to),
    env.DB.prepare("DELETE FROM event_items WHERE day BETWEEN ? AND ?").bind(from, to)
  ]);
  return json({ ok: true });
}
