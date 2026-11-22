// The Last Frame — Forum (Supabase)
// Konular ve yanıtlar Supabase veritabanında tutulur. Kimin ne yapabileceği
// veritabanındaki kurallarla (RLS) belirlenir; buradaki düğmeler yalnızca arayüzdür.

const CATEGORIES = ["Genel", "Film Önerileri", "Yönetmenler", "Bağımsız Sinema", "Türk Sineması"];

const $ = s => document.querySelector(s);

let topics = [];
let activeCat = "all";
let query = "";
let openId = null;

const fmt = t => new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function fail(err) {
  alert("İşlem yapılamadı: " + (err && err.message ? err.message : err));
}

/* ---------- VERİ ---------- */
async function loadTopics() {
  const { data, error } = await sb
    .from("topics")
    .select("id, title, body, category, pinned, locked, created_at, user_id, profiles(username), replies(count)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    $("#topic-list").replaceChildren(el("p", "empty", "Forum yüklenemedi: " + error.message));
    return;
  }
  topics = data.map(t => ({
    ...t,
    author: t.profiles ? t.profiles.username : "Silinmiş üye",
    replyCount: t.replies && t.replies[0] ? t.replies[0].count : 0
  }));
  render();
}

/* ---------- LİSTE ---------- */
function renderFilters() {
  const box = $("#cat-filters");
  box.innerHTML = "";
  const make = (label, val) => {
    const b = el("button", "filter" + (activeCat === val ? " active" : ""), label);
    b.addEventListener("click", () => { activeCat = val; render(); });
    box.append(b);
  };
  make("TÜMÜ", "all");
  CATEGORIES.forEach(c => make(c, c));
}

function renderTopics() {
  const list = $("#topic-list");
  list.innerHTML = "";
  const q = query.toLocaleLowerCase("tr");

  const items = topics
    .filter(t => (activeCat === "all" || t.category === activeCat) &&
      (t.title + " " + t.body + " " + t.author).toLocaleLowerCase("tr").includes(q))
    .sort((a, b) => (b.pinned - a.pinned) || (new Date(b.created_at) - new Date(a.created_at)));

  items.forEach(t => {
    const row = el("article", "topic" + (t.pinned ? " is-pinned" : ""));
    const left = el("div");

    const meta = el("div", "topic-meta");
    if (t.pinned) meta.append(el("span", "badge", "SABİT"));
    if (t.locked) meta.append(el("span", "badge red", "KİLİTLİ"));
    meta.append(document.createTextNode(`${t.category} · ${t.author} · ${fmt(t.created_at)}`));

    left.append(meta, el("h3", "", t.title));

    const count = el("div", "topic-count");
    count.append(el("b", "", String(t.replyCount)), document.createTextNode("yanıt"));

    row.append(left, count);
    row.addEventListener("click", () => openThread(t.id));
    list.append(row);
  });

  $("#topic-empty").hidden = items.length > 0;
  $("#topic-count").textContent = `${items.length} konu`;
}

function renderStats() {
  $("#stat-topics").textContent = topics.length;
  $("#stat-replies").textContent = topics.reduce((n, t) => n + t.replyCount, 0);
  $("#stat-cats").textContent = CATEGORIES.length;
}

function render() {
  renderFilters();
  renderTopics();
  renderStats();
  const sel = $("#t-cat");
  sel.innerHTML = "";
  CATEGORIES.forEach(c => { const o = el("option", "", c); o.value = c; sel.append(o); });
}

/* ---------- KONU DETAYI ---------- */
function actionBtn(label, fn, danger) {
  const b = el("button", "ghost-btn" + (danger ? " danger" : ""), label);
  b.addEventListener("click", fn);
  return b;
}

async function openThread(id) {
  const t = topics.find(x => x.id === id);
  if (!t) return;
  openId = id;

  const { data: replies, error } = await sb
    .from("replies")
    .select("id, body, created_at, user_id, profiles(username)")
    .eq("topic_id", id)
    .order("created_at", { ascending: true });
  if (error) return fail(error);

  const me = Auth.current();
  const body = $("#thread-body");
  body.innerHTML = "";

  body.append(el("p", "eyebrow", t.category));
  body.append(el("h2", "", t.title));

  const tags = el("div", "topic-meta");
  if (t.pinned) tags.append(el("span", "badge", "SABİT"));
  if (t.locked) tags.append(el("span", "badge red", "KİLİTLİ"));
  tags.append(document.createTextNode(`${t.author} · ${fmt(t.created_at)}`));
  body.append(tags);

  // Konu sahibi kendi konusunu silebilir
  const isOwner = !!me && me.id === t.user_id;
  if (isOwner) {
    const adm = el("div", "thread-admin");
    adm.append(actionBtn("KONUYU SİL", async () => {
      if (!confirm("Bu konu ve tüm yanıtları silinsin mi?")) return;
      const { error: e } = await sb.from("topics").delete().eq("id", id);
      if (e) return fail(e);
      $("#thread-dialog").close();
      await loadTopics();
    }, true));
    body.append(adm);
  }

  const first = el("div", "thread-post");
  first.append(el("p", "", t.body));
  body.append(first);

  replies.forEach(r => {
    const post = el("div", "thread-post");
    const who = el("div", "who", r.profiles ? r.profiles.username : "Silinmiş üye");
    who.append(el("small", "", fmt(r.created_at)));
    if (me && me.id === r.user_id) {
      const d = el("button", "mini-del", "SİL");
      d.addEventListener("click", async () => {
        const { error: e } = await sb.from("replies").delete().eq("id", r.id);
        if (e) return fail(e);
        await loadTopics(); openThread(id);
      });
      who.append(d);
    }
    post.append(who, el("p", "", r.body));
    body.append(post);
  });

  if (t.locked) {
    body.append(el("div", "locked-note", "Bu konu kilitlendi; yeni yanıt eklenemez."));
  } else if (!me) {
    const note = el("div", "login-note");
    note.append(document.createTextNode("Yanıt yazmak için "));
    const a = el("a", "inline-link", "giriş yapmalısın");
    a.href = "giris.html?next=forum.html";
    note.append(a, document.createTextNode("."));
    body.append(note);
  } else {
    const form = el("form");
    form.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-top:6px";
    const msg = el("textarea"); msg.rows = 4; msg.maxLength = 5000; msg.placeholder = `${me.username} olarak yanıtla...`; msg.required = true;
    const send = el("button", "gold-btn", "YANITLA"); send.type = "submit"; send.style.alignSelf = "flex-start";
    form.append(msg, send);
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const text = msg.value.trim();
      if (!text) return;
      send.disabled = true;
      const { error: err } = await sb.from("replies").insert({ topic_id: id, user_id: me.id, body: text });
      if (err) { send.disabled = false; return fail(err); }
      await loadTopics(); openThread(id);
    });
    body.append(form);
  }

  const dlg = $("#thread-dialog");
  if (!dlg.open) dlg.showModal();
}

/* ---------- OLAYLAR ---------- */
// Yeni konu
$("#new-topic-btn").addEventListener("click", () => {
  if (!Auth.current()) { location.href = "giris.html?next=forum.html"; return; }
  $("#topic-dialog").showModal();
});

$("#topic-form").addEventListener("submit", async e => {
  e.preventDefault();
  const me = Auth.current();
  if (!me) { location.href = "giris.html?next=forum.html"; return; }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  const { error } = await sb.from("topics").insert({
    user_id: me.id,
    category: $("#t-cat").value,
    title: $("#t-title").value.trim(),
    body: $("#t-body").value.trim()
  });
  btn.disabled = false;
  if (error) return fail(error);
  e.target.reset();
  $("#topic-dialog").close();
  await loadTopics();
});

// Diyalog kapatma
document.querySelectorAll("[data-close]").forEach(b =>
  b.addEventListener("click", () => b.closest("dialog").close()));

// Arama
$("#forum-search").addEventListener("input", e => { query = e.target.value.trim(); renderTopics(); });

$("#year").textContent = new Date().getFullYear();

// Başlat: önce oturum, sonra konular
render();
Auth.ready.then(async () => {
  await loadTopics();
  // Profilden gelen bağlantı: forum.html?topic=ID
  const topicParam = new URLSearchParams(location.search).get("topic");
  if (topicParam) openThread(topicParam);
});
