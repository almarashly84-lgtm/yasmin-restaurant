/* Yasmin — public site. All content comes from /api/site (edited in /admin). */
(() => {
  "use strict";
  const LANGS = ["ar", "de", "en"];
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => c != null && el.append(c.nodeType ? c : document.createTextNode(c)));
    return el;
  };

  /* ------------------------------------------------------------ interface texts */
  const I18N = {
    ar: {
      skip: "انتقل إلى قائمة الطعام", nav: "القائمة الرئيسية", nav_menu: "قائمة الطعام", nav_story: "قصتنا", nav_gallery: "الصور", nav_reviews: "آراء الضيوف", nav_visit: "زورونا",
      language: "اللغة", book_table: "احجز طاولة", kitchens: "مطابخنا", orbit_hint: "اضغط على أي مطبخ لتظهر قائمته.",
      menu_title: "مطابخنا", menu_sub: "اختر مطبخًا لتظهر قائمته.", zoom_hint: "اضغط مرتين للتكبير", see_menu: "عرض القائمة", see_packages: "عرض الباقات",
      story_title: "من صحن الدار في دمشق إلى فيينا", gallery_title: "الصور", g_all: "الكل", g_food: "الأطباق", g_place: "المطعم", g_events: "المناسبات",
      prev: "السابق", next: "التالي", close: "إغلاق", categories: "الأقسام", legal: "معلومات قانونية",
      reviews_title: "آراء ضيوفنا", reviews_empty: "لا توجد تقييمات بعد. كن أول من يكتب رأيه.", write_review: "اكتب تقييمك", google_review: "قيّمنا على Google",
      review_sub: "يظهر تقييمك على الموقع بعد مراجعته.", f_rating: "تقييمك", f_first_name: "الاسم الأول", f_review: "تجربتك معنا",
      review_consent: "أوافق على نشر اسمي الأول وتقييمي على هذا الموقع.", review_send: "أرسل التقييم", review_thanks: "شكرًا لك! سيظهر تقييمك بعد مراجعته.",
      reviews_on_site: (n) => n === 1 ? "تقييم واحد على موقعنا" : n === 2 ? "تقييمان على موقعنا" : n <= 10 ? `${n} تقييمات على موقعنا` : `${n} تقييمًا على موقعنا`,
      on_google: (r, n) => `${r} على Google` + (n ? ` (${n} تقييم)` : ""), restaurant_reply: "ردّ المطعم:",
      book_title: "احجز طاولتك", book_sub: "اختر عدد الأشخاص واليوم والوقت، فيفتح واتساب برسالة جاهزة.", book_send: "أرسل الطلب عبر واتساب",
      f_name: "الاسم", f_guests: "عدد الأشخاص", f_date: "التاريخ", f_time: "الوقت", f_occasion: "المناسبة", f_notes: "ملاحظات (اختياري)",
      f_event: "نوع المناسبة", f_package: "الباقة", f_pickup: "وقت الاستلام", any_package: "لم أقرّر بعد",
      hours_title: "أوقات الدوام", find_us: "عنواننا", call: "اتصال", whatsapp: "واتساب", route: "الخريطة", email: "إيميل", copy_email: "نسخ الإيميل", copied: "تم النسخ",
      open_until: (t) => `مفتوح الآن حتى ${t}`, closed_opens: (d, t) => `مغلق الآن، نفتح ${d} الساعة ${t}`, closed: "مغلق الآن", today: "اليوم", tomorrow: "غدًا",
      closed_day: "مغلق", no_slots: "لا توجد أوقات متاحة في هذا اليوم، اختر يومًا آخر.", guests_n: (n) => n === 1 ? "شخص واحد" : n === 2 ? "شخصان" : n <= 10 ? `${n} أشخاص` : `${n} شخصًا`,
      err_name: "اكتب اسمك من فضلك.", err_date: "اختر التاريخ.", err_time: "اختر الوقت.", err_guests: (n) => `أقل عدد للكترينج ${n} أشخاص.`, err_rating: "اختر عدد النجوم.",
      err_text: "اكتب جملة واحدة على الأقل (10 أحرف).", err_consent: "نحتاج موافقتك لننشر التقييم.", err_links: "لا يمكن وضع روابط في التقييم.", err_many: "أرسلت عدة تقييمات اليوم. حاول غدًا.", err_net: "تعذّر الإرسال. تحقق من الإنترنت وحاول مرة أخرى.",
      no_whatsapp: "الحجز عبر واتساب غير مفعّل بعد. اتصل بنا من فضلك.",
      wa_opening: "يُفتح واتساب الآن…", cat_title: "اطلب عرض كترينج", cat_sub: "نرسل لك عرض السعر على واتساب.", request_offer: "اطلب عرض سعر",
      min_guests: (n) => `من ${n} شخصًا`, per_person: "للشخص", veg: "نباتي", spicy: "حار", new: "جديد", sold_out: "نفد اليوم", off: (d) => `خصم ${d}%`,
      add: "أضف للطلب", added: "أُضيف إلى طلبك", cart_title: "طلبك", cart_sub: "للاستلام من المطعم. يفتح واتساب برسالة الطلب.", order_send: "أرسل الطلب",
      pickup_now: "بأسرع وقت", pickup_in: (m) => `بعد ${m} دقيقة`, cart_empty: "طلبك فارغ.", remove: "حذف", share: "مشاركة", impressum: "Impressum", privacy: "سياسة الخصوصية",
      days: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    },
    de: {
      skip: "Zur Speisekarte", nav: "Hauptnavigation", nav_menu: "Speisekarte", nav_story: "Über uns", nav_gallery: "Galerie", nav_reviews: "Bewertungen", nav_visit: "Anfahrt",
      language: "Sprache", book_table: "Tisch reservieren", kitchens: "Unsere Küchen", orbit_hint: "Tippen Sie auf eine Küche, um ihre Karte zu sehen.",
      menu_title: "Unsere Küchen", menu_sub: "Wählen Sie eine Küche, um ihre Karte zu sehen.", zoom_hint: "Doppelt tippen zum Zoomen", see_menu: "Karte ansehen", see_packages: "Pakete ansehen",
      story_title: "Vom Innenhof in Damaskus nach Wien", gallery_title: "Galerie", g_all: "Alle", g_food: "Speisen", g_place: "Restaurant", g_events: "Feiern",
      prev: "Zurück", next: "Weiter", close: "Schließen", categories: "Kategorien", legal: "Rechtliches",
      reviews_title: "Was unsere Gäste sagen", reviews_empty: "Noch keine Bewertungen. Schreiben Sie die erste.", write_review: "Bewertung schreiben", google_review: "Auf Google bewerten",
      review_sub: "Ihre Bewertung erscheint, nachdem wir sie geprüft haben.", f_rating: "Ihre Bewertung", f_first_name: "Vorname", f_review: "Ihre Erfahrung",
      review_consent: "Ich bin einverstanden, dass mein Vorname und meine Bewertung auf dieser Website veröffentlicht werden.", review_send: "Bewertung senden", review_thanks: "Danke! Ihre Bewertung erscheint nach der Prüfung.",
      reviews_on_site: (n) => n === 1 ? "1 Bewertung auf unserer Website" : `${n} Bewertungen auf unserer Website`,
      on_google: (r, n) => `${r} auf Google` + (n ? ` (${n} Bewertungen)` : ""), restaurant_reply: "Antwort des Restaurants:",
      book_title: "Tisch reservieren", book_sub: "Wählen Sie Personen, Tag und Uhrzeit. WhatsApp öffnet sich mit Ihrer Anfrage.", book_send: "Per WhatsApp anfragen",
      f_name: "Name", f_guests: "Personen", f_date: "Datum", f_time: "Uhrzeit", f_occasion: "Anlass", f_notes: "Wünsche (optional)",
      f_event: "Art der Feier", f_package: "Paket", f_pickup: "Abholung", any_package: "Noch offen",
      hours_title: "Öffnungszeiten", find_us: "So finden Sie uns", call: "Anrufen", whatsapp: "WhatsApp", route: "Route", email: "E-Mail", copy_email: "E-Mail kopieren", copied: "Kopiert",
      open_until: (t) => `Jetzt geöffnet bis ${t} Uhr`, closed_opens: (d, t) => `Geschlossen – öffnet ${d} um ${t} Uhr`, closed: "Jetzt geschlossen", today: "heute", tomorrow: "morgen",
      closed_day: "Ruhetag", no_slots: "An diesem Tag gibt es keine freien Zeiten. Bitte wählen Sie einen anderen Tag.", guests_n: (n) => n === 1 ? "1 Person" : `${n} Personen`,
      err_name: "Bitte geben Sie Ihren Namen ein.", err_date: "Bitte wählen Sie ein Datum.", err_time: "Bitte wählen Sie eine Uhrzeit.", err_guests: (n) => `Catering ist ab ${n} Personen möglich.`, err_rating: "Bitte wählen Sie die Sterne.",
      err_text: "Bitte schreiben Sie mindestens einen Satz (10 Zeichen).", err_consent: "Für die Veröffentlichung brauchen wir Ihre Zustimmung.", err_links: "Links sind in Bewertungen nicht erlaubt.", err_many: "Sie haben heute schon mehrere Bewertungen gesendet. Bitte morgen wieder.", err_net: "Senden fehlgeschlagen. Bitte Internetverbindung prüfen und erneut versuchen.",
      no_whatsapp: "Reservierungen per WhatsApp sind noch nicht aktiv. Bitte rufen Sie uns an.",
      wa_opening: "WhatsApp wird geöffnet …", cat_title: "Catering anfragen", cat_sub: "Wir senden Ihnen das Angebot auf WhatsApp.", request_offer: "Angebot anfragen",
      min_guests: (n) => `ab ${n} Personen`, per_person: "pro Person", veg: "vegetarisch", spicy: "scharf", new: "neu", sold_out: "heute ausverkauft", off: (d) => `−${d} %`,
      add: "Hinzufügen", added: "Zur Bestellung hinzugefügt", cart_title: "Ihre Bestellung", cart_sub: "Zum Abholen. WhatsApp öffnet sich mit Ihrer Bestellung.", order_send: "Bestellung senden",
      pickup_now: "So bald wie möglich", pickup_in: (m) => `in ${m} Minuten`, cart_empty: "Ihre Bestellung ist leer.", remove: "Entfernen", share: "Teilen", impressum: "Impressum", privacy: "Datenschutz",
      days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
    },
    en: {
      skip: "Skip to the menu", nav: "Main navigation", nav_menu: "Menu", nav_story: "Our story", nav_gallery: "Gallery", nav_reviews: "Reviews", nav_visit: "Visit us",
      language: "Language", book_table: "Book a table", kitchens: "Our kitchens", orbit_hint: "Tap a kitchen to see its menu.",
      menu_title: "Our kitchens", menu_sub: "Pick a kitchen to see its menu.", zoom_hint: "Double-tap to zoom", see_menu: "See the menu", see_packages: "See packages",
      story_title: "From a Damascus courtyard to Vienna", gallery_title: "Gallery", g_all: "All", g_food: "Food", g_place: "Restaurant", g_events: "Events",
      prev: "Previous", next: "Next", close: "Close", categories: "Categories", legal: "Legal",
      reviews_title: "What our guests say", reviews_empty: "No reviews yet. Be the first to write one.", write_review: "Write a review", google_review: "Review us on Google",
      review_sub: "Your review appears once we have checked it.", f_rating: "Your rating", f_first_name: "First name", f_review: "Your experience",
      review_consent: "I agree that my first name and review are published on this website.", review_send: "Send review", review_thanks: "Thank you! Your review appears once it has been checked.",
      reviews_on_site: (n) => n === 1 ? "1 review on our website" : `${n} reviews on our website`,
      on_google: (r, n) => `${r} on Google` + (n ? ` (${n} reviews)` : ""), restaurant_reply: "Reply from the restaurant:",
      book_title: "Book a table", book_sub: "Pick guests, day and time. WhatsApp opens with your request.", book_send: "Send request on WhatsApp",
      f_name: "Name", f_guests: "Guests", f_date: "Date", f_time: "Time", f_occasion: "Occasion", f_notes: "Requests (optional)",
      f_event: "Type of event", f_package: "Package", f_pickup: "Pick-up", any_package: "Not sure yet",
      hours_title: "Opening hours", find_us: "Find us", call: "Call", whatsapp: "WhatsApp", route: "Directions", email: "Email", copy_email: "Copy email", copied: "Copied",
      open_until: (t) => `Open now until ${t}`, closed_opens: (d, t) => `Closed – opens ${d} at ${t}`, closed: "Closed now", today: "today", tomorrow: "tomorrow",
      closed_day: "Closed", no_slots: "No times are available on this day. Please pick another day.", guests_n: (n) => n === 1 ? "1 guest" : `${n} guests`,
      err_name: "Please enter your name.", err_date: "Please pick a date.", err_time: "Please pick a time.", err_guests: (n) => `Catering starts at ${n} guests.`, err_rating: "Please choose the stars.",
      err_text: "Please write at least one sentence (10 characters).", err_consent: "We need your consent to publish the review.", err_links: "Links are not allowed in reviews.", err_many: "You have sent several reviews today. Please try again tomorrow.", err_net: "Could not send. Check your connection and try again.",
      no_whatsapp: "WhatsApp booking is not active yet. Please call us.",
      wa_opening: "Opening WhatsApp…", cat_title: "Request catering", cat_sub: "We will send you a quote on WhatsApp.", request_offer: "Request a quote",
      min_guests: (n) => `from ${n} guests`, per_person: "per person", veg: "vegetarian", spicy: "spicy", new: "new", sold_out: "sold out today", off: (d) => `−${d}%`,
      add: "Add", added: "Added to your order", cart_title: "Your order", cart_sub: "For pick-up. WhatsApp opens with your order.", order_send: "Send order",
      pickup_now: "As soon as possible", pickup_in: (m) => `in ${m} minutes`, cart_empty: "Your order is empty.", remove: "Remove", share: "Share", impressum: "Imprint", privacy: "Privacy policy",
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    }
  };
  /* Labels for the WhatsApp message, in the language the restaurant chose in the dashboard. */
  const MSG = {
    ar: { book: "طلب حجز طاولة", catering: "طلب عرض كترينج", order: "طلب طعام للاستلام", name: "الاسم", guests: "عدد الأشخاص", date: "التاريخ", time: "الوقت", occasion: "المناسبة", event: "نوع المناسبة", package: "الباقة", notes: "ملاحظات", pickup: "الاستلام", asap: "بأسرع وقت", mins: (m) => `بعد ${m} دقيقة`, total: "المجموع", lang: "لغة الزبون", via: "من موقع المطعم" },
    de: { book: "Tischreservierung", catering: "Catering-Anfrage", order: "Bestellung zum Abholen", name: "Name", guests: "Personen", date: "Datum", time: "Uhrzeit", occasion: "Anlass", event: "Art der Feier", package: "Paket", notes: "Wünsche", pickup: "Abholung", asap: "So bald wie möglich", mins: (m) => `in ${m} Minuten`, total: "Summe", lang: "Sprache des Gastes", via: "über die Website" },
    en: { book: "Table booking", catering: "Catering request", order: "Pick-up order", name: "Name", guests: "Guests", date: "Date", time: "Time", occasion: "Occasion", event: "Event", package: "Package", notes: "Notes", pickup: "Pick-up", asap: "As soon as possible", mins: (m) => `in ${m} minutes`, total: "Total", lang: "Guest language", via: "via the website" }
  };
  const LANG_NAME = { ar: "العربية", de: "Deutsch", en: "English" };

  const ICON = {
    star: '<path d="M12 2.5l2.7 3.8 4.6-.7-.7 4.6 3.9 2.6-3.9 2.6.7 4.6-4.6-.7L12 23.1l-2.7-3.8-4.6.7.7-4.6-3.9-2.6 3.9-2.6-.7-4.6 4.6.7z"/><circle cx="12" cy="12.8" r="3"/>',
    dallah: '<path d="M8.5 21h9c1.2-2.4 1.1-5-1-7.2-.9-1-1.4-2-1.2-3.3L15.8 8h-5.6l.5 2.5c.2 1.3-.3 2.3-1.2 3.3-.6.6-1 1.3-1.3 2"/><path d="M13 8V6.2c0-1 .6-1.6 1.5-1.8M11.5 4.4h4"/><path d="M8.9 15.8C6.6 15.5 5 13.4 3 12"/><path d="M17.7 12.5c2 .2 2.5 3 .6 3.8"/>',
    bread: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6.3"/><path d="M9.5 10h.01M14 9.5h.01M12 12.5h.01M9.8 14.5h.01M14.6 14h.01"/>',
    wrap: '<path d="M5 15.5L15.5 5a3.5 3.5 0 0 1 5 5L10 20.5"/><path d="M5 15.5c-1.5 1.5-1 4 1 5s3 .5 4 0"/><path d="M9 11.5l3.5 3.5M12 8.5l3.5 3.5"/>',
    cloche: '<path d="M3 18h18M4.5 18a7.5 7.5 0 0 1 15 0"/><path d="M12 8.5V7M10.5 7h3"/><path d="M5 21h14"/>',
    grill: '<path d="M4 9h16l-2 7H6z"/><path d="M8 16l-2 5M16 16l2 5M9 4c1 1 1 2 0 3M13 4c1 1 1 2 0 3"/>',
    cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M9 3c1 1 1 2 0 3M12.5 3c1 1 1 2 0 3"/>',
    leaf: '<path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15"/><path d="M5 19l8-8"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
    chat: '<path d="M4 19l1.3-3.6A8 8 0 1 1 8.4 19z"/><path d="M9 10.5c.5 2 2.5 4 4.5 4.5"/>',
    phone: '<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    sweet: '<path d="M4 14h16l-1.5 6h-13z"/><path d="M5 14c0-4 3-7 7-7s7 3 7 7"/><path d="M12 7V4"/>'
  };
  const SOCIAL = {
    instagram: '<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 5.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>',
    facebook: '<path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.4V14h2.7v8z"/>',
    tiktok: '<path d="M16.5 3c.3 2.3 1.7 3.8 4 4v3.1c-1.5 0-2.8-.4-4-1.2V15a6 6 0 1 1-6-6h.5v3.2h-.5a2.8 2.8 0 1 0 2.8 2.8V3z"/>',
    youtube: '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/>'
  };
  const svgIcon = (paths, cls) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); if (cls) s.setAttribute("class", cls); s.innerHTML = paths; return s; };

  /* ------------------------------------------------------------ state */
  let site = null;
  let lang = "de";
  let reviewsData = null;
  const cart = new Map();         // key → { id, opt, qty }
  const t = (k, ...a) => { const v = I18N[lang][k] ?? I18N.de[k]; return typeof v === "function" ? v(...a) : v; };
  const tx = (o) => (o && (o[lang] || o.de || o.en || o.ar)) || "";
  const txIn = (o, l) => (o && (o[l] || o.ar || o.de || o.en)) || "";
  const TZ = "Europe/Vienna";
  const locale = () => ({ ar: "ar-SY-u-nu-latn", de: "de-AT", en: "en-GB" }[lang]);
  const money = (n) => new Intl.NumberFormat(locale(), { style: "currency", currency: "EUR" }).format(n);
  const toast = (msg) => { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2600); };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function track(type, extra = {}) {
    try {
      const body = JSON.stringify({ type, lang, ...extra });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    } catch { /* statistics are never allowed to break the page */ }
  }

  /* ------------------------------------------------------------ time helpers (always Vienna time) */
  function viennaNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
    return { date: `${p.year}-${p.month}-${p.day}`, wd, min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
  }
  const toMin = (s) => { const [a, b] = s.split(":").map(Number); return a * 60 + b; };
  const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const blocksFor = (wd) => site.hours.filter((x) => x.days.includes(wd)).map((x) => [toMin(x.open), toMin(x.close)]).sort((a, b) => a[0] - b[0]);
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const wdOf = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
  const fmtDate = (iso, l = lang) => new Intl.DateTimeFormat({ ar: "ar-SY-u-nu-latn", de: "de-AT", en: "en-GB" }[l], { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));

  function renderOpenState() {
    const el = $("#openState");
    if (!site.hours.length) { el.textContent = ""; return; }
    const now = viennaNow();
    const cur = blocksFor(now.wd).find(([o, c]) => now.min >= o && now.min < c);
    if (cur) { el.textContent = t("open_until", toHM(cur[1])); el.classList.add("is-open"); return; }
    el.classList.remove("is-open");
    for (let i = 0; i < 7; i++) {
      const wd = (now.wd + i) % 7;
      const next = blocksFor(wd).find(([o]) => i > 0 || o > now.min);
      if (next) { el.textContent = t("closed_opens", i === 0 ? t("today") : i === 1 ? t("tomorrow") : t("days")[wd], toHM(next[0])); return; }
    }
    el.textContent = t("closed");
  }

  /* ------------------------------------------------------------ language */
  function pickLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    try { const s = localStorage.getItem("yasmin-lang"); if (LANGS.includes(s)) return s; } catch { /* private mode */ }
    const nav = (navigator.language || "").slice(0, 2);
    return LANGS.includes(nav) ? nav : site.defaultLang || "de";
  }
  function setLang(l, save = true) {
    lang = l;
    if (save) { try { localStorage.setItem("yasmin-lang", l); } catch { /* ignore */ } }
    const root = document.documentElement;
    root.lang = l === "de" ? "de-AT" : l;
    root.dir = l === "ar" ? "rtl" : "ltr";
    $$("[data-t]").forEach((el) => { const v = t(el.dataset.t); if (typeof v === "string") el.textContent = v; });
    $$("[data-t-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.tAria)));
    $$(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === l)));
    const url = new URL(location.href);
    if (l === site.defaultLang) url.searchParams.delete("lang"); else url.searchParams.set("lang", l);
    history.replaceState(history.state, "", url);
    renderAll();
  }

  /* ------------------------------------------------------------ rendering */
  function renderAll() {
    const brand = lang === "ar" && site.nameAr ? `${site.nameAr} – ${tx(site.tagline)}` : `${site.name} – ${tx(site.tagline)}`;
    document.title = brand.slice(0, 60);
    $$(".js-name").forEach((el) => (el.textContent = site.name));
    $$(".js-name-ar").forEach((el) => { el.textContent = site.nameAr; el.hidden = !site.nameAr; });
    if (site.logo) $$(".js-logo").forEach((el) => (el.src = site.logo));
    $("#tagline").textContent = tx(site.tagline);
    $("#demoNote").textContent = tx(site.demoNote); $("#demoNote").hidden = !tx(site.demoNote);
    $("#about").textContent = tx(site.about);
    $("#highlights").replaceChildren(...(site.highlights || []).map((x) => h("li", { text: tx(x) })));
    $(".back-city").textContent = { ar: "دمشق – فيينا", de: "Damaskus – Wien", en: "Damascus – Vienna" }[lang];
    renderOrbit();
    renderKitchens();
    renderGallery();
    renderReviews();
    renderVisit();
    renderBookingForm();
    renderOpenState();
    renderCart();
    const openId = $("#menuSheet").open && $("#menuSheet").dataset.kitchen;
    if (openId) fillMenu(openId);
  }

  /* orbit around the emblem */
  const orbit = { angle: 0, items: [], paused: false, last: 0 };
  function renderOrbit() {
    const ul = $("#orbit");
    ul.replaceChildren(...site.kitchens.map((k) => h("li", {},
      h("button", { type: "button", class: "orb", "data-kitchen": k.id, onclick: () => openKitchen(k.id) },
        h("span", { class: "disc" }, svgIcon(ICON[k.icon] || ICON.star)),
        h("span", { class: "lbl", text: tx(k.short) || tx(k.name) })))));
    orbit.items = $$(".orb", ul);
    placeOrbit();
  }
  function placeOrbit() {
    const n = orbit.items.length; if (!n) return;
    const stage = $("#stage").getBoundingClientRect();
    const k = stage.width < 420 ? .40 : .42;          // orbit radius as a share of the stage width
    const r = stage.width * k;
    const ring = $("#stage .ring ellipse"); ring.setAttribute("rx", k * 100); ring.setAttribute("ry", k * 100);
    const dir = document.documentElement.dir === "rtl" ? -1 : 1;
    orbit.items.forEach((el, i) => {
      const a = orbit.angle + (i / n) * Math.PI * 2;
      const x = Math.sin(a) * r * dir;
      const depth = Math.cos(a);                    // 1 = in front of the emblem, −1 = behind it
      const y = depth * r * Math.cos(62 * Math.PI / 180);
      const s = .78 + (depth + 1) * .14;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.setProperty("--s", s.toFixed(3));
      el.parentElement.style.zIndex = depth > 0 ? 3 : 0;
      el.style.filter = depth < -.15 ? `brightness(${(.6 + (depth + 1) * .4).toFixed(2)})` : "";
    });
  }
  function orbitLoop(ts) {
    if (!orbit.last) orbit.last = ts;
    const dt = Math.min(64, ts - orbit.last); orbit.last = ts;
    if (!orbit.paused && !reduceMotion.matches && !document.hidden) { orbit.angle += dt * 0.00012; placeOrbit(); }
    requestAnimationFrame(orbitLoop);
  }
  function setupStage() {
    const stage = $("#stage"), tilt = $("#tilt"), coin = $("#coin");
    for (let z = -8; z <= 8; z += 2) { const d = h("div", { class: "rim" }); d.style.transform = `translateZ(${z}px)`; coin.prepend(d); }
    stage.addEventListener("pointerenter", () => (orbit.paused = true));
    stage.addEventListener("pointerleave", () => { orbit.paused = false; tilt.style.transform = ""; });
    stage.addEventListener("focusin", () => (orbit.paused = true));
    stage.addEventListener("focusout", () => (orbit.paused = false));
    stage.addEventListener("pointermove", (e) => {
      if (reduceMotion.matches || e.pointerType !== "mouse") return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      tilt.style.transform = `rotateX(${(-y * 22).toFixed(1)}deg) rotateY(${(x * 22).toFixed(1)}deg)`;
    });
    addEventListener("resize", placeOrbit, { passive: true });
    requestAnimationFrame(orbitLoop);
  }

  function tile(icon, label, attrs = {}) {
    const tag = attrs.href ? "a" : "button";
    const el = h(tag, { class: "tile", ...(tag === "button" ? { type: "button" } : {}), ...attrs },
      h("span", { class: "tile-ic" }, svgIcon(ICON[icon] || ICON.star)), h("span", { class: "tile-lbl", text: label }));
    return h("li", {}, el);
  }
  function renderKitchens() {
    $("#kitchenList").replaceChildren(
      ...site.kitchens.map((k) => tile(k.icon, tx(k.short) || tx(k.name), { onclick: () => openKitchen(k.id), "aria-label": tx(k.name) })),
      site.booking.enabled ? tile("calendar", t("book_table"), { href: "#book", class: "tile tile-gold" }) : null);
  }

  /* ------------------------------------------------------------ menu sheet */
  const findKitchen = (id) => site.kitchens.find((k) => k.id === id);
  function openKitchen(id) {
    const k = findKitchen(id); if (!k) return;
    fillMenu(id);
    openSheet($("#menuSheet"), "k-" + id);
    track("kitchen", { ref: id });
  }
  function priceNode(base, it) {
    const node = h("span", { class: "price" });
    if (it.discount) node.append(h("s", { text: money(base) }), money(Math.round(base * (100 - it.discount)) / 100));
    else node.append(money(base));
    if (it.unit) node.append(" ", h("small", { text: tx(it.unit) }));
    return node;
  }
  function fillMenu(id) {
    const k = findKitchen(id); if (!k) return;
    const dlg = $("#menuSheet");
    dlg.dataset.kitchen = id;
    $("#sheetImg").src = k.img || "/logo.svg";
    $("#sheetTitle").textContent = tx(k.name);
    $("#sheetDesc").textContent = tx(k.desc) + (k.minGuests ? " " : "");
    const ordering = site.ordering.enabled && k.type !== "catering";
    const body = $("#sheetBody");
    const tabs = $("#sheetTabs");
    tabs.replaceChildren(...k.sections.map((c, i) => h("button", { type: "button", "aria-current": i === 0 ? "true" : "false", text: tx(c.name),
      onclick: (e) => { $$("button", tabs).forEach((b) => b.setAttribute("aria-current", String(b === e.currentTarget))); $("#sec-" + c.id).scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" }); } })));
    tabs.hidden = k.sections.length < 2;
    body.replaceChildren(...k.sections.map((c) => h("section", { class: "m-sec", id: "sec-" + c.id },
      h("h3", { text: tx(c.name) }),
      ...c.items.map((it) => menuItem(it, ordering)))));
    body.scrollTop = 0;
    const foot = $("#sheetFoot");
    foot.replaceChildren();
    if (k.type === "catering") {
      foot.append(h("button", { type: "button", class: "btn gold wide", onclick: () => openCatering(k) },
        t("request_offer") + (k.minGuests ? ` · ${t("min_guests", k.minGuests)}` : "")));
    }
  }
  function menuItem(it, ordering) {
    const tags = h("div", { class: "tags" });
    if (it.badge) tags.append(h("span", { class: "tag badge", text: tx(it.badge) }));
    if (it.discount) tags.append(h("span", { class: "tag off", text: t("off", it.discount) }));
    (it.tags || []).forEach((g) => tags.append(h("span", { class: "tag " + g, text: t(g) })));
    if (it.soldOut) tags.append(h("span", { class: "tag sold", text: t("sold_out") }));
    const top = h("div", { class: "m-top" }, h("h4", { text: tx(it.name) }));
    const txt = h("div", {}, top);
    if (tx(it.desc)) txt.append(h("p", { text: tx(it.desc) }));
    if (it.options) {
      txt.append(h("div", { class: "opts" }, ...it.options.map((o) => {
        const inner = [tx(o.name), " ", priceNode(o.price, it)];
        return ordering && !it.soldOut
          ? h("button", { type: "button", class: "opt", onclick: () => addToCart(it, o) }, ...inner)
          : h("span", { class: "opt" }, ...inner);
      })));
    } else {
      top.append(priceNode(it.price, it));
      if (ordering && !it.soldOut) txt.append(h("button", { type: "button", class: "btn add", onclick: () => addToCart(it, null), text: t("add") }));
    }
    if (tags.childElementCount) txt.append(tags);
    const row = h("article", { class: "m-item" + (it.img ? "" : " no-img") + (it.soldOut ? " sold-out" : "") });
    if (it.img) row.append(h("button", { type: "button", class: "m-photo", "aria-label": tx(it.name), onclick: () => openPhotos([{ img: it.img, alt: it.name }], 0) },
      h("img", { src: it.img, alt: "", width: 84, height: 84, loading: "lazy", decoding: "async" })));
    row.append(txt);
    return row;
  }

  /* dialogs + back button support on phones */
  function openSheet(dlg, hash) {
    if (!dlg.open) {
      dlg.showModal();
      if (hash) history.pushState({ sheet: dlg.id }, "", "#" + hash);
    }
  }
  function closeSheet(dlg) {
    if (!dlg.open) return;
    if (history.state && history.state.sheet === dlg.id) history.back();
    else dlg.close();
  }
  function setupDialogs() {
    $$("dialog").forEach((dlg) => {
      dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) closeSheet(dlg); });
      dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(dlg); });
    });
    addEventListener("popstate", () => { $$("dialog[open]").forEach((d) => { if (!history.state || history.state.sheet !== d.id) d.close(); }); });
  }

  /* ------------------------------------------------------------ WhatsApp */
  function openWhatsApp(lines, type, extra) {
    if (!site.whatsapp) { toast(t("no_whatsapp")); return false; }
    const url = "https://wa.me/" + site.whatsapp + "?text=" + encodeURIComponent(lines.filter(Boolean).join("\n"));
    track(type, extra);
    toast(t("wa_opening"));
    const w = window.open(url, "_blank", "noopener");
    if (!w) location.href = url;
    return true;
  }
  const msgL = () => MSG[site.messageLang] || MSG.ar;
  const line = (label, v) => (v ? `${label}: ${v}` : "");

  /* ------------------------------------------------------------ booking (card with chips) */
  const book = { guests: 2, date: "", time: "", occasion: "" };
  function chip(label, sub, active, onclick, disabled = false) {
    return h("button", { type: "button", role: "radio", class: "chip", "aria-checked": String(active), disabled: disabled || null, onclick },
      h("b", { text: label }), sub ? h("small", { text: sub }) : null);
  }
  function renderBookingForm() {
    const f = $("#bookForm"); if (!f) return;
    const b = site.booking;
    $("#book").hidden = !b.enabled;
    book.guests = Math.min(Math.max(1, book.guests), b.maxGuests);
    $("#gOut").textContent = t("guests_n", book.guests);
    $("#gMinus").disabled = book.guests <= 1; $("#gPlus").disabled = book.guests >= b.maxGuests;
    // days: today + the next two weeks (closed days are shown but cannot be picked)
    const today = viennaNow().date;
    const days = Array.from({ length: Math.min(14, b.daysAhead + 1) }, (_, i) => addDays(today, i));
    if (!book.date || !days.includes(book.date) || !slotsFor(book.date).length) book.date = days.find((d) => slotsFor(d).length) || today;
    const dayFmt = new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", timeZone: "UTC" });
    $("#dayChips").replaceChildren(...days.map((d, i) => {
      const open = slotsFor(d).length > 0;
      const name = i === 0 ? t("today") : i === 1 ? t("tomorrow") : t("days")[wdOf(d)];
      return chip(name, open ? dayFmt.format(new Date(d + "T12:00:00Z")) : t("closed_day"), d === book.date, () => { book.date = d; book.time = ""; renderBookingForm(); }, !open);
    }));
    const slots = slotsFor(book.date);
    if (!slots.includes(book.time)) book.time = "";
    $("#noSlots").hidden = slots.length > 0;
    $("#timeChips").replaceChildren(...slots.map((s) => chip(s, null, s === book.time, () => { book.time = s; renderBookingForm(); })));
    $("#occBlock").hidden = !b.occasions.length;
    $("#occChips").replaceChildren(...b.occasions.map((o, i) => chip(tx(o), null, book.occasion === String(i), () => { book.occasion = book.occasion === String(i) ? "" : String(i); renderBookingForm(); })));
    const parts = [t("guests_n", book.guests), book.date ? fmtDate(book.date) : "", book.time];
    $("#bookSummary").textContent = parts.filter(Boolean).join(" · ");
    $("#bookNote").textContent = tx(b.note);
  }
  function slotsFor(iso, minAhead = 30) {
    const b = site.booking, now = viennaNow(), out = [];
    blocksFor(wdOf(iso)).forEach(([o, c]) => {
      for (let m = o; m <= c - b.lastSlotBeforeClose; m += b.slotMinutes) {
        if (iso === now.date && m < now.min + minAhead) continue;
        out.push(toHM(m));
      }
    });
    return out;
  }
  function showErr(id, msg, field) {
    const el = $(id); el.textContent = msg; el.hidden = !msg;
    $$("[aria-invalid]", el.closest("form")).forEach((x) => x.removeAttribute("aria-invalid"));
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  }
  function setupBooking() {
    const f = $("#bookForm");
    $("#gMinus").addEventListener("click", () => { book.guests -= 1; renderBookingForm(); });
    $("#gPlus").addEventListener("click", () => { book.guests += 1; renderBookingForm(); });
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!book.time) { showErr("#bookErr", t("err_time")); $("#timeChips").scrollIntoView({ block: "center", behavior: "smooth" }); return; }
      const name = f.name.value.trim();
      if (name.length < 2) return showErr("#bookErr", t("err_name"), f.name);
      showErr("#bookErr", "");
      const L = msgL(), ml = site.messageLang;
      const occ = book.occasion !== "" ? txIn(site.booking.occasions[Number(book.occasion)], ml) : "";
      openWhatsApp([`*${L.book}* – ${site.name}`, "", line(L.name, name), line(L.guests, book.guests), line(L.date, fmtDate(book.date, ml)), line(L.time, book.time),
        line(L.occasion, occ), line(L.notes, f.notes.value.trim()), line(L.lang, LANG_NAME[lang]), "", `(${L.via})`], "book", { guests: book.guests });
    });
  }

  /* ------------------------------------------------------------ catering */
  function openCatering(k) {
    const f = $("#catForm");
    f.dataset.kitchen = k.id;
    const today = viennaNow().date;
    f.date.min = addDays(today, 2);
    f.guests.min = k.minGuests || 1;
    f.guests.placeholder = k.minGuests ? t("min_guests", k.minGuests) : "";
    const pk = f.package;
    pk.replaceChildren(h("option", { value: "", text: t("any_package") }), ...k.sections.flatMap((c) => c.items.map((it) => h("option", { value: it.id, text: tx(it.name) }))));
    showErr("#catErr", "");
    $("#menuSheet").close();
    if (history.state && history.state.sheet === "menuSheet") history.replaceState({ sheet: "cateringSheet" }, "", "#catering");
    $("#cateringSheet").showModal();
  }
  function setupCatering() {
    const f = $("#catForm");
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const k = findKitchen(f.dataset.kitchen) || {};
      const name = f.name.value.trim(), guests = parseInt(f.guests.value, 10) || 0;
      if (name.length < 2) return showErr("#catErr", t("err_name"), f.name);
      if (!f.date.value) return showErr("#catErr", t("err_date"), f.date);
      if (guests < (k.minGuests || 1)) return showErr("#catErr", t("err_guests", k.minGuests || 1), f.guests);
      showErr("#catErr", "");
      const L = msgL(), ml = site.messageLang;
      let pack = "";
      (k.sections || []).forEach((c) => c.items.forEach((it) => { if (it.id === f.package.value) pack = txIn(it.name, ml); }));
      openWhatsApp([`*${L.catering}* – ${site.name}`, "", line(L.name, name), line(L.date, fmtDate(f.date.value, ml)), line(L.guests, guests), line(L.event, f.event.value.trim()),
        line(L.package, pack), line(L.notes, f.notes.value.trim()), line(L.lang, LANG_NAME[lang]), "", `(${L.via})`], "catering", { guests });
    });
  }

  /* ------------------------------------------------------------ ordering basket */
  const allItems = () => { const m = {}; site.kitchens.forEach((k) => k.sections.forEach((c) => c.items.forEach((it) => (m[it.id] = it)))); return m; };
  const unitPrice = (it, o) => { const base = o ? o.price : it.price; return it.discount ? Math.round(base * (100 - it.discount)) / 100 : base; };
  function addToCart(it, o) {
    const key = it.id + (o ? ":" + o.id : "");
    const cur = cart.get(key) || { id: it.id, opt: o ? o.id : null, qty: 0 };
    cur.qty = Math.min(99, cur.qty + 1); cart.set(key, cur);
    renderCart(); toast(t("added"));
  }
  function cartLines() {
    const items = allItems();
    return [...cart.entries()].map(([key, l]) => {
      const it = items[l.id]; if (!it) return null;
      const o = it.options ? it.options.find((x) => x.id === l.opt) : null;
      return { key, it, o, qty: l.qty, sum: unitPrice(it, o) * l.qty };
    }).filter(Boolean);
  }
  function renderCart() {
    const fab = $("#cartFab");
    if (!site.ordering.enabled) { fab.hidden = true; return; }
    const lines = cartLines();
    const count = lines.reduce((a, l) => a + l.qty, 0);
    fab.hidden = count === 0;
    $("#cartCount").textContent = count;
    const total = lines.reduce((a, l) => a + l.sum, 0);
    $("#cartTotal").textContent = count ? money(total) : "";
    $("#cartLines").replaceChildren(...(lines.length ? lines.map((l) => h("li", {},
      h("span", {}, h("b", { text: tx(l.it.name) }), l.o ? " – " + tx(l.o.name) : "", h("br"), h("small", { text: money(l.sum) })),
      h("span", { class: "qty" },
        h("button", { type: "button", "aria-label": t("remove"), text: "−", onclick: () => { l.qty > 1 ? (cart.get(l.key).qty -= 1) : cart.delete(l.key); renderCart(); } }),
        h("output", { text: l.qty }),
        h("button", { type: "button", "aria-label": t("add"), text: "+", onclick: () => { cart.get(l.key).qty = Math.min(99, l.qty + 1); renderCart(); } })))) : [h("li", { text: t("cart_empty") })]));
    const pick = $("#cartForm").pickup, keep = pick.value;
    pick.replaceChildren(...site.ordering.pickupTimes.map((m) => h("option", { value: m, text: m ? t("pickup_in", m) : t("pickup_now") })));
    if (keep) pick.value = keep;
  }
  function setupCart() {
    $("#cartFab").addEventListener("click", () => { renderCart(); openSheet($("#cartSheet"), "order"); });
    $("#cartForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.currentTarget, lines = cartLines();
      if (!lines.length) return showErr("#cartErr", t("cart_empty"));
      if (f.name.value.trim().length < 2) return showErr("#cartErr", t("err_name"), f.name);
      showErr("#cartErr", "");
      const L = msgL(), ml = site.messageLang, total = lines.reduce((a, l) => a + l.sum, 0);
      const m = Number(f.pickup.value);
      const fmt = (n) => n.toFixed(2).replace(".", ",") + " €";
      openWhatsApp([`*${L.order}* – ${site.name}`, "", ...lines.map((l) => `${l.qty} × ${txIn(l.it.name, ml)}${l.o ? " (" + txIn(l.o.name, ml) + ")" : ""} – ${fmt(l.sum)}`), "",
        line(L.total, fmt(total)), line(L.name, f.name.value.trim()), line(L.pickup, m ? L.mins(m) : L.asap), line(L.notes, f.notes.value.trim()), line(L.lang, LANG_NAME[lang]), "", `(${L.via})`],
      "order", { items: lines.map((l) => ({ id: l.it.id, opt: l.o ? l.o.id : null, qty: l.qty })) });
    });
  }

  /* ------------------------------------------------------------ gallery */
  let galFilter = "all";
  const visibleGallery = () => site.gallery.filter((g) => galFilter === "all" || g.tag === galFilter);
  function renderGallery() {
    const strip = $("#strip");
    $("#gallery").hidden = !site.gallery.length;
    strip.replaceChildren(...site.gallery.map((g, i) => {
      const img = h("img", { src: g.img, alt: "",   // the caption below names the photo
         loading: i < 3 ? "eager" : "lazy", decoding: "async", draggable: "false" });
      if (/courtyard|vienna/.test(g.img)) img.style.setProperty("--ar", "3 / 2");
      img.addEventListener("load", () => { if (img.naturalWidth) img.style.setProperty("--ar", `${img.naturalWidth} / ${img.naturalHeight}`); }, { once: true });
      const li = h("li", { "data-tag": g.tag }, h("button", { type: "button", onclick: (e) => { if (strip.dataset.moved !== "1") openLightbox(g); else e.preventDefault(); } },
        h("figure", { class: "g-fig" }, img, tx(g.alt) ? h("figcaption", { text: tx(g.alt) }) : null)));
      li.hidden = !(galFilter === "all" || g.tag === galFilter);
      return li;
    }));
    const tags = new Set(site.gallery.map((g) => g.tag));
    $$("#galFilter button").forEach((b) => { b.hidden = b.dataset.tag !== "all" && !tags.has(b.dataset.tag); });
  }
  function setupGallery() {
    const strip = $("#strip");
    $("#galFilter").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      galFilter = b.dataset.tag;
      $$("#galFilter button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$("li", strip).forEach((li) => (li.hidden = !(galFilter === "all" || li.dataset.tag === galFilter)));
      strip.scrollTo({ left: 0, behavior: "smooth" });
    });
    const step = (d) => {
      const rtl = document.documentElement.dir === "rtl" ? -1 : 1;
      strip.scrollBy({ left: d * rtl * strip.clientWidth * .75, behavior: reduceMotion.matches ? "auto" : "smooth" });
    };
    $("#galPrev").addEventListener("click", () => step(-1));
    $("#galNext").addEventListener("click", () => step(1));
    strip.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") { e.preventDefault(); step(document.documentElement.dir === "rtl" ? -1 : 1); } if (e.key === "ArrowLeft") { e.preventDefault(); step(document.documentElement.dir === "rtl" ? 1 : -1); } });
    // mouse drag with a little momentum; touch uses native scrolling
    let down = false, sx = 0, sl = 0, v = 0, lx = 0, lt = 0;
    strip.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; sx = lx = e.clientX; sl = strip.scrollLeft; lt = performance.now(); v = 0; strip.dataset.moved = "0"; });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 5) { strip.dataset.moved = "1"; strip.classList.add("dragging"); }
      strip.scrollLeft = sl - dx;
      const now = performance.now(); v = (e.clientX - lx) / Math.max(1, now - lt); lx = e.clientX; lt = now;
    });
    addEventListener("pointerup", () => {
      if (!down) return; down = false;
      let vel = v * 16;
      const glide = () => { if (Math.abs(vel) < .5 || reduceMotion.matches) { strip.classList.remove("dragging"); return; } strip.scrollLeft -= vel; vel *= .92; requestAnimationFrame(glide); };
      glide();
      setTimeout(() => (strip.dataset.moved = "0"), 50);
    });
  }
  /* viewer with zoom: double-tap / double-click toggles 2.5×, drag to move, pinch on phones */
  let lbList = [], lbIndex = 0;
  const zoom = { s: 1, x: 0, y: 0 };
  function applyZoom(animate = true) {
    const img = $("#lbImg");
    img.style.transition = animate && !reduceMotion.matches ? "transform .25s var(--ease)" : "none";
    img.style.transform = zoom.s === 1 ? "" : `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
    $("#lbZoom").classList.toggle("zoomed", zoom.s > 1);
  }
  function clampZoom() {
    const r = $("#lbImg").getBoundingClientRect(), w = r.width / zoom.s, hgt = r.height / zoom.s;
    const mx = (w * zoom.s - w) / 2, my = (hgt * zoom.s - hgt) / 2;
    zoom.x = Math.max(-mx, Math.min(mx, zoom.x)); zoom.y = Math.max(-my, Math.min(my, zoom.y));
  }
  function resetZoom() { zoom.s = 1; zoom.x = zoom.y = 0; applyZoom(false); }
  function toggleZoom(cx, cy) {
    if (zoom.s > 1) { resetZoom(); return; }
    const r = $("#lbImg").getBoundingClientRect();
    zoom.s = 2.5;
    zoom.x = (r.left + r.width / 2 - cx) * (zoom.s - 1);
    zoom.y = (r.top + r.height / 2 - cy) * (zoom.s - 1);
    clampZoom(); applyZoom();
  }
  function openPhotos(list, index) {
    lbList = list; lbIndex = Math.max(0, index);
    showLightbox(lbList[lbIndex], false);
    $("#lbPrev").hidden = $("#lbNext").hidden = list.length < 2;
    openSheet($("#lightbox"), "photo");
  }
  function openLightbox(g) { const list = visibleGallery(); openPhotos(list, list.indexOf(g)); }
  function showLightbox(g, animate = true) {
    const img = $("#lbImg");
    resetZoom();
    const swap = () => { img.src = g.img; img.alt = tx(g.alt); $("#lbCap").textContent = tx(g.alt); img.classList.remove("swap"); };
    if (animate && !reduceMotion.matches) { img.classList.add("swap"); setTimeout(swap, 180); } else swap();
  }
  function stepLightbox(d) {
    if (lbList.length < 2) return;
    lbIndex = (lbIndex + d + lbList.length) % lbList.length;
    showLightbox(lbList[lbIndex]);
  }
  function setupLightbox() {
    const lb = $("#lightbox"), box = $("#lbZoom"), rtl = () => (document.documentElement.dir === "rtl" ? -1 : 1);
    $("#lbPrev").addEventListener("click", (e) => { e.stopPropagation(); stepLightbox(-1); });
    $("#lbNext").addEventListener("click", (e) => { e.stopPropagation(); stepLightbox(1); });
    lb.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") stepLightbox(rtl()); if (e.key === "ArrowLeft") stepLightbox(-rtl()); });
    lb.addEventListener("close", resetZoom);
    box.addEventListener("dblclick", (e) => { e.preventDefault(); toggleZoom(e.clientX, e.clientY); });
    box.addEventListener("click", (e) => e.stopPropagation());
    // touch: double-tap, pinch, drag when zoomed, swipe to change photo when not zoomed
    const pts = new Map(); let lastTap = 0, start = null, pinch0 = 0, s0 = 1, moved = false;
    box.addEventListener("pointerdown", (e) => {
      box.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
      start = { x: e.clientX, y: e.clientY, zx: zoom.x, zy: zoom.y };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); s0 = zoom.s; }
    });
    box.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; zoom.s = Math.min(4, Math.max(1, s0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0)); clampZoom(); applyZoom(false); moved = true; return; }
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
      if (zoom.s > 1) { zoom.x = start.zx + dx; zoom.y = start.zy + dy; clampZoom(); applyZoom(false); }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size) return;
      const dx = e.clientX - start.x;
      if (zoom.s <= 1.02) { resetZoom(); if (Math.abs(dx) > 50) { stepLightbox(dx < 0 ? rtl() : -rtl()); return; } }
      if (!moved && e.pointerType !== "mouse") {
        const now = Date.now();
        if (now - lastTap < 300) { toggleZoom(e.clientX, e.clientY); lastTap = 0; } else lastTap = now;
      }
    };
    box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
  }

  /* ------------------------------------------------------------ reviews */
  async function loadReviews() {
    try { const r = await fetch("/api/reviews"); reviewsData = r.ok ? await r.json() : null; } catch { reviewsData = null; }
    renderReviews();
  }
  function renderReviews() {
    const data = reviewsData || { reviews: [], count: 0, average: null };
    const sum = $("#revSummary"); sum.replaceChildren();
    if (data.count) {
      const st = h("span", { class: "stars", role: "img", "aria-label": `${data.average} / 5` }); st.style.setProperty("--v", data.average);
      sum.append(h("span", { class: "big", text: data.average.toLocaleString(locale(), { minimumFractionDigits: 1 }) }), st, h("span", { text: t("reviews_on_site", data.count) }));
    }
    const g = site.google || {};
    if (g.rating) {
      const st = h("span", { class: "stars", role: "img", "aria-label": `${g.rating} / 5` }); st.style.setProperty("--v", g.rating);
      sum.append(h("span", {}, st, " ", t("on_google", g.rating.toLocaleString(locale()), g.count)));
    }
    $("#revEmpty").hidden = data.count > 0;
    const dfmt = new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" });
    $("#revList").replaceChildren(...data.reviews.map((r) => {
      const st = h("span", { class: "stars", role: "img", "aria-label": `${r.rating} / 5` }); st.style.setProperty("--v", r.rating);
      const li = h("li", { class: "rev" }, st,
        h("blockquote", { lang: r.lang || null, dir: "auto", text: r.text }),
        h("footer", {}, h("b", { dir: "auto", text: r.name }), h("time", { datetime: new Date(r.created_at).toISOString().slice(0, 10), text: dfmt.format(new Date(r.created_at)) })));
      if (r.reply) li.append(h("p", { class: "reply", dir: "auto" }, h("b", { text: t("restaurant_reply") }), " ", r.reply));
      return li;
    }));
    const gl = $("#googleReview");
    gl.hidden = !(g.reviewUrl || site.address || site.mapsQuery);
    gl.onclick = null;
  }
  function setupReviews() {
    $("#openReview").addEventListener("click", () => { showErr("#rvErr", ""); openSheet($("#reviewSheet"), "review"); });
    $("#reviewForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const rating = Number((f.querySelector("input[name=rating]:checked") || {}).value || 0);
      if (!rating) return showErr("#rvErr", t("err_rating"), f.querySelector("#r5"));
      if (f.name.value.trim().length < 2) return showErr("#rvErr", t("err_name"), f.name);
      if (f.text.value.trim().length < 10) return showErr("#rvErr", t("err_text"), f.text);
      if (!f.consent.checked) return showErr("#rvErr", t("err_consent"), f.consent);
      showErr("#rvErr", "");
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      try {
        const r = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, name: f.name.value, text: f.text.value, consent: true, lang, website: f.website.value }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { showErr("#rvErr", { no_links: t("err_links"), too_many: t("err_many"), text_too_short: t("err_text"), name_required: t("err_name") }[d.error] || t("err_net")); return; }
        f.reset(); closeSheet($("#reviewSheet")); toast(t("review_thanks"));
      } catch { showErr("#rvErr", t("err_net")); } finally { btn.disabled = false; }
    });
  }

  /* ------------------------------------------------------------ visit / contact */
  function renderVisit() {
    const today = viennaNow().wd;
    const order = [1, 2, 3, 4, 5, 6, 0];
    $("#hours tbody").replaceChildren(...order.map((d) => {
      const bl = blocksFor(d);
      return h("tr", { class: d === today ? "today" : null }, h("td", { text: t("days")[d] }),
        h("td", { dir: "ltr", text: bl.length ? bl.map(([o, c]) => `${toHM(o)}–${toHM(c)}`).join(", ") : t("closed_day") }));
    }));
    $("#address").textContent = site.address;
    const mapQ = site.mapsQuery || site.address;
    const c = $("#contact"); c.replaceChildren();
    if (site.whatsapp) c.append(tile("chat", t("whatsapp"), { href: "https://wa.me/" + site.whatsapp, target: "_blank", rel: "noopener", onclick: () => track("chat") }));
    if (site.phone) c.append(tile("phone", t("call"), { href: "tel:" + site.phone.replace(/[^\d+]/g, ""), onclick: () => track("call") }));
    if (mapQ) c.append(tile("pin", t("route"), { href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQ), target: "_blank", rel: "noopener", onclick: () => track("map") }));
    if (site.email) {
      // mailto often does nothing on computers without a mail app, so a tap also copies the address
      c.append(tile("mail", t("email"), { href: "mailto:" + site.email, onclick: async () => { try { await navigator.clipboard.writeText(site.email); toast(t("copied") + ": " + site.email); } catch { toast(site.email); } } }));
    }
    c.hidden = !c.childElementCount;
    $("#findUs").hidden = !site.address;
    const so = $("#social"); so.replaceChildren();
    Object.entries(site.social || {}).forEach(([k, u]) => { if (u && SOCIAL[k]) so.append(h("li", {}, h("a", { href: u, target: "_blank", rel: "noopener", "aria-label": k[0].toUpperCase() + k.slice(1) }, svgIcon(SOCIAL[k])))); });
  }

  /* ------------------------------------------------------------ start */
  async function start() {
    try {
      const r = await fetch("/api/site");
      if (!r.ok) throw new Error(r.status);
      site = await r.json();
    } catch (e) {
      document.body.classList.add("offline");
      $("#tagline").textContent = "⚠";
      return;
    }
    setupStage(); setupDialogs(); setupBooking(); setupCatering(); setupCart(); setupGallery(); setupLightbox(); setupReviews();
    $$(".lang button").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
    setLang(pickLang(), false);
    loadReviews();
    setInterval(renderOpenState, 60000);
    const m = location.hash.match(/^#k-([a-z0-9-]+)$/);
    if (m && findKitchen(m[1])) { history.replaceState(null, "", location.pathname + location.search); openKitchen(m[1]); }
    track("view");
  }
  start();
})();
