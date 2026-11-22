// The Last Frame — REKLAM AYARLARI
// Film başlamadan önce oynayan reklam videoları (pre-roll) buradan yönetilir.
//
// Yeni reklam eklemek için "ads" listesine bir kayıt ekle:
//   video : reklam videosunun adresi. Supabase Storage linki önerilir
//           (ör. "https://....supabase.co/storage/v1/object/public/reklamlar/reklam1.mp4")
//           ya da sitedeki bir dosya (ör. "media/reklam1.mp4").
//   link  : reklama tıklanınca açılacak site (boş bırakılırsa tıklanamaz).
//   title : reklam verenin adı (oynatıcının köşesinde görünür).
//   weight: birden fazla reklam varsa seçilme ağırlığı (2 = iki kat sık çıkar).
//
// Birden fazla reklam varsa her gösterimde biri rastgele seçilir.

const AD_SETTINGS = {
  enabled: true,          // false yaparsan hiç reklam çıkmaz
  skipAfter: 5,           // kaç saniye sonra "Reklamı geç" düğmesi açılsın (0 = hemen)
  oncePerSession: true,   // aynı film için tarayıcı açıkken reklamı bir kez göster
  ads: [
    {
      id: "ornek-reklam",
      video: "media/reklam.mp4",
      link: "https://example.com",
      title: "Sponsor",
      weight: 1
    }
  ]
};
