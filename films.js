// The Last Frame — film kataloğu (arşiv ve profil sayfaları paylaşır)
const baseFilms = [
  {
    id: "elephants-dream",
    title: "Elephants Dream",
    year: "2006",
    director: "Bassam Kurdali",
    category: "Bağımsız",
    duration: "11 dk",
    country: "Hollanda",
    language: "İngilizce",
    description: "",
    posterTitle: "ELEPHANTS<br>DREAM",
    colors: ["#536456", "#17201b"],
    poster: "media/afis.jpg",
    hls: "",
    subtitles: [], // örn: [{ lang: "tr", label: "Türkçe", src: "media/elephants-dream-tr.vtt" }]
    video: "https://cjcskhnugtehkczfrfvh.supabase.co/storage/v1/object/public/filimler%20ve%20filmler/ed_1024_512kb.mp4"
  },
  {
    id: "ilk-film",
    title: "İlk Gösterim",
    year: "2026",
    director: "The Last Frame",
    category: "Sanat Sineması",
    duration: "Test",
    country: "Türkiye",
    language: "Türkçe",
    description: "The Last Frame platformunun ilk test gösterimi.",
    posterTitle: "İLK<br>GÖSTERİM",
    colors: ["#8a5c45", "#211c1a"],
    poster: "",
    hls: "",
    video: "media/ilk-film.mp4"
  },
  {
    id: "ornek-1",
    title: "Örnek Film 01",
    year: "—",
    director: "Yayın izni bekleniyor",
    category: "Sanat Sineması",
    duration: "—",
    country: "—",
    language: "—",
    description: "Örnek katalog kaydı.",
    posterTitle: "ÖRNEK<br>FİLM",
    colors: ["#8a5c45", "#211c1a"],
    poster: "",
    hls: "",
    video: ""
  },
  {
    id: "ornek-2",
    title: "Örnek Film 02",
    year: "—",
    director: "Bağımsız yapım",
    category: "Bağımsız",
    duration: "—",
    country: "—",
    language: "—",
    description: "Bağımsız yapımlar bölümü için örnek kayıt.",
    posterTitle: "BAĞIMSIZ<br>SİNEMA",
    colors: ["#536456", "#17201b"],
    poster: "",
    hls: "",
    video: ""
  },
  {
    id: "ornek-3",
    title: "Örnek Film 03",
    year: "—",
    director: "Klasik sinema seçkisi",
    category: "Dünya Klasikleri",
    duration: "—",
    country: "—",
    language: "—",
    description: "Dünya klasikleri koleksiyonu için örnek kayıt.",
    posterTitle: "DÜNYA<br>KLASİKLERİ",
    colors: ["#666b7a", "#1c2028"],
    poster: "",
    hls: "",
    video: ""
  },
  {
    id: "ornek-4",
    title: "Örnek Film 04",
    year: "—",
    director: "Türk sineması seçkisi",
    category: "Türk Sineması",
    duration: "—",
    country: "—",
    language: "—",
    description: "Türk sineması koleksiyonu için örnek kayıt.",
    posterTitle: "TÜRK<br>SİNEMASI",
    colors: ["#8b6c40", "#292016"],
    poster: "",
    hls: "",
    video: ""
  }
];


// ---- Supabase'deki filmler (yalnızca okunur) ----
const FILM_COLORS = {
  "Sanat Sineması": ["#8a5c45", "#211c1a"],
  "Bağımsız": ["#536456", "#17201b"],
  "Dünya Klasikleri": ["#666b7a", "#1c2028"],
  "Türk Sineması": ["#8b6c40", "#292016"]
};

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let films = [...baseFilms];

function filmFromRow(r) {
  return {
    id: r.id,
    title: r.title,
    year: r.year || "—",
    director: r.director || "—",
    category: r.category,
    duration: r.duration || "—",
    country: r.country || "—",
    language: r.language || "—",
    description: r.description || "",
    posterTitle: escapeHtml((r.title || "").toUpperCase()),
    colors: FILM_COLORS[r.category] || FILM_COLORS["Sanat Sineması"],
    poster: r.poster || "",
    hls: "",
    video: r.video || "",
    subtitles: Array.isArray(r.subtitles) ? r.subtitles : [],
    createdAt: r.created_at || "",
    remote: true
  };
}

async function loadRemoteFilms() {
  try {
    const { data, error } = await sb.from("films").select("*").order("created_at", { ascending: true });
    if (!error && data) films = [...baseFilms, ...data.map(filmFromRow)];
  } catch (e) {}
  return films;
}
