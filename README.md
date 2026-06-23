# Denetim Yönetim Sistemi

Çok kiracılı (multi-tenant) kurum içi denetim uygulaması. SKS, SAS, ISO, BRCGS
gibi standartlara göre denetim planları, toplantılar, saha denetimleri ve DİF
kayıtlarını dijitalleştirir.

## Ürün ve Yol Haritası

- **Ürün Vizyonu ve Özellikler:** [`docs/PRODUCT.md`](docs/PRODUCT.md)
- **Geliştirme Yol Haritası (Fazlar):** [`docs/ROADMAP.md`](docs/ROADMAP.md)
- **Kurulum Rehberi:** [`docs/FAZ1-KURULUM.md`](docs/FAZ1-KURULUM.md)
- **Yayınlama Rehberi:** [`docs/YAYINLAMA.md`](docs/YAYINLAMA.md)

## Teknoloji Yığını

- **Expo** (SDK 56) + Expo Router + TypeScript
- **NativeWind** (Tailwind) + lucide-react-native (ikonlar)
- **Supabase** (Auth + Postgres + Storage + RLS)
- **TanStack React Query** (veri çekme/önbellek)
- **expo-image-picker** (kanıt fotoğrafı)

## Hızlı Başlangıç

```bash
npm install
cp .env.example .env          # Supabase URL + anon key girin
npm start                     # Expo Go ile QR tara
```

## Geliştirme Komutları

```bash
npm run typecheck    # TypeScript tip kontrolü
npm run lint         # ESLint
npm start            # Expo dev server
```

## Klasör Yapısı

```
app/              Expo Router sayfaları
  (auth)/         Giriş + kayıt ekranı
  (tabs)/         Alt tab navigasyon
    index         Ana sayfa (rol bazlı özet)
    standards     Standart + soru yönetimi (admin)
    plans         Denetim planı CRUD + [id] toplantı akışı (admin/baş denetçi)
    teams         Takım CRUD (admin)
    users         Davet kodu + kullanıcı + takıma atama (admin)
    audits        Saha denetimi atama + [id] soru cevaplama/kamera (kurum)
    difs          DİF kayıtları + [id] durum akışı (kurum)
    activity      Aktivite logları (admin/baş denetçi)
    profile       Profil
  platform/       Platform admini: kurum yönetimi
components/        Yeniden kullanılabilir UI bileşenleri
lib/               Supabase istemcisi, auth, tipler, storage, yardımcılar
hooks/             React Query sarmalayıcıları (teams, profiles, invite, standards, plans, meetings, audits, difs, activity, stats)
constants/         Rol, durum, enum etiketleri (TR)
supabase/migrations/  SQL migration dosyaları (000–016)
supabase/functions/   Edge Function (verify-subscription iskeleti)
docs/              Kurulum + yayınlama rehberleri
assets/            İkon, splash görseller
```



## Roller

| Rol | Açıklama |
|---|---|
| Platform Yöneticisi | Sistem sahibi. Kurum açar, abonelik yönetir, davet kodu üretir. |
| Kurum Yöneticisi | Kurum içi yönetici. Standart/takım/kullanıcı yönetir. |
| Baş Denetçi | Plan oluşturur, denetçi atar, DİF onaylar. |
| Denetçi | Saha denetimi doldurur, kanıt ekler, bulgudan DİF açar. |
