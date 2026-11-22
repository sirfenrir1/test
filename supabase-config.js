// The Last Frame — Supabase bağlantısı
// Bu anahtar "publishable" (herkese açık) anahtardır; güvenliği veritabanındaki
// Row Level Security kuralları sağlar (bkz. supabase-kurulum.sql).
// ASLA buraya "service_role" veya "secret" anahtar koyma.

const SUPABASE_URL = "https://cjcskhnugtehkczfrfvh.supabase.co";
const SUPABASE_KEY = "sb_publishable_P1_VNAFD9xu3WiLXEovJ3Q_nUgW7Jof";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
