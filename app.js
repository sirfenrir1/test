
const grid = document.querySelector("#film-grid");
const search = document.querySelector("#search");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");

let activeFilter = "all";
let selectedFilm = null;

// FİLM KATALOĞUNU OLUŞTUR
function render() {
  const q = search.value.trim().toLocaleLowerCase("tr");

  const list = films.filter(f =>
    (activeFilter === "all" || f.category === activeFilter) &&
    [f.title, f.director, f.category, f.year]
      .join(" ")
      .toLocaleLowerCase("tr")
      .includes(q)
  );

  grid.innerHTML = "";

  list.forEach(f => {
    const card = document.createElement("article");
    card.className = "film-card";

    const poster = document.createElement("div");
    poster.className = "poster";
    poster.style.setProperty("--c1", f.colors[0]);
    poster.style.setProperty("--c2", f.colors[1]);

    if (f.poster) {
      const image = document.createElement("img");
      image.src = f.poster;
      image.alt = f.title + " film afişi";

      image.onerror = () => image.remove();

      poster.append(image);
    }

    const year = document.createElement("span");
    year.className = "poster-year";
    year.textContent = f.year;

    const title = document.createElement("span");
    title.className = "poster-title";
    title.innerHTML = f.posterTitle;

    poster.append(year, title);

    const heading = document.createElement("h3");
    heading.textContent = f.title;

    const small = document.createElement("small");
    small.textContent = f.director + " · " + f.category;

    card.append(poster, heading, small);

    card.addEventListener("click", () => openFilm(f));

    grid.append(card);
  });

  count.textContent = `${list.length} kayıt gösteriliyor`;
  empty.hidden = list.length > 0;
}

// FİLM DETAY EKRANI
function openFilm(f) {
  selectedFilm = f;

  document.querySelector("#dialog-title").textContent = f.title;

  document.querySelector("#dialog-meta").textContent =
    `${f.year} · ${f.director} · ${f.category}`;

  document.querySelector("#dialog-facts").textContent =
    `Süre: ${f.duration || "—"} · Ülke: ${f.country || "—"} · Dil: ${f.language || "—"}`;

  document.querySelector("#dialog-description").textContent =
    f.description;

  const video = document.querySelector("#film-player");
  const playerSection = document.querySelector("#player-section");
  const playerWrap = document.querySelector("#player-wrap");
  const note = document.querySelector("#player-note");
  const watchButton = document.querySelector("#watch-button");

  if (video.hlsInstance) {
    video.hlsInstance.destroy();
    video.hlsInstance = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();

  playerSection.hidden = true;
  playerWrap.hidden = false;
  note.hidden = true;

  watchButton.disabled = !(f.hls || f.video);

  watchButton.textContent = (f.hls || f.video)
    ? "▶ ŞİMDİ İZLE"
    : "YAYIN HAZIR DEĞİL";

  updateFavButton();

  document.querySelector("#film-dialog").showModal();
}

// FAVORİ (LİSTEME EKLE) DÜĞMESİ
function updateFavButton() {
  const btn = document.querySelector("#fav-button");
  const on = !!selectedFilm && Auth.isFavorite(selectedFilm.id);
  btn.classList.toggle("on", on);
  btn.textContent = on ? "♥ LİSTEMDE" : "♡ LİSTEME EKLE";
}

document.querySelector("#fav-button").addEventListener("click", async () => {
  if (!selectedFilm) return;
  if (!Auth.current()) {
    window.location.href = "giris.html?next=arsiv.html";
    return;
  }
  try {
    await Auth.toggleFavorite(selectedFilm.id);
    updateFavButton();
  } catch (err) {
    alert("İşlem yapılamadı: " + err.message);
  }
});


/// ŞİMDİ İZLE DÜĞMESİ
document.querySelector("#watch-button").addEventListener("click", () => {
  const f = selectedFilm;

  if (!f || !f.video) {
    alert("Video dosyası bulunamadı.");
    return;
  }

  const videoPath = encodeURIComponent(f.video);
  const filmTitle = encodeURIComponent(f.title);
  const filmId = encodeURIComponent(f.id);

  window.location.href =
    `watch.html?video=${videoPath}&title=${filmTitle}&id=${filmId}`;
});


// DETAY EKRANINI KAPAT
document.querySelector("#dialog-close").addEventListener("click", () => {
  document.querySelector("#film-dialog").close();
});

// EKRAN KAPANINCA VİDEOYU DURDUR
document.querySelector("#film-dialog").addEventListener("close", () => {
  const video = document.querySelector("#film-player");

  video.pause();

  if (video.hlsInstance) {
    video.hlsInstance.destroy();
    video.hlsInstance = null;
  }

  video.removeAttribute("src");
  video.load();

  document.querySelector("#player-section").hidden = true;
  document.querySelector("#player-note").hidden = true;

  selectedFilm = null;
});

// ARAMA
search.addEventListener("input", render);

// KATEGORİ FİLTRELERİ
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    activeFilter = button.dataset.filter;

    render();
  });
});

// ALT BİLGİDEKİ YIL
document.querySelector("#year").textContent = new Date().getFullYear();

// DİĞER SAYFALARDAN GELEN ARAMA (?q=...) VE KATEGORİ (?filter=...)
const incomingParams = new URLSearchParams(window.location.search);
const incomingQuery = incomingParams.get("q");
if (incomingQuery) search.value = incomingQuery;

const incomingFilter = incomingParams.get("filter");
if (incomingFilter) {
  const match = [...document.querySelectorAll(".filter")]
    .find(b => b.dataset.filter === incomingFilter);
  if (match) {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    match.classList.add("active");
    activeFilter = incomingFilter;
  }
}

// SAYFAYI BAŞLAT
render();
Promise.all([Auth.ready, loadRemoteFilms()]).then(() => {
  render();
});
