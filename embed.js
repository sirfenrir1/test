// The Last Frame — başka sitelerin resmi oynatıcılarını gömme (embed)
//
// Film kaydındaki "video" alanına şu sitelerden bir sayfa linki yazılırsa,
// izleme sayfası kendi oynatıcısı yerine o sitenin resmi oynatıcısını gösterir:
//   YouTube     https://www.youtube.com/watch?v=XXXXXXXXXXX   (youtu.be/..., /shorts/..., /embed/... da olur)
//   Vimeo       https://vimeo.com/123456789                    (gizli videolar: vimeo.com/123456789/abcdef1234)
//   Dailymotion https://www.dailymotion.com/video/x8abcd1
//   Archive.org https://archive.org/details/FilmKimligi
//
// Not: archive.org'daki doğrudan .mp4 dosya linkleri (archive.org/download/...) gömülmez;
// onlar sitenin kendi oynatıcısında oynar, böylece film öncesi reklam da çalışır.
//
// Güvenlik: Linkin içinden yalnızca video kimliği alınır ve gömme adresi burada
// sıfırdan kurulur. Böylece adres çubuğuna yazılan rastgele bir site sayfaya gömülemez.

const Embed = (() => {
  const YT_ID = /^[A-Za-z0-9_-]{11}$/;

  function parse(raw) {
    let u;
    try { u = new URL(String(raw || "").trim()); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;

    const host = u.hostname.replace(/^(www\.|m\.)/, "").toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);

    // YouTube
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
      let id = "";
      if (host === "youtu.be") id = parts[0] || "";
      else if (parts[0] === "watch") id = u.searchParams.get("v") || "";
      else if (["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1] || "";
      if (!YT_ID.test(id)) return null;
      return {
        provider: "YouTube",
        src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
      };
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const nums = host === "player.vimeo.com" ? parts.slice(1) : parts;
      const id = nums.find(p => /^\d{5,12}$/.test(p));
      if (!id) return null;
      const after = nums[nums.indexOf(id) + 1];
      const hash = u.searchParams.get("h") || (after && /^[0-9a-f]{6,20}$/i.test(after) ? after : "");
      return {
        provider: "Vimeo",
        src: `https://player.vimeo.com/video/${id}?dnt=1${hash ? "&h=" + hash : ""}`
      };
    }

    // Dailymotion
    if (host === "dailymotion.com" || host === "dai.ly") {
      const id = host === "dai.ly" ? parts[0] : (parts[0] === "video" ? parts[1] : parts[0] === "embed" ? parts[2] : "");
      const clean = (id || "").split("_")[0];
      if (!/^[a-z0-9]{5,12}$/i.test(clean)) return null;
      return { provider: "Dailymotion", src: `https://www.dailymotion.com/embed/video/${clean}` };
    }

    // Internet Archive (details/embed sayfaları; download/ linkleri kendi oynatıcımızda oynar)
    if (host === "archive.org") {
      if (parts[0] !== "details" && parts[0] !== "embed") return null;
      const rest = parts.slice(1).map(decodeURIComponent);
      if (!rest.length || !rest.every(p => /^[A-Za-z0-9._ ()-]{1,120}$/.test(p))) return null;
      return {
        provider: "Internet Archive",
        src: "https://archive.org/embed/" + rest.map(encodeURIComponent).join("/")
      };
    }

    return null;
  }

  // Videonun yerine resmi oynatıcıyı koyar
  function mount(box, info, title) {
    const frame = document.createElement("iframe");
    frame.src = info.src;
    frame.title = (title || "Film") + " (" + info.provider + ")";
    frame.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.className = "embed-frame";
    box.replaceChildren(frame);
    return frame;
  }

  return { parse, mount };
})();
