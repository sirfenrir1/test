// The Last Frame — film öncesi reklam oynatıcısı (pre-roll)
// Kullanım: Preroll.run(videoKutusu, filmId) -> reklam bitince / geçilince çözülen bir Promise
// Ayarlar ads.js içindeki AD_SETTINGS'ten okunur.

const Preroll = (function () {
  function pickAd(list) {
    const ads = list.filter(a => a && a.video);
    if (!ads.length) return null;
    const total = ads.reduce((s, a) => s + (Number(a.weight) || 1), 0);
    let r = Math.random() * total;
    for (const a of ads) {
      r -= Number(a.weight) || 1;
      if (r <= 0) return a;
    }
    return ads[ads.length - 1];
  }

  const fmt = s => {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function seenKey(filmId) { return "tlf_ad_seen_" + (filmId || "genel"); }

  function alreadySeen(filmId) {
    try { return sessionStorage.getItem(seenKey(filmId)) === "1"; } catch (e) { return false; }
  }
  function markSeen(filmId) {
    try { sessionStorage.setItem(seenKey(filmId), "1"); } catch (e) {}
  }

  function run(box, filmId) {
    return new Promise(resolve => {
      const cfg = typeof AD_SETTINGS !== "undefined" ? AD_SETTINGS : null;
      if (!cfg || !cfg.enabled || !Array.isArray(cfg.ads)) return resolve(false);
      if (cfg.oncePerSession && alreadySeen(filmId)) return resolve(false);

      const ad = pickAd(cfg.ads);
      if (!ad) return resolve(false);

      const skipAfter = Math.max(0, Number(cfg.skipAfter) || 0);

      // ---- Katman ----
      const layer = document.createElement("div");
      layer.className = "ad-layer";
      layer.innerHTML = `
        <video class="ad-video" playsinline preload="auto"></video>
        <div class="ad-top">
          <span class="ad-badge">REKLAM</span>
          <span class="ad-sponsor"></span>
          <span class="ad-time"></span>
        </div>
        <button type="button" class="ad-sound" hidden>🔇 SESİ AÇ</button>
        <a class="ad-visit" target="_blank" rel="noopener sponsored" hidden>SİTEYİ ZİYARET ET ↗</a>
        <button type="button" class="ad-skip" disabled></button>
        <div class="ad-progress"><span></span></div>`;

      const v = layer.querySelector(".ad-video");
      const time = layer.querySelector(".ad-time");
      const skip = layer.querySelector(".ad-skip");
      const sound = layer.querySelector(".ad-sound");
      const visit = layer.querySelector(".ad-visit");
      const bar = layer.querySelector(".ad-progress span");

      layer.querySelector(".ad-sponsor").textContent = ad.title || "";

      let link = "";
      try {
        if (ad.link) {
          const u = new URL(ad.link, location.href);
          if (u.protocol === "https:" || u.protocol === "http:") link = u.href;
        }
      } catch (e) {}
      if (link) {
        visit.href = link;
        visit.hidden = false;
        v.style.cursor = "pointer";
        v.addEventListener("click", () => {
          window.open(link, "_blank", "noopener");
          v.pause();
        });
      }

      let finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        markSeen(filmId);
        v.pause();
        v.removeAttribute("src");
        v.load();
        layer.remove();
        resolve(true);
      }

      // Geçme düğmesi
      function updateSkip() {
        const left = skipAfter - v.currentTime;
        if (left <= 0) {
          skip.disabled = false;
          skip.textContent = "REKLAMI GEÇ ▸▸";
        } else {
          skip.disabled = true;
          skip.textContent = "Reklamı geçebilirsin: " + Math.ceil(left);
        }
      }
      skip.addEventListener("click", () => { if (!skip.disabled) finish(); });

      v.addEventListener("timeupdate", () => {
        updateSkip();
        if (v.duration) {
          time.textContent = fmt(v.duration - v.currentTime);
          bar.style.width = (v.currentTime / v.duration * 100) + "%";
        }
      });
      v.addEventListener("ended", finish);
      v.addEventListener("error", finish);           // reklam yüklenemezse film doğrudan başlar
      // Reklam tıklanınca duraklarsa sekmeye dönüldüğünde devam et
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !finished && v.paused) v.play().catch(() => {});
      });

      sound.addEventListener("click", () => {
        v.muted = false;
        sound.hidden = true;
        v.play().catch(() => {});
      });

      // Takılırsa (ör. 15 sn hiç oynamazsa) filmi beklettirme
      const stall = setTimeout(() => { if (!finished && v.currentTime === 0) finish(); }, 15000);
      v.addEventListener("playing", () => clearTimeout(stall), { once: true });

      updateSkip();
      box.append(layer);
      v.src = new URL(ad.video, location.href).href;

      // Tarayıcılar sesli otomatik oynatmayı engelleyebilir: önce sesli dene, olmazsa sessiz başlat
      v.play().catch(() => {
        v.muted = true;
        sound.hidden = false;
        v.play().catch(() => {
          // Sessiz de başlamazsa tıklayınca başlat
          sound.hidden = true;
          const start = document.createElement("button");
          start.type = "button";
          start.className = "ad-start";
          start.textContent = "▶ OYNAT";
          start.addEventListener("click", () => {
            start.remove();
            v.muted = false;
            v.play().catch(finish);
          });
          layer.append(start);
        });
      });
    });
  }

  return { run };
})();
