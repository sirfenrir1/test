# Filmleri Cloudflare R2'de Saklama — Kurulum Rehberi

## Ne değişti, ne değişmedi?

| | Nerede? |
|---|---|
| Üyelik, giriş, profiller, yorumlar, forum, favoriler | **Supabase** (değişmedi) |
| Film listesi (ad, yıl, açıklama, video linki…) | **Supabase** veritabanı (değişmedi) |
| **Video, afiş ve altyazı dosyaları** | **Cloudflare R2** (yeni) |

Supabase'i bırakmıyoruz. Sadece büyük dosyaları ücretsiz trafik sunan R2'ye taşıyoruz.

### Nasıl çalışıyor?

```
Film ekleme aracı ──(1) "video.mp4 yükleyeceğim"──▶ Supabase Edge Function (r2-upload-url)
                                                     │ yönetici misin? kontrol eder
        ◀──(2) 1 saat geçerli imzalı R2 adresi ──────┘
        │
        └──(3) dosya doğrudan R2'ye gider ──▶ Cloudflare R2
                                               │
İzleyici ◀──(4) video R2'den izlenir ──────────┘  (trafik ücreti yok)
```

R2'nin gizli anahtarı tarayıcıya hiç gönderilmiyor, sadece Supabase'in içinde duruyor. Bu yüzden siteyi inceleyen biri anahtarı bulup kendi dosyalarını yükleyemez.

---

## Adım 1 — Cloudflare hesabı ve R2'yi açmak

1. https://dash.cloudflare.com adresinden ücretsiz hesap aç.
2. Sol menüden **R2 Object Storage**'a gir.
3. R2'yi etkinleştir. Cloudflare bir ödeme yöntemi (kart) isteyecek. Ücretsiz sınırı aşmadıkça ücret alınmaz:
   - 10 GB depolama/ay ücretsiz
   - Trafik (izleyicinin video indirmesi) **her zaman ücretsiz**
   - 10 GB'ı aşarsan GB başına yaklaşık $0.015/ay (100 GB film ≈ $1.35/ay)
4. R2 sayfasının sağ tarafındaki **Account ID**'yi bir yere not et.

## Adım 2 — Bucket (klasör) oluşturmak

1. R2 sayfasında **Create bucket**'a tıkla.
2. Ad: `lastframe-filmler`. Küçük harf ve tire kullan, boşluk olmasın.
3. Location: **Automatic**. Diğer ayarları olduğu gibi bırak ve oluştur.

## Adım 3 — Dosyaları herkese açık yapmak

İzleyicilerin videoyu izleyebilmesi için bucket'a herkese açık bir adres vermen gerekiyor.

Bucket'a gir, **Settings** sekmesini aç ve iki seçenekten birini kullan:

- **Hızlı başlangıç (r2.dev):** "Public Development URL" bölümünde **Enable** de. Sana `https://pub-xxxxxxxx.r2.dev` gibi bir adres verir. Denemek için ideal, ama Cloudflare bu adresi hız sınırlı tutuyor ve gerçek yayın için önermiyor.
- **Asıl kullanım (kendi alan adın):** Alan adın Cloudflare'e bağlıysa "Custom Domains" bölümünde **Connect Domain** de ve örneğin `video.siteadin.com` yaz. Siteyi yayına alınca bunu kullan.

Hangi adresi aldıysan not et. Bu senin **R2_PUBLIC_BASE_URL** değerin (sonunda `/` olmadan).

## Adım 4 — CORS ayarı (tarayıcıdan yükleme için şart)

Aynı **Settings** sekmesinde **CORS Policy** bölümünü bul, **Add CORS policy** (veya Edit) de ve şunu yapıştır:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- `PUT` film ekleme aracının dosya yükleyebilmesi için gerekli.
- `GET` altyazıların izleme sayfasında görünebilmesi için gerekli.
- Site yayına girdikten sonra `"*"` yerine kendi adresini yazarsan daha güvenli olur, örneğin `["https://siteadin.com"]`. Film ekleme aracını bilgisayarından açıyorsan o adresi de listeye ekle.

## Adım 5 — R2 API anahtarı oluşturmak

1. R2 ana sayfasında **Manage R2 API Tokens** (veya "API" → "Manage API tokens") bölümüne gir.
2. **Create API token**'a tıkla.
3. Permissions: **Object Read & Write**.
4. Specify bucket: **Apply to specific buckets only** seçip `lastframe-filmler`'i işaretle.
5. Oluşturunca sana iki değer gösterecek:
   - **Access Key ID**
   - **Secret Access Key**

   ⚠️ Secret'ı sadece bir kez gösterir, hemen kopyala. Bu anahtarları **asla** kodun içine, `supabase-config.js`'e veya GitHub'a koyma.

## Adım 6 — Supabase'e anahtarları girmek (Secrets)

Supabase paneli → projen → **Edge Functions** → **Secrets** (bazen "Manage secrets") → şu 5 değeri ekle:

| Ad | Değer |
|---|---|
| `R2_ACCOUNT_ID` | Adım 1'deki Account ID |
| `R2_ACCESS_KEY_ID` | Adım 5'teki Access Key ID |
| `R2_SECRET_ACCESS_KEY` | Adım 5'teki Secret Access Key |
| `R2_BUCKET` | `lastframe-filmler` |
| `R2_PUBLIC_BASE_URL` | Adım 3'teki adres, örn. `https://pub-xxxx.r2.dev` |

## Adım 7 — Edge Function'ı Supabase'e yüklemek

Bilgisayarına bir şey kurmana gerek yok, panelden yapabilirsin:

1. Supabase paneli → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Fonksiyon adı: **`r2-upload-url`**. Tam olarak bu adı yaz, kod bu ada göre arıyor.
3. Editördeki örnek kodu tamamen sil. Projedeki `supabase/functions/r2-upload-url/index.ts` dosyasının içeriğini yapıştır.
4. **Deploy**'a bas.
5. Fonksiyonun **Details/Settings** kısmında **"Verify JWT with legacy secret"** (veya "Enforce JWT verification") seçeneğini **kapat**. Fonksiyon yönetici kontrolünü zaten kendi yapıyor. Bu seçenek açık kalırsa yeni tip Supabase anahtarlarıyla 401 hatası alabilirsin.

## Adım 8 — Test etmek

1. `_yonetim-araci/film-ekle.html`'yi aç ve yönetici hesabınla giriş yap.
2. Küçük bir video seç (birkaç MB yeterli) ve **FİLMİ YÜKLE VE EKLE**'ye bas.
3. İlerleme çubuğu dolmalı. Sonra Cloudflare'de bucket'ın içinde `film-adi-xxxx/video.mp4` görünmeli.
4. Sitede arşive git ve filmi aç. Video artık R2'den oynuyor.

---

## Sık karşılaşılan hatalar

| Hata | Sebep / Çözüm |
|---|---|
| `Ağ hatası: R2'ye ulaşılamadı` | CORS ayarı yok veya yanlış (Adım 4). |
| `Yükleme adresi alınamadı: ... R2 ayarları eksik` | Secrets'tan biri eksik ya da adı yanlış yazılmış (Adım 6). |
| `Yükleme adresi alınamadı: Failed to send a request` / 404 | Fonksiyon deploy edilmemiş ya da adı `r2-upload-url` değil (Adım 7). |
| `401` / `Invalid JWT` | Adım 7.5'teki JWT doğrulamasını kapat. |
| `Bu işlem için yönetici olmalısın` | Hesabının `profiles.role` değeri `admin` değil (`supabase-yonetim-araci.sql`, 3. bölüm). |
| `R2 yüklemesi başarısız (403) SignatureDoesNotMatch` | Access Key ID / Secret yanlış kopyalanmış. Yeni token oluşturup Secrets'ı güncelle. |
| Video oynuyor ama altyazı yok | CORS'ta `GET` eksik. |

## Dosya boyutu hakkında

- Tek seferde en fazla **5 GB** yüklenebilir. Araç daha büyük dosyaları reddeder.
- Web için 1080p bir film genelde 1.5–3 GB olur. Dosya büyükse ücretsiz **HandBrake** programıyla küçült: "Fast 1080p30" ön ayarını ve MP4 formatını seç, "Web Optimized" kutusunu işaretle. Bu ayar ayrıca videonun indirme bitmeden oynamaya başlamasını sağlar.
- Ücretsiz 10 GB'a yaklaşık 4–6 film sığar. Sonrası 100 GB için ayda yaklaşık $1.35 tutar.

## Eski Supabase dosyaları

- Daha önce Supabase'e yüklediğin filmler eski linkleriyle çalışmaya devam eder. Hiçbir şeyi silmek zorunda değilsin.
- Supabase kotasını boşaltmak istersen: ilgili filmi R2'ye tekrar yükle (film ekleme aracından yeni kayıt olarak), sitede çalıştığını gör, sonra Supabase → Storage → `filimler ve filmler` içinden eski dosyayı sil.
- `films.js` içindeki ilk filmin linki hâlâ Supabase'i gösteriyor. İstersen o dosyayı R2'ye yükleyip linkini değiştirebilirsin.
