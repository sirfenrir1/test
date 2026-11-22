// The Last Frame — ortak sayfa betiği (ana sayfa, bağımsız sinema, film fonu)

// Alt bilgideki yıl
const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Üst menüdeki arama: Enter ile film arşivinde arar
const siteSearch = document.querySelector("#search");
if (siteSearch) {
  siteSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = siteSearch.value.trim();
      window.location.href = "arsiv.html" + (q ? "?q=" + encodeURIComponent(q) : "");
    }
  });
}

// Öne çıkan alan düğmesi
const featuredBtn = document.querySelector("#featured-button");
if (featuredBtn) {
  featuredBtn.addEventListener("click", () => {
    window.location.href = "arsiv.html";
  });
}
