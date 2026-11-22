// The Last Frame — ana sayfa vitrini: en son eklenen filmlerin afişi
// Supabase'den gelen filmler eklenme tarihine göre (yeniden eskiye) sıralanır.
// Afişi olan en yeni 5 film birkaç saniyede bir sırayla gösterilir.

(function () {
  const box = document.querySelector("#hero-poster");
  if (!box) return;

  const img = document.querySelector("#hero-poster-img");
  const titleEl = document.querySelector("#hero-poster-title");
  const metaEl = document.querySelector("#hero-poster-meta");
  const backdrop = document.querySelector("#hero-backdrop");

  const MAX_FILMS = 5;      // vitrinde dönecek en fazla film
  const INTERVAL = 7000;    // afiş değişim süresi (ms)

  function newestWithPoster(list) {
    const remote = list
      .filter(f => f.remote && f.poster)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    // Yerel katalogda sonra yazılan film daha yeni kabul edilir
    const local = list.filter(f => !f.remote && f.poster).reverse();
    return [...remote, ...local].slice(0, MAX_FILMS);
  }

  function show(f) {
    box.classList.add("is-changing");
    setTimeout(() => {
      img.src = f.poster;
      img.alt = f.title + " film afişi";
      titleEl.textContent = f.title;
      metaEl.textContent = [f.year, f.director].filter(v => v && v !== "—").join(" · ");
      box.href = "arsiv.html?q=" + encodeURIComponent(f.title);
      box.setAttribute("aria-label", "Yeni eklenen film: " + f.title);
      backdrop.style.backgroundImage = "url(" + JSON.stringify(f.poster) + ")";
      box.classList.remove("is-changing");
    }, box.hidden ? 0 : 400);
  }

  async function start() {
    if (typeof loadRemoteFilms === "function") await loadRemoteFilms();
    const picks = newestWithPoster(typeof films !== "undefined" ? films : []);
    if (!picks.length) return; // afişli film yoksa vitrin boş kalır

    let idx = 0;
    let current = picks[0];

    // Yüklenemeyen afişleri atla
    img.onerror = () => {
      const i = picks.indexOf(current);
      if (i > -1) picks.splice(i, 1);
      if (!picks.length) { box.hidden = true; backdrop.style.backgroundImage = ""; return; }
      idx = idx % picks.length;
      current = picks[idx];
      show(current);
    };

    show(current);
    box.hidden = false;
    backdrop.classList.add("on");

    if (picks.length > 1) {
      setInterval(() => {
        if (document.hidden || !picks.length) return;
        idx = (idx + 1) % picks.length;
        current = picks[idx];
        show(current);
      }, INTERVAL);
    }
  }

  start();
})();
