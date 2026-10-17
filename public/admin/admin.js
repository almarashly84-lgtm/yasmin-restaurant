/* Yasmin — dashboard. Everything the public site shows is edited here and saved to /api/admin/site. */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "value") el.value = v;
      else if (k === "checked") el.checked = !!v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };
  const LANGS = [["ar", "ع"], ["de", "DE"], ["en", "EN"]];
  const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const ICONS = { star: "نجمة دمشقية", dallah: "دلّة قهوة", bread: "منقوشة", wrap: "سندويش", cloche: "طبق مغطّى", grill: "مشاوي", cup: "فنجان", leaf: "ورقة", sweet: "حلويات" };
  const ERR = {
    item_name_required: "يوجد صنف بلا اسم. اكتب اسمه بلغة واحدة على الأقل.", item_price_required: "يوجد صنف بلا سعر.",
    kitchen_name_required: "يوجد مطبخ بلا اسم.", section_name_required: "يوجد قسم بلا اسم.", bad_whatsapp: "رقم الواتساب غير صحيح. اكتبه بالأرقام مع رمز الدولة، مثل 4366012345678.",
    bad_email: "الإيميل غير صحيح.", too_large: "الملف كبير جدًا.", bad_type: "نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP.", unauthorized: "انتهت الجلسة. سجّل الدخول من جديد.",
    wrong_password: "كلمة السر غير صحيحة.", weak_password: "كلمة السر الجديدة قصيرة (10 أحرف على الأقل).", same_password: "اختر كلمة سر مختلفة عن الحالية.",
    not_configured: "لم تُضبط كلمة السر المؤقتة بعد في Cloudflare (ADMIN_INITIAL_PASSWORD).", storage_missing: "تخزين الصور غير مربوط في Cloudflare."
  };

  let site = null;          // working copy
  let saved = "";           // last saved JSON, to know if something changed
  let tab = "report";
  let pending = 0;

  /* ------------------------------------------------------------ helpers */
  const toast = (msg, bad = false) => { const el = $("#toast"); el.textContent = msg; el.classList.toggle("bad", bad); el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 3200); };
  async function api(path, opts = {}) {
    const r = await fetch("/api/admin/" + path, { credentials: "same-origin", ...opts, headers: { ...(opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) } });
    let d = {}; try { d = await r.json(); } catch { /* csv or empty */ }
    if (r.status === 401 && path !== "login" && path !== "password") { showGate(); throw new Error("unauthorized"); }
    if (!r.ok) { const e = new Error(d.error || "server_error"); e.data = d; throw e; }
    return d;
  }
  const errText = (e) => ERR[e.message] || "حدث خطأ. حاول مرة أخرى.";
  const tx = (o) => (o && (o.ar || o.de || o.en)) || "";
  const money = (n) => (Number(n) || 0).toFixed(2).replace(".", ",") + " €";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const src = (p) => (p ? (p.startsWith("/") ? p : "/" + p) : "/logo.svg");   // art/… paths are relative to the site root
  const newId = (p) => p + "-" + Math.random().toString(36).slice(2, 7);
  const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };

  function markDirty() {
    const dirty = JSON.stringify(site) !== saved;
    $("#saveBtn").disabled = !dirty;
    $("#saveState").textContent = dirty ? "تغييرات غير محفوظة" : "";
  }
  addEventListener("beforeunload", (e) => { if (site && JSON.stringify(site) !== saved) { e.preventDefault(); e.returnValue = ""; } });

  /* form building blocks — every input writes straight into the working copy */
  function field(label, obj, key, opts = {}) {
    const tag = opts.area ? "textarea" : "input";
    const inp = h(tag, { class: "in", type: opts.type || (opts.area ? null : "text"), value: obj[key] ?? "", placeholder: opts.ph || null, dir: opts.dir || null, inputmode: opts.inputmode || null, maxlength: opts.max || null, rows: opts.rows || null, min: opts.min ?? null, max: opts.maxv ?? null, step: opts.step || null });
    inp.addEventListener("input", () => {
      let v = inp.value;
      if (opts.type === "number") v = v === "" ? null : Number(v);
      obj[key] = v; opts.onchange && opts.onchange(v); markDirty();
    });
    return h("label", { class: "field" }, h("span", { text: label }), inp, opts.help ? h("small", { class: "help", text: opts.help }) : null);
  }
  function tri(label, obj, key, opts = {}) {
    if (!obj[key] || typeof obj[key] !== "object") obj[key] = {};
    const o = obj[key];
    return h("div", { class: "tri" }, h("span", { text: label }),
      ...LANGS.map(([l, short]) => {
        const inp = h(opts.area ? "textarea" : "input", { class: "in", value: o[l] || "", lang: l, dir: l === "ar" ? "rtl" : "ltr", rows: opts.rows || (opts.area ? 3 : null), maxlength: opts.max || null, "aria-label": `${label} (${short})` });
        inp.addEventListener("input", () => { o[l] = inp.value; opts.onchange && opts.onchange(); markDirty(); });
        return h("div", { class: "row" }, h("b", { text: short }), inp);
      }));
  }
  function check(label, obj, key, onchange) {
    const inp = h("input", { type: "checkbox", checked: !!obj[key] });
    inp.addEventListener("change", () => { if (inp.checked) obj[key] = true; else delete obj[key]; onchange && onchange(inp.checked); markDirty(); });
    return h("label", { class: "check" }, inp, label);
  }
  function select(label, obj, key, options, onchange) {
    const sel = h("select", { class: "in" }, ...options.map(([v, t]) => h("option", { value: v, text: t })));
    sel.value = String(obj[key] ?? options[0][0]);
    sel.addEventListener("change", () => { const n = Number(sel.value); obj[key] = sel.value !== "" && String(n) === sel.value ? n : sel.value; onchange && onchange(); markDirty(); });
    return h("label", { class: "field" }, h("span", { text: label }), sel);
  }

  /* image upload: phone photos are shrunk to 1600px WebP/JPEG before upload */
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error("bad_type");
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      let blob = await new Promise((res) => c.toBlob(res, "image/webp", .82));
      if (!blob || blob.type !== "image/webp") blob = await new Promise((res) => c.toBlob(res, "image/jpeg", .85));
      return blob || file;
    } catch { return file; }
  }
  async function uploadImage(file) {
    const blob = await shrink(file);
    const fd = new FormData(); fd.append("file", blob, "photo");
    const d = await api("upload", { method: "POST", body: fd });
    return d.url;
  }
  function imagePicker(label, obj, key, onchange) {
    const img = h("img", { src: src(obj[key]), alt: "" });
    const file = h("input", { type: "file", accept: "image/*" });
    const btn = h("button", { type: "button", class: "btn sm", text: "رفع صورة", onclick: () => file.click() });
    const rm = h("button", { type: "button", class: "btn sm danger", text: "إزالة", hidden: !obj[key], onclick: () => { delete obj[key]; img.src = "/logo.svg"; rm.hidden = true; onchange && onchange(); markDirty(); } });
    file.addEventListener("change", async () => {
      const f = file.files[0]; if (!f) return;
      btn.disabled = true; btn.textContent = "جارٍ الرفع…";
      try { obj[key] = await uploadImage(f); img.src = src(obj[key]); rm.hidden = false; onchange && onchange(); markDirty(); toast("رُفعت الصورة. لا تنسَ الحفظ."); }
      catch (e) { toast(errText(e), true); }
      finally { btn.disabled = false; btn.textContent = "رفع صورة"; file.value = ""; }
    });
    return h("div", { class: "field" }, h("span", { text: label }), h("div", { class: "img-pick" }, img, btn, rm, file));
  }
  const card = (title, help, ...kids) => h("section", { class: "card" }, h("header", {}, h("h2", { text: title })), help ? h("p", { class: "help", text: help }) : null, ...kids);
  const arrowBtns = (arr, i, rerender) => [
    h("button", { type: "button", class: "btn sm icon", title: "إلى الأعلى", "aria-label": "إلى الأعلى", text: "↑", disabled: i === 0, onclick: (e) => { e.preventDefault(); move(arr, i, -1); markDirty(); rerender(); } }),
    h("button", { type: "button", class: "btn sm icon", title: "إلى الأسفل", "aria-label": "إلى الأسفل", text: "↓", disabled: i === arr.length - 1, onclick: (e) => { e.preventDefault(); move(arr, i, 1); markDirty(); rerender(); } })
  ];

  /* ------------------------------------------------------------ auth */
  function showGate() { $("#app").hidden = true; $("#force").hidden = true; $("#gate").hidden = false; $("#loginPass").focus(); }
  async function boot() {
    try {
      const me = await api("me");
      if (me.mustChange) { $("#gate").hidden = true; $("#force").hidden = false; return; }
      pending = me.pendingReviews || 0;
      site = await api("site");
      site.kitchens.forEach((k) => k.sections.forEach((s) => s.items.forEach((it) => { if (!it.id) it.id = newId("item"); })));
      saved = JSON.stringify(site);
      $("#gate").hidden = true; $("#force").hidden = true; $("#app").hidden = false;
      updatePill(); render();
    } catch (e) { if (e.message !== "unauthorized") showGate(); }
  }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#loginErr"); err.hidden = true;
    try { await api("login", { method: "POST", body: JSON.stringify({ password: $("#loginPass").value }) }); $("#loginPass").value = ""; boot(); }
    catch (x) {
      err.hidden = false;
      err.textContent = x.message === "locked" ? `محاولات كثيرة. حاول بعد ${x.data.minutes} دقيقة.` : x.message === "wrong_password" ? "كلمة السر غير صحيحة. " + (["لم تبقَ محاولات.", "بقيت محاولة واحدة.", "بقيت محاولتان."][x.data.left] || `بقيت ${x.data.left} محاولات.`) : errText(x);
    }
  });
  $("#forceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("#forceErr"); err.hidden = true;
    if ($("#fNew").value !== $("#fNew2").value) { err.hidden = false; err.textContent = "كلمتا السر الجديدتان غير متطابقتين."; return; }
    try { await api("password", { method: "POST", body: JSON.stringify({ current: $("#fCur").value, next: $("#fNew").value }) }); toast("تم تغيير كلمة السر."); boot(); }
    catch (x) { err.hidden = false; err.textContent = errText(x); }
  });
  $$("[data-eye]").forEach((b) => b.addEventListener("click", () => { const i = document.getElementById(b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; }));

  $("#saveBtn").addEventListener("click", async () => {
    const btn = $("#saveBtn"); btn.disabled = true; $("#saveState").textContent = "جارٍ الحفظ…";
    try {
      const d = await api("site", { method: "PUT", body: JSON.stringify(site) });
      site = d.site; saved = JSON.stringify(site); markDirty(); render();
      toast("تم الحفظ. التغييرات ظاهرة على الموقع خلال دقيقة.");
    } catch (e) { toast(errText(e), true); markDirty(); }
  });

  /* ------------------------------------------------------------ tabs */
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]"); if (!b) return;
    tab = b.dataset.tab;
    $$("#tabs button").forEach((x) => x.setAttribute("aria-current", x === b ? "page" : "false"));
    render(); scrollTo(0, 0);
  });
  function render() {
    const main = $("#main");
    main.replaceChildren();
    ({ report: renderReport, menu: renderMenu, gallery: renderGallery, reviews: renderReviews, booking: renderBooking, info: renderInfo, legal: renderLegal, qr: renderQr, security: renderSecurity }[tab])(main);
  }
  const updatePill = () => { const p = $("#pendingPill"); p.hidden = !pending; p.textContent = pending; };

  /* ------------------------------------------------------------ report */
  const REPORT_KPIS = [["view", "زيارة للموقع"], ["kitchen", "مرة فُتحت فيها قائمة"], ["book", "طلب حجز عبر واتساب"], ["guests", "ضيف في طلبات الحجز"], ["catering", "طلب كترينج"], ["order", "طلب طعام"], ["chat", "محادثة واتساب"], ["call", "اتصال"], ["map", "فتح الخريطة"], ["review", "فتح رابط تقييم Google"]];
  function barChart(values, labels, fmt, cls = "", names = labels) {
    const max = Math.max(1, ...values);
    return [h("div", { class: "chart " + cls }, ...values.map((v, i) => {
      const bar = h("div", { class: "bar" + (v ? "" : " zero"), tabindex: "0", "aria-label": `${names[i]}: ${fmt(v)}` }, h("i"), h("span", { class: "tip", text: `${names[i]}: ${fmt(v)}` }));
      bar.firstChild.style.height = (v / max * 100) + "%";
      return bar;
    })), h("div", { class: "axis " + cls, "aria-hidden": "true" }, ...labels.map((l, i) => h("span", { text: cls === "w24" ? (i % 3 === 0 ? l : "") : l })))];
  }
  async function renderReport(main) {
    const box = h("div", { class: "list" }, h("p", { class: "muted", text: "جارٍ تحميل التقرير…" }));
    main.append(box);
    const year = renderReport.year || new Date().getFullYear();
    let r;
    try { r = await api("report?year=" + year); } catch (e) { box.replaceChildren(h("p", { class: "err", text: errText(e) })); return; }
    const t = r.totals;
    const yearSel = h("select", { class: "in", "aria-label": "السنة" }, ...r.years.map((y) => h("option", { value: y, text: y })));
    yearSel.value = r.year;
    yearSel.addEventListener("change", () => { renderReport.year = Number(yearSel.value); render(); });
    const kname = Object.fromEntries(site.kitchens.map((k) => [k.id, tx(k.name)]));
    const maxK = Math.max(1, ...r.kitchens.map((k) => k.n));
    const maxT = Math.max(1, ...r.top.map((k) => k.qty));
    const shortM = MONTHS.map((_, i) => String(i + 1));   // month numbers fit on a phone; the tooltip shows the full name
    box.replaceChildren(
      card(`تقرير سنة ${r.year}`, "الأرقام تُحسب من الموقع نفسه. «طلب حجز» يعني أن الزائر ملأ النموذج وفتح واتساب، ولا نعرف إن ضغط «إرسال» داخل واتساب.",
        h("div", { class: "grid3 no-print" }, h("label", { class: "field" }, h("span", { text: "السنة" }), yearSel),
          h("a", { class: "btn", href: "/api/admin/report.csv?year=" + r.year, download: "", text: "تحميل Excel (CSV)" }),
          h("button", { type: "button", class: "btn", text: "طباعة / PDF", onclick: () => print() })),
        h("div", { class: "kpis" }, ...REPORT_KPIS.map(([k, l]) => h("div", { class: "kpi" }, h("b", { text: (t[k] || 0).toLocaleString("de-AT") }), h("span", { text: l }))),
          site.ordering.enabled ? h("div", { class: "kpi" }, h("b", { text: money(t.revenue) }), h("span", { text: "قيمة طلبات الطعام (تقديرية)" })) : null,
          h("div", { class: "kpi" }, h("b", { text: r.reviews.average ? `${r.reviews.average} ★` : "—" }), h("span", { text: r.reviews.count ? `متوسط التقييمات المنشورة (${r.reviews.count})` : "لا توجد تقييمات منشورة بعد" })))),
      card("زيارات الموقع حسب الشهر", null, ...barChart(r.months.map((m) => m.view), shortM, (v) => `${v} زيارة`, "", MONTHS)),
      card("طلبات الحجز حسب الشهر", null, ...barChart(r.months.map((m) => m.book), shortM, (v) => `${v} طلب`, "", MONTHS)),
      card("أكثر المطابخ فتحًا", null, r.kitchens.length ? h("ol", { class: "rank" }, ...r.kitchens.map((k) => h("li", {}, h("span", { text: kname[k.ref] || k.ref }), h("b", { text: k.n }), h("span", { class: "meter" }, (() => { const i = h("i"); i.style.width = (k.n / maxK * 100) + "%"; return i; })())))) : h("p", { class: "muted", text: "لا توجد بيانات بعد." })),
      r.top.length ? card("الأكثر طلبًا", null, h("ol", { class: "rank" }, ...r.top.map((x) => h("li", {}, h("span", { text: x.name }), h("b", { text: x.qty }), h("span", { class: "meter" }, (() => { const i = h("i"); i.style.width = (x.qty / maxT * 100) + "%"; return i; })()))))) : null,
      card("أيام الحجز والطلب", "متى يرسل الزوار طلبات الحجز والطعام.", ...barChart([1, 2, 3, 4, 5, 6, 0].map((d) => r.weekdays[d]), [1, 2, 3, 4, 5, 6, 0].map((d) => DAYS[d]), (v) => `${v} طلب`, "w7")),
      card("ساعات الحجز والطلب", null, ...barChart(r.hours, r.hours.map((_, i) => String(i)), (v) => `${v} طلب`, "w24", r.hours.map((_, i) => `الساعة ${i}:00`))),
      card("جدول الأشهر", null, h("div", { class: "tbl-wrap" }, h("table", { class: "tbl" },
        h("thead", {}, h("tr", {}, ...["الشهر", "زيارات", "فتح قائمة", "حجوزات", "ضيوف", "كترينج", "طلبات", "اتصال", "واتساب"].map((x) => h("th", { text: x })))),
        h("tbody", {}, ...r.months.map((m) => h("tr", {}, ...[MONTHS[m.m - 1], m.view, m.kitchen, m.book, m.guests, m.catering, m.order, m.call, m.chat].map((x) => h("td", { text: x })))))))),
      h("section", { class: "card no-print" }, h("h2", { text: "حذف إحصائيات السنة" }), h("p", { class: "help", text: `يحذف كل أرقام سنة ${r.year} نهائيًا. لا يمكن التراجع.` }),
        h("button", { type: "button", class: "btn danger", text: `حذف إحصائيات ${r.year}`, onclick: async () => { if (!confirm(`حذف إحصائيات ${r.year} نهائيًا؟`)) return; try { await api("stats?year=" + r.year, { method: "DELETE" }); toast("تم الحذف."); render(); } catch (e) { toast(errText(e), true); } } }))
    );
  }

  /* ------------------------------------------------------------ menu (kitchens → sections → items) */
  const openKitchens = new Set();
  function renderMenu(main) {
    main.append(card("المطابخ والقائمة", "كل مطبخ يظهر كدائرة حول الشعار في أعلى الموقع. اضغط على المطبخ لتعديل أقسامه وأصنافه. بعد أي تعديل اضغط «حفظ التغييرات» في الأعلى.",
      h("div", { class: "list" }, ...site.kitchens.map((k, i) => kitchenBox(k, i))),
      h("button", { type: "button", class: "btn", text: "+ إضافة مطبخ", disabled: site.kitchens.length >= 8, onclick: () => {
        const k = { id: newId("kitchen"), icon: "star", type: "menu", name: { ar: "مطبخ جديد" }, short: { ar: "جديد" }, desc: {}, sections: [{ id: newId("sec"), name: { ar: "قسم" }, items: [] }] };
        site.kitchens.push(k); openKitchens.add(k.id); markDirty(); render();
      } }),
      site.kitchens.length > 6 ? h("p", { class: "help", text: "أكثر من 6 مطابخ تزدحم حول الشعار على الجوال." }) : null));
  }
  function kitchenBox(k, ki) {
    const det = h("details", { class: "kitchen" + (k.hidden ? " is-hidden" : "") });
    det.open = openKitchens.has(k.id);
    det.addEventListener("toggle", () => (det.open ? openKitchens.add(k.id) : openKitchens.delete(k.id)));
    const count = k.sections.reduce((a, s) => a + s.items.length, 0);
    const title = h("b", { text: tx(k.name) });
    det.append(h("summary", {}, h("img", { src: src(k.img), alt: "" }),
      h("span", {}, title, k.hidden ? h("span", { class: "badge red", text: "مخفي" }) : null, k.type === "catering" ? h("span", { class: "badge", text: "كترينج" }) : null, h("br"), h("small", { class: "muted", text: `${k.sections.length} أقسام · ${count} صنف` })),
      h("span", { class: "muted small", "aria-hidden": "true", text: "تعديل ▾" })));
    const body = h("div", { class: "kitchen-body" },
      h("div", { class: "row-actions" }, h("span", { class: "small muted", text: "الترتيب حول الشعار:" }), ...arrowBtns(site.kitchens, ki, render)),
      h("div", { class: "grid2" }, tri("اسم المطبخ", k, "name", { max: 60, onchange: () => (title.textContent = tx(k.name)) }), tri("الاسم القصير حول الشعار", k, "short", { max: 16 })),
      tri("وصف قصير", k, "desc", { area: true, rows: 2, max: 300 }),
      h("div", { class: "grid3" },
        select("الأيقونة", k, "icon", Object.entries(ICONS)),
        select("نوع المطبخ", k, "type", [["menu", "قائمة طعام عادية"], ["catering", "كترينج (طلب عرض سعر)"]], render),
        k.type === "catering" ? field("أقل عدد أشخاص", k, "minGuests", { type: "number", min: 1, inputmode: "numeric" }) : h("span")),
      imagePicker("صورة المطبخ", k, "img", render),
      check("إخفاء هذا المطبخ من الموقع", k, "hidden", render),
      ...k.sections.map((s, si) => sectionBox(k, s, si)),
      h("div", { class: "row-actions" },
        h("button", { type: "button", class: "btn", text: "+ إضافة قسم", onclick: () => { k.sections.push({ id: newId("sec"), name: { ar: "قسم جديد" }, items: [] }); markDirty(); render(); } }),
        h("button", { type: "button", class: "btn danger", text: "حذف المطبخ", onclick: () => { if (!confirm(`حذف «${tx(k.name)}» وكل أصنافه؟`)) return; site.kitchens.splice(ki, 1); markDirty(); render(); } })));
    det.append(body);
    return det;
  }
  function sectionBox(k, s, si) {
    const nameIn = tri("اسم القسم", s, "name", { max: 40 });
    return h("div", { class: "section-box" },
      h("header", {}, h("b", { text: tx(s.name) || "قسم" }), s.hidden ? h("span", { class: "badge red", text: "مخفي" }) : null,
        h("span", { class: "row-actions", style: null }, ...arrowBtns(k.sections, si, render),
          h("button", { type: "button", class: "btn sm danger", text: "حذف القسم", onclick: () => { if (!confirm("حذف هذا القسم وأصنافه؟")) return; k.sections.splice(si, 1); markDirty(); render(); } }))),
      nameIn,
      check("إخفاء القسم", s, "hidden", render),
      h("div", { class: "list" }, ...s.items.map((it, ii) => h("div", { class: "row-item" + (it.hidden ? " is-hidden" : "") },
        h("img", { src: src(it.img), alt: "" }),
        h("span", { class: "t" }, h("b", { text: tx(it.name) || "—" }),
          h("small", { text: it.options ? it.options.map((o) => `${tx(o.name)} ${money(o.price)}`).join(" / ") : money(it.price) + (it.unit ? " " + tx(it.unit) : "") }),
          it.discount ? h("span", { class: "badge green", text: `خصم ${it.discount}%` }) : null, it.soldOut ? h("span", { class: "badge red", text: "نفد" }) : null, it.hidden ? h("span", { class: "badge red", text: "مخفي" }) : null),
        h("span", { class: "row-actions" }, ...arrowBtns(s.items, ii, render),
          h("button", { type: "button", class: "btn sm", text: "تعديل", onclick: () => editItem(s, ii) }),
          h("button", { type: "button", class: "btn sm", text: it.soldOut ? "متوفر" : "نفد اليوم", onclick: () => { if (it.soldOut) delete it.soldOut; else it.soldOut = true; markDirty(); render(); } }))))),
      h("button", { type: "button", class: "btn sm", text: "+ إضافة صنف", onclick: () => { s.items.push({ id: newId("item"), name: {}, desc: {}, price: 0 }); markDirty(); editItem(s, s.items.length - 1, true); } }));
  }
  function editItem(sec, idx, isNew = false) {
    const original = clone(sec.items[idx]);
    const it = sec.items[idx];
    const dlg = h("dialog", { class: "ed", "aria-label": "تعديل صنف" });
    const usesOptions = () => Array.isArray(it.options) && it.options.length > 0;
    const body = h("div", { class: "ed-body" });
    const drawBody = () => {
      body.replaceChildren(
        tri("اسم الصنف", it, "name", { max: 80 }),
        tri("الوصف", it, "desc", { area: true, rows: 2, max: 300 }),
        imagePicker("صورة الصنف", it, "img"),
        h("label", { class: "check" }, (() => { const c = h("input", { type: "checkbox", checked: usesOptions() }); c.addEventListener("change", () => {
          if (c.checked) { it.options = [{ id: "o1", name: { ar: "عادي", de: "Normal", en: "Regular" }, price: it.price || 0 }, { id: "o2", name: { ar: "كبير", de: "Groß", en: "Large" }, price: (it.price || 0) + 2 }]; delete it.price; }
          else { it.price = it.options && it.options[0] ? it.options[0].price : 0; delete it.options; }
          markDirty(); drawBody(); }); return c; })(), "أكثر من حجم أو خيار (سعر لكل خيار)"),
        usesOptions() ? optionsEditor() : h("div", { class: "grid2" }, field("السعر (€)", it, "price", { type: "number", min: 0, step: "0.1", inputmode: "decimal" }), h("span")),
        tri("الوحدة (اختياري، مثل: للشخص)", it, "unit", { max: 30 }),
        tri("شارة (اختياري، مثل: الأكثر طلبًا)", it, "badge", { max: 30 }),
        h("div", { class: "grid2" }, field("خصم %", it, "discount", { type: "number", min: 0, maxv: 90, inputmode: "numeric", help: "اتركه فارغًا إن لم يوجد خصم. السعر القديم يظهر مشطوبًا." }), h("span")),
        h("div", { class: "row-actions", style: null }, ...[["veg", "نباتي"], ["spicy", "حار"], ["new", "جديد"]].map(([tg, l]) => {
          const c = h("input", { type: "checkbox", checked: (it.tags || []).includes(tg) });
          c.addEventListener("change", () => { const set = new Set(it.tags || []); c.checked ? set.add(tg) : set.delete(tg); it.tags = [...set]; if (!it.tags.length) delete it.tags; markDirty(); });
          return h("label", { class: "check" }, c, l);
        })),
        check("نفد اليوم", it, "soldOut"),
        check("إخفاء الصنف من الموقع", it, "hidden"));
    };
    const optionsEditor = () => h("div", { class: "list" },
      h("small", { class: "help", text: "اسم الخيار بالعربية والألمانية والإنجليزية، ثم السعر." }),
      ...it.options.map((o, oi) => {
        o.name = o.name || {};
        const nameIn = (l) => { const i = h("input", { class: "in", value: o.name[l] || "", placeholder: l.toUpperCase(), lang: l, dir: l === "ar" ? "rtl" : "ltr", "aria-label": "اسم الخيار " + l }); i.addEventListener("input", () => { o.name[l] = i.value; markDirty(); }); return i; };
        const price = h("input", { class: "in", type: "number", min: 0, step: "0.1", inputmode: "decimal", value: o.price, "aria-label": "السعر" });
        price.addEventListener("input", () => { o.price = price.value === "" ? null : Number(price.value); markDirty(); });
        return h("div", { class: "opt-row" }, nameIn("ar"), nameIn("de"), nameIn("en"), price,
          h("button", { type: "button", class: "btn sm icon danger", "aria-label": "حذف الخيار", text: "×", onclick: () => { it.options.splice(oi, 1); if (!it.options.length) { it.price = 0; delete it.options; } markDirty(); drawBody(); } }));
      }),
      h("button", { type: "button", class: "btn sm", text: "+ خيار", disabled: it.options.length >= 8, onclick: () => { it.options.push({ id: "o" + Date.now().toString(36), name: {}, price: 0 }); markDirty(); drawBody(); } }));
    drawBody();
    const close = () => { dlg.close(); dlg.remove(); render(); };
    dlg.append(
      h("div", { class: "ed-head" }, h("h2", { text: isNew ? "صنف جديد" : "تعديل صنف" }), h("button", { type: "button", class: "btn sm", text: "إغلاق", onclick: close })),
      body,
      h("div", { class: "ed-foot" },
        h("button", { type: "button", class: "btn danger", text: isNew ? "إلغاء" : "حذف الصنف", onclick: () => { if (!isNew && !confirm("حذف هذا الصنف؟")) return; sec.items.splice(idx, 1); markDirty(); close(); } }),
        !isNew ? h("button", { type: "button", class: "btn", text: "تراجع عن التعديل", onclick: () => { sec.items[idx] = original; markDirty(); close(); } }) : null,
        h("button", { type: "button", class: "btn primary", text: "تم", onclick: () => {
          if (!tx(it.name)) { toast("اكتب اسم الصنف بلغة واحدة على الأقل.", true); return; }
          close(); toast("اضغط «حفظ التغييرات» لنشر التعديل.");
        } })));
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
    document.body.append(dlg); dlg.showModal();
  }

  /* ------------------------------------------------------------ gallery */
  function renderGallery(main) {
    const file = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true });
    const addBtn = h("button", { type: "button", class: "btn primary", text: "+ رفع صور", onclick: () => file.click() });
    file.addEventListener("change", async () => {
      const files = [...file.files].slice(0, 40 - site.gallery.length);
      addBtn.disabled = true;
      for (const [i, f] of files.entries()) {
        addBtn.textContent = `جارٍ الرفع ${i + 1}/${files.length}…`;
        try { site.gallery.push({ img: await uploadImage(f), tag: "food", alt: {} }); } catch (e) { toast(errText(e), true); }
      }
      file.value = ""; markDirty(); render(); toast("رُفعت الصور. أضف وصفًا قصيرًا ثم اضغط «حفظ التغييرات».");
    });
    main.append(card("صور الموقع", "تظهر في شريط الصور. الصور تُصغَّر تلقائيًا قبل الرفع. الوصف يقرؤه Google وقارئ الشاشة للمكفوفين، فاكتب وصفًا قصيرًا لكل صورة.",
      h("div", { class: "row-actions" }, addBtn, file),
      h("div", { class: "list" }, ...site.gallery.map((g, i) => h("div", { class: "section-box" + (g.hidden ? " is-hidden" : "") },
        h("div", { class: "img-pick" }, h("img", { src: src(g.img), alt: "" }),
          h("span", { class: "row-actions" }, ...arrowBtns(site.gallery, i, render),
            h("button", { type: "button", class: "btn sm danger", text: "حذف", onclick: () => { site.gallery.splice(i, 1); markDirty(); render(); } }))),
        h("div", { class: "grid2" }, select("التصنيف", g, "tag", [["food", "أطباق"], ["place", "المطعم"], ["events", "مناسبات"]]), h("div", { class: "field" }, h("span", { text: " " }), check("إخفاء الصورة", g, "hidden"))),
        tri("وصف الصورة", g, "alt", { max: 120 })))),
      site.gallery.some((g) => /^art\//.test(g.img)) ? h("p", { class: "warn-box", text: "بعض الصور الحالية رسومات مؤقتة. استبدلها بصور حقيقية للمطعم والأطباق." }) : null));
  }

  /* ------------------------------------------------------------ reviews */
  async function renderReviews(main) {
    const status = renderReviews.status || "pending";
    const g = site.google;
    main.append(card("تقييم Google", "يظهر التقييم بجانب آراء الضيوف، والرابط يفتح صفحة التقييم في Google. انسخ التقييم والعدد من ملف المطعم في Google Maps كما هو.",
      h("div", { class: "grid3" }, field("التقييم (مثل 4.7)", g, "rating", { type: "number", min: 0, maxv: 5, step: "0.1", inputmode: "decimal" }), field("عدد التقييمات", g, "count", { type: "number", min: 0, inputmode: "numeric" }), h("span")),
      field("رابط كتابة تقييم في Google", g, "reviewUrl", { dir: "ltr", ph: "https://g.page/r/…/review", help: "من Google Business Profile ← «اطلب تقييمات» ← انسخ الرابط." })));
    const box = h("section", { class: "card" }, h("p", { class: "muted", text: "جارٍ التحميل…" }));
    main.append(box);
    let d;
    try { d = await api("reviews?status=" + status); } catch (e) { box.replaceChildren(h("p", { class: "err", text: errText(e) })); return; }
    pending = d.counts.pending; updatePill();
    const fmt = new Intl.DateTimeFormat("ar-SY-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });
    const act = async (id, body, msg) => { try { await api("reviews/" + id, { method: "PATCH", body: JSON.stringify(body) }); toast(msg); render(); } catch (e) { toast(errText(e), true); } };
    box.replaceChildren(h("header", {}, h("h2", { text: "تقييمات الزوار" })),
      h("p", { class: "help", text: "التقييم الجديد لا يظهر على الموقع حتى تضغط «نشر». المميَّز يظهر أولًا." }),
      h("div", { class: "row-actions", style: null }, ...[["pending", "بانتظار المراجعة"], ["approved", "منشورة"], ["hidden", "مخفية"]].map(([s, l]) =>
        h("button", { type: "button", class: "btn sm" + (s === status ? " primary" : ""), text: `${l} (${d.counts[s]})`, onclick: () => { renderReviews.status = s; render(); } }))),
      d.reviews.length ? h("div", { class: "list" }, ...d.reviews.map((r) => {
        const reply = h("textarea", { class: "in", rows: 2, maxlength: 400, value: r.reply || "", placeholder: "ردّ المطعم (اختياري، يظهر تحت التقييم)", "aria-label": "ردّ المطعم" });
        return h("article", { class: "rv" },
          h("div", {}, h("span", { class: "stars", "aria-label": `${r.rating} من 5`, text: "★".repeat(r.rating) + "☆".repeat(5 - r.rating) }), r.featured ? h("span", { class: "badge green", text: "مميّز" }) : null),
          h("blockquote", { dir: "auto", text: r.text }),
          h("small", { class: "muted" }, h("b", { dir: "auto", text: r.name }), " – ", fmt.format(new Date(r.created_at))),
          reply,
          h("footer", {},
            r.status !== "approved" ? h("button", { type: "button", class: "btn sm primary", text: "نشر", onclick: () => act(r.id, { status: "approved", reply: reply.value }, "نُشر التقييم.") }) : null,
            r.status === "approved" ? h("button", { type: "button", class: "btn sm", text: r.featured ? "إلغاء التمييز" : "تمييز", onclick: () => act(r.id, { featured: !r.featured }, "تم.") }) : null,
            h("button", { type: "button", class: "btn sm", text: "حفظ الرد", onclick: () => act(r.id, { reply: reply.value }, "حُفظ الرد.") }),
            r.status !== "hidden" ? h("button", { type: "button", class: "btn sm", text: "إخفاء", onclick: () => act(r.id, { status: "hidden" }, "أُخفي التقييم.") }) : null,
            h("button", { type: "button", class: "btn sm danger", text: "حذف", onclick: async () => { if (!confirm("حذف التقييم نهائيًا؟")) return; try { await api("reviews/" + r.id, { method: "DELETE" }); toast("حُذف."); render(); } catch (e) { toast(errText(e), true); } } })));
      })) : h("p", { class: "muted", text: "لا توجد تقييمات هنا." }));
  }

  /* ------------------------------------------------------------ booking & ordering */
  function renderBooking(main) {
    const b = site.booking, o = site.ordering;
    if (!site.whatsapp) main.append(h("p", { class: "warn-box", text: "لم يُضَف رقم واتساب بعد. الحجز والطلبات لن تعمل حتى تضيفه في «معلومات المطعم»." }));
    main.append(
      card("حجز الطاولات", "الزائر يختار التاريخ والوقت وعدد الأشخاص، فيفتح واتساب برسالة جاهزة إلى رقم المطعم. الأوقات تُحسب من أوقات الدوام.",
        check("تفعيل نموذج الحجز", b, "enabled", render),
        h("div", { class: "grid2" },
          field("أكبر عدد أشخاص في الحجز", b, "maxGuests", { type: "number", min: 1, maxv: 500, inputmode: "numeric" }),
          select("الفاصل بين الأوقات", b, "slotMinutes", [[15, "كل ربع ساعة"], [30, "كل نصف ساعة"], [60, "كل ساعة"]])),
        h("div", { class: "grid2" },
          field("آخر حجز قبل الإغلاق بـ (دقيقة)", b, "lastSlotBeforeClose", { type: "number", min: 0, maxv: 240, inputmode: "numeric" }),
          field("أقصى مدة للحجز المسبق (يوم)", b, "daysAhead", { type: "number", min: 1, maxv: 365, inputmode: "numeric" })),
        tri("ملاحظة تحت النموذج", b, "note", { max: 200 }),
        h("div", { class: "list" }, h("b", { text: "المناسبات في القائمة" }),
          ...b.occasions.map((oc, i) => h("div", { class: "section-box" }, tri(`مناسبة ${i + 1}`, b.occasions, i, { max: 40 }),
            h("button", { type: "button", class: "btn sm danger", text: "حذف", onclick: () => { b.occasions.splice(i, 1); markDirty(); render(); } }))),
          h("button", { type: "button", class: "btn sm", text: "+ مناسبة", disabled: b.occasions.length >= 10, onclick: () => { b.occasions.push({}); markDirty(); render(); } }))),
      card("الطلب عبر واتساب (للاستلام)", "عند التفعيل يظهر زر «أضف للطلب» بجانب الأصناف وسلة طلب. الطلب يصل على واتساب برسالة فيها الأصناف والمجموع.",
        check("تفعيل الطلب عبر واتساب", o, "enabled", render),
        o.enabled ? field("أوقات الاستلام بالدقائق (مفصولة بفاصلة)", { v: o.pickupTimes.join(", ") }, "v", { dir: "ltr", onchange: (v) => { o.pickupTimes = [...new Set(String(v).split(/[,،\s]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 240))].sort((a, z) => a - z); }, help: "0 تعني «بأسرع وقت». مثال: 0, 15, 30" }) : null),
      card("لغة رسائل واتساب", "الرسالة التي تصل إلى المطعم تُكتب بهذه اللغة، أيًّا كانت لغة الزائر.",
        select("اللغة", site, "messageLang", [["ar", "العربية"], ["de", "Deutsch"], ["en", "English"]])));
  }

  /* ------------------------------------------------------------ info & hours */
  function renderInfo(main) {
    main.append(
      card("الاسم والشعار", null,
        h("div", { class: "grid2" }, field("الاسم باللاتيني", site, "name", { dir: "ltr", max: 40 }), field("الاسم بالعربية", site, "nameAr", { max: 40 })),
        imagePicker("الشعار (اختياري، يستبدل الشعار الحالي)", site, "logo"),
        tri("الجملة التعريفية", site, "tagline", { max: 120 }),
        tri("قصة المطعم", site, "about", { area: true, rows: 4, max: 1200 }),
        h("div", { class: "list" }, h("b", { text: "مميزات قصيرة تحت القصة" }),
          ...site.highlights.map((x, i) => h("div", { class: "section-box" }, tri(`ميزة ${i + 1}`, site.highlights, i, { max: 50 }),
            h("button", { type: "button", class: "btn sm danger", text: "حذف", onclick: () => { site.highlights.splice(i, 1); markDirty(); render(); } }))),
          h("button", { type: "button", class: "btn sm", text: "+ ميزة", disabled: site.highlights.length >= 6, onclick: () => { site.highlights.push({}); markDirty(); render(); } })),
        tri("وصف المطعم في نتائج Google (اختياري، حتى 155 حرفًا)", site, "seoDesc", { max: 160 }),
        select("لغة الموقع الافتراضية", site, "defaultLang", [["de", "Deutsch"], ["ar", "العربية"], ["en", "English"]])),
      card("التواصل والعنوان", null,
        h("div", { class: "grid2" },
          field("الهاتف", site, "phone", { dir: "ltr", type: "tel", ph: "+43 1 234 5678" }),
          field("واتساب (أرقام فقط مع رمز الدولة)", site, "whatsapp", { dir: "ltr", inputmode: "numeric", ph: "4366012345678", help: "بدون + أو 00 أو مسافات." })),
        h("div", { class: "grid2" }, field("الإيميل", site, "email", { dir: "ltr", type: "email" }), h("span")),
        field("العنوان", site, "address", { ph: "Straße Nr., PLZ Wien" }),
        field("البحث في خرائط Google (اختياري)", site, "mapsQuery", { help: "اسم المطعم كما يظهر في Google Maps، ليفتح زر «الطريق» على المكان الصحيح." })),
      card("السوشيال ميديا", "روابط كاملة تبدأ بـ https://", ...["instagram", "facebook", "tiktok", "youtube"].map((k) => field(k[0].toUpperCase() + k.slice(1), site.social, k, { dir: "ltr", type: "url", ph: "https://" }))),
      hoursCard());
  }
  function hoursCard() {
    return card("أوقات الدوام", "اختر الأيام ثم وقت الفتح والإغلاق. للإغلاق بعد منتصف الليل اختر 23:59. هذه الأوقات تحدد «مفتوح الآن» وأوقات الحجز.",
      h("div", { class: "list" }, ...site.hours.map((row, i) => {
        const time = (k) => { const inp = h("input", { class: "in", type: "time", value: row[k], "aria-label": k === "open" ? "يفتح" : "يغلق" }); inp.addEventListener("change", () => { row[k] = inp.value; markDirty(); }); return inp; };
        return h("div", { class: "hours-row" },
          h("div", { class: "days" }, ...[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const c = h("input", { type: "checkbox", checked: row.days.includes(d) });
            c.addEventListener("change", () => { row.days = c.checked ? [...new Set([...row.days, d])] : row.days.filter((x) => x !== d); markDirty(); });
            return h("label", {}, c, h("span", { text: DAYS[d] }));
          })),
          time("open"), time("close"),
          h("button", { type: "button", class: "btn sm icon danger", "aria-label": "حذف", text: "×", onclick: () => { site.hours.splice(i, 1); markDirty(); render(); } }));
      })),
      h("button", { type: "button", class: "btn sm", text: "+ إضافة أوقات", onclick: () => { site.hours.push({ days: [], open: "11:00", close: "22:00" }); markDirty(); render(); } }));
  }

  /* ------------------------------------------------------------ legal */
  function renderLegal(main) {
    const L = site.legal;
    const missing = ["company", "owner", "address", "email", "phone"].filter((k) => !L[k]);
    main.append(card("Impressum و Datenschutz", "هذه البيانات إلزامية في النمسا وتظهر في صفحتي Impressum وDatenschutz. اكتبها كما في السجل التجاري أو رخصة GISA. صفحة Datenschutz تُبنى تلقائيًا منها.",
      missing.length ? h("p", { class: "warn-box", text: "حقول ناقصة: لا تنشر الموقع للعامة قبل تعبئتها." }) : h("p", { class: "ok-box", text: "البيانات الأساسية مكتملة. راجعها مع صاحب المطعم." }),
      h("div", { class: "grid2" },
        field("اسم الشركة / المطعم الرسمي", L, "company", { dir: "ltr" }),
        field("صاحب المطعم / المدير", L, "owner", { dir: "ltr" }),
        field("الشكل القانوني", L, "legalForm", { dir: "ltr", ph: "Einzelunternehmen / GmbH" }),
        field("النشاط (Unternehmensgegenstand)", L, "trade", { dir: "ltr" }),
        field("العنوان الرسمي", L, "address", { dir: "ltr" }),
        field("الهاتف", L, "phone", { dir: "ltr" }),
        field("الإيميل", L, "email", { dir: "ltr" }),
        field("رقم UID", L, "uid", { dir: "ltr", ph: "ATU…" }),
        field("رقم السجل التجاري (Firmenbuchnummer)", L, "registerNo", { dir: "ltr", help: "للشركات المسجلة فقط." }),
        field("محكمة السجل (Firmenbuchgericht)", L, "registerCourt", { dir: "ltr" }),
        field("رقم GISA", L, "gisa", { dir: "ltr" }),
        field("الغرفة (Kammer)", L, "chamber", { dir: "ltr" }),
        field("الجهة الرقابية (Aufsichtsbehörde)", L, "authority", { dir: "ltr", ph: "Magistratisches Bezirksamt für den … Bezirk" })),
      h("div", { class: "row-actions" }, h("a", { class: "btn", href: "/impressum.html", target: "_blank", rel: "noopener", text: "فتح Impressum" }), h("a", { class: "btn", href: "/datenschutz.html", target: "_blank", rel: "noopener", text: "فتح Datenschutz" }))));
  }

  /* ------------------------------------------------------------ QR */
  function qrCanvas(text, size = 600) {
    const qr = qrcode(0, "M"); qr.addData(text); qr.make();
    const n = qr.getModuleCount(), q = 4, cell = Math.floor(size / (n + 2 * q));
    const c = document.createElement("canvas"); c.width = c.height = cell * (n + 2 * q);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#12302B";
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect((k + q) * cell, (r + q) * cell, cell, cell);
    return c;
  }
  function renderQr(main) {
    const origin = location.origin;
    const box = (title, url, file) => {
      const c = qrCanvas(url);
      return h("div", { class: "qr-box" }, h("h3", { text: title }), c, h("code", { dir: "ltr", text: url }),
        h("button", { type: "button", class: "btn sm", text: "تحميل PNG", onclick: () => { const a = h("a", { href: c.toDataURL("image/png"), download: file }); document.body.append(a); a.click(); a.remove(); } }));
    };
    main.append(card("رموز QR", "اطبعها بعد نشر الموقع على رابطه النهائي. إذا تغيّر الدومين لاحقًا، اطبع رموزًا جديدة.",
      /workers\.dev|localhost/.test(origin) ? h("p", { class: "warn-box", text: "الموقع ما زال على رابط مؤقت. إذا ربطت دومين المطعم لاحقًا ستحتاج طباعة QR جديد." }) : null,
      h("div", { class: "qr-grid" },
        box("الموقع والقائمة", origin + "/", "yasmin-qr-website.png"),
        box("تقييم Google (للطاولات)", origin + "/r", "yasmin-qr-google-review.png"))));
  }

  /* ------------------------------------------------------------ security */
  function renderSecurity(main) {
    const cur = h("input", { class: "in", type: "password", autocomplete: "current-password", "aria-label": "كلمة السر الحالية" });
    const n1 = h("input", { class: "in", type: "password", autocomplete: "new-password", minlength: 10, "aria-label": "كلمة السر الجديدة" });
    const n2 = h("input", { class: "in", type: "password", autocomplete: "new-password", minlength: 10, "aria-label": "تأكيد كلمة السر" });
    const err = h("p", { class: "err", role: "alert", hidden: true });
    main.append(
      card("تغيير كلمة السر", "بعد التغيير يُسجَّل الخروج من كل الأجهزة الأخرى. استخدم 10 أحرف على الأقل.",
        h("label", { class: "field" }, h("span", { text: "كلمة السر الحالية" }), cur),
        h("label", { class: "field" }, h("span", { text: "كلمة السر الجديدة" }), n1),
        h("label", { class: "field" }, h("span", { text: "أعد كتابة الجديدة" }), n2), err,
        h("button", { type: "button", class: "btn primary", text: "تغيير كلمة السر", onclick: async () => {
          err.hidden = true;
          if (n1.value !== n2.value) { err.hidden = false; err.textContent = "كلمتا السر الجديدتان غير متطابقتين."; return; }
          try { await api("password", { method: "POST", body: JSON.stringify({ current: cur.value, next: n1.value }) }); cur.value = n1.value = n2.value = ""; toast("تم تغيير كلمة السر."); }
          catch (e) { err.hidden = false; err.textContent = errText(e); }
        } })),
      card("تسجيل الخروج", null, h("button", { type: "button", class: "btn", text: "خروج", onclick: async () => { try { await api("logout", { method: "POST" }); } catch { /* ignore */ } site = null; saved = ""; showGate(); } })));
  }

  boot();
})();
