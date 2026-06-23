# 🔐 Service Role JWT Rotate Talimatı

## Neden?
Test oturumunda service_role JWT'si (`eyJ...hJ7...`) benimle paylaşıldı. **Bu anahtarı `.env`'e yazmadım, hiçbir yere kaydetmedim, sadece bu oturumdaki REST çağrılarında kullandım.** Yine de güvenlik temizliği için Dashboard'dan yeni bir tane oluşturup eskisini devre dışı bırakın.

Ayrıca yeni key sistemi (`sb_publishable_*`) eski JWT formatındaki service_role'u da kabul etmiyor (PGRST301 hatası). Bu da bir rotate nedeni.

## Adımlar

### 1) Dashboard'a gidin
https://supabase.com/dashboard → proje seçin (`cgtvsvyqzfmtfgbfjpeu`)

### 2) API Keys sayfasını açın
Sol menüden **Settings → API** (veya **Project Settings → API Keys**)

### 3) Legacy / Secret Keys bölümünü bulun
- Eski sistemde: "API Keys" tablosunda `service_role` JWT
- Yeni sistemde: "Secret keys" bölümünde `sb_secret_...` formatında key'ler

### 4) Rotate (önerilen)
- "Legacy anon" ve "Legacy service_role" varsa: yanlarındaki "Rotate" veya yenileme butonuna basın
- "Secret keys" bölümünde "Create new secret key" → yeni anahtar oluşturun, **"service role"** adı verin, kopyalayıp **güvenli bir yere kaydedin** (örn. 1Password, Bitwarden)
- **ASLA** GitHub'a, public repo'ya, mesajlaşma uygulamasına yazmayın
- Eski anahtarı silin/devre dışı bırakın

### 5) Production ortamı
- Bu anahtar SADECE backend tarafında kullanılmalı (Edge Functions, server scripts)
- **Mobil bundle'a veya client-side kod'a ASLA girmemeli** (`EXPO_PUBLIC_*` env'lerine koymayın)
- Eğer test/dev ortamında kullanmak gerekirse: `.env`'e koyun, `.gitignore`'a `.env` ekli olduğundan emin olun (zaten ekli)

## Yeni key çalışıyor mu?
Test etmek için:

```bash
# Yeni service_role key ile basit bir API call
curl -X GET "https://cgtvsvyqzfmtfgbfjpeu.supabase.co/rest/v1/profiles?limit=1" \
  -H "apikey: <YENI_SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <YENI_SERVICE_ROLE_KEY>"
```

Beklenen: `200 OK` + JSON array (boş bile olsa dönmeli). `401 PGRST301` alıyorsanız key henüz propagate olmamış demektir, 5-10 dakika bekleyip tekrar deneyin.

## Production için ek not
- Google Play yayınlama öncesi tüm `service_role` / `sb_secret_*` anahtarları rotate edilmeli
- Ekip üyelerinin eski anahtarlara erişimi kesilmeli
- Yeni anahtar(lar) yalnızca production deployment pipeline'ında kullanılmalı (örn. CI/CD secret store)
