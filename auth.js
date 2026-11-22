// The Last Frame — üye sistemi (Supabase)
// Şifreler ve oturumlar Supabase Auth tarafından yönetilir.

const Auth = (() => {
  const COLORS = ["#a83b35", "#c5a46a", "#536456", "#666b7a", "#8a5c45"];
  let user = null;

  async function load() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { user = null; return null; }

    const [{ data: profile }, { data: favs }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
      sb.from("favorites").select("film_id").eq("user_id", session.user.id)
    ]);

    user = profile ? {
      ...profile,
      email: session.user.email,
      joined: Date.parse(profile.created_at),
      favorites: (favs || []).map(f => f.film_id)
    } : null;
    return user;
  }

  const current = () => user;
  const isFavorite = id => !!user && user.favorites.includes(id);

  async function register({ username, email, password }) {
    username = (username || "").trim();
    email = (email || "").trim();
    if (!/^[\p{L}\p{N}_]{3,20}$/u.test(username)) throw new Error("Kullanıcı adı 3-20 karakter olmalı (harf, rakam, alt çizgi).");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Geçerli bir e-posta adresi gir.");
    if ((password || "").length < 6) throw new Error("Şifre en az 6 karakter olmalı.");

    const { data: taken } = await sb.from("profiles").select("id")
      .ilike("username", username.replace(/[\\%_]/g, "\\$&")).limit(1);
    if (taken && taken.length) throw new Error("Bu kullanıcı adı alınmış.");

    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { username } } });
    if (error) {
      if (/already|registered/i.test(error.message)) throw new Error("Bu e-posta ile zaten bir hesap var.");
      if (/Database error/i.test(error.message)) throw new Error("Kayıt tamamlanamadı. Kullanıcı adı alınmış olabilir veya kurulum eksik.");
      throw new Error(error.message);
    }
    if (!data.session) return { needsConfirm: true };
    await load();
    return { needsConfirm: false };
  }

  async function login({ email, password }) {
    const { error } = await sb.auth.signInWithPassword({ email: (email || "").trim(), password: password || "" });
    if (error) throw new Error("E-posta veya şifre hatalı.");
    await load();
    return user;
  }

  async function logout() {
    await sb.auth.signOut();
    user = null;
  }

  async function update({ bio, color }) {
    if (!user) return null;
    const { error } = await sb.from("profiles").update({ bio, color }).eq("id", user.id);
    if (error) throw new Error(error.message);
    user.bio = bio; user.color = color;
    return user;
  }

  async function toggleFavorite(filmId) {
    if (!user) return false;
    if (user.favorites.includes(filmId)) {
      const { error } = await sb.from("favorites").delete().eq("user_id", user.id).eq("film_id", filmId);
      if (error) throw new Error(error.message);
      user.favorites = user.favorites.filter(f => f !== filmId);
    } else {
      const { error } = await sb.from("favorites").insert({ user_id: user.id, film_id: filmId });
      if (error) throw new Error(error.message);
      user.favorites.push(filmId);
    }
    return user.favorites.includes(filmId);
  }

  function avatar(u, size) {
    const a = document.createElement("span");
    a.className = "avatar" + (size ? " " + size : "");
    a.textContent = (u.username[0] || "?").toLocaleUpperCase("tr");
    a.style.background = u.color;
    a.style.color = u.color === "#c5a46a" ? "#111" : "#f0ece5";
    return a;
  }

  // Üst menüye giriş / profil bağlantısını ekler
  function renderHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const old = header.querySelector(".user-slot");
    if (old) old.remove();

    let slot;
    if (user) {
      slot = document.createElement("a");
      slot.href = "profil.html";
      slot.className = "user-slot user-chip";
      slot.title = "Profilim";
      const name = document.createElement("span");
      name.className = "user-name";
      name.textContent = user.username;
      slot.append(avatar(user, "sm"), name);
    } else {
      slot = document.createElement("a");
      slot.href = "giris.html";
      slot.className = "user-slot user-btn";
      slot.textContent = "GİRİŞ YAP";
    }
    header.append(slot);
  }

  // Stil dosyasını otomatik ekle
  if (!document.querySelector('link[href="auth.css"]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "auth.css";
    document.head.append(l);
  }

  // Oturum yüklenince menüyü çiz; sayfalar `await Auth.ready` ile bekleyebilir
  const ready = load().catch(() => null).then(u => { renderHeader(); return u; });
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") { user = null; renderHeader(); }
  });

  return { COLORS, ready, current, isFavorite, register, login, logout, update, toggleFavorite, avatar, renderHeader };
})();
