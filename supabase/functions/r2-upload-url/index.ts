// The Last Frame — Cloudflare R2 yükleme adresi üreten Supabase Edge Function
//
// Ne yapar?
//   Film ekleme aracı (yönetici) bir dosya yüklemek istediğinde buraya sorar.
//   Bu fonksiyon kullanıcının gerçekten yönetici olduğunu kontrol eder ve
//   R2'ye doğrudan yükleme yapılabilecek, 1 saat geçerli, imzalı bir adres döndürür.
//   R2'nin gizli anahtarları yalnızca burada (Supabase "Secrets" içinde) durur,
//   tarayıcıya asla gönderilmez.
//
// Gerekli Secrets (Supabase panel > Edge Functions > Secrets):
//   R2_ACCOUNT_ID         Cloudflare hesap kimliği
//   R2_ACCESS_KEY_ID      R2 API token'ının Access Key ID'si
//   R2_SECRET_ACCESS_KEY  R2 API token'ının Secret Access Key'i
//   R2_BUCKET             Bucket adı (ör. lastframe-filmler)
//   R2_PUBLIC_BASE_URL    Dosyaların herkese açık adresi (ör. https://pub-xxxx.r2.dev
//                         ya da https://video.siteadin.com), sonunda / olmadan

import { AwsClient } from "npm:aws4fetch@1.0.20";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Yalnızca film-ekle aracının ürettiği türde yollar: "film-adi-ab12/video.mp4"
const SAFE_PATH = /^[a-z0-9-]{1,60}\/[a-z0-9-]{1,40}\.[a-z0-9]{1,8}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Yalnızca POST." }, 405);

  // 1) Kullanıcı giriş yapmış ve yönetici mi?
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Oturum bulunamadı, tekrar giriş yap." }, 401);

  const { data: isAdmin, error: adminErr } = await sb.rpc("is_admin");
  if (adminErr) return json({ error: "Yetki kontrolü başarısız: " + adminErr.message }, 500);
  if (!isAdmin) return json({ error: "Bu işlem için yönetici olmalısın." }, 403);

  // 2) İstenen dosya yolu güvenli mi?
  let path = "";
  try { path = String((await req.json()).path || ""); } catch { /* boş kalır */ }
  if (!SAFE_PATH.test(path)) return json({ error: "Geçersiz dosya yolu: " + path }, 400);

  // 3) R2 için imzalı yükleme (PUT) adresi üret
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const bucket = Deno.env.get("R2_BUCKET");
  const publicBase = (Deno.env.get("R2_PUBLIC_BASE_URL") || "").replace(/\/+$/, "");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  if (!accountId || !bucket || !publicBase || !accessKeyId || !secretAccessKey) {
    return json({ error: "R2 ayarları eksik (Supabase > Edge Functions > Secrets)." }, 500);
  }

  const r2 = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const target = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${path}`);
  target.searchParams.set("X-Amz-Expires", "3600"); // 1 saat geçerli
  const signed = await r2.sign(new Request(target, { method: "PUT" }), { aws: { signQuery: true } });

  return json({ uploadUrl: signed.url, publicUrl: `${publicBase}/${path}` });
});
