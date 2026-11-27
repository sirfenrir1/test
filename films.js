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
