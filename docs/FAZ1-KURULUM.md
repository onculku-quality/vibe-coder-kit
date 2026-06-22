# Faz 1 — Kurulum Rehberi (Adım Adım)

Bu rehber, kod bilmeyen bir kullanıcının uygulamayı çalışır hale getirmesi için
hazırlanmıştır. Sırasıyla takip edin.

---

## Adım 1: Supabase Hesabı ve Projesi Oluşturma

1. **supabase.com** adresine gidin
2. Sağ üstten **"Start your project"** düğmesine basın
3. GitHub veya e-posta ile ücretsiz hesap oluşturun
4. **"New Project"** düğmesine basın
5. Şunları doldurun:
   - **Name:** `denetim` (veya istediğiniz bir isim)
   - **Database Password:** Güçlü bir şifre belirleyin ve **kaydedin** (gerekirse)
   - **Region:** `Frankfurt` (Türkiye'ye en yakın) veya `East US`
   - **Pricing Plan:** Free ($0) — yeterli
6. **"Create new project"** düğmesine basın
7. Projenin hazırlanmasını bekleyin (1-2 dakika)

---

## Adım 2: Proje URL ve Anahtarını Alma

1. Supabase Dashboard'da sol menüden **Project Settings** (dişli simgesi) → **API**
2. Şu iki değeri kopyalayın:
   - **Project URL:** `https://xxxxx.supabase.co` gibi bir adres
   - **anon public** anahtarı (Project API Keys altında, "anon" yazan)

---

## Adım 3: .env Dosyasını Oluşturma

1. Proje klasöründe `benim-projem` → `.env.example` dosyasını bulun
2. Bu dosyayı kopyalayın ve adını `.env` yapın
3. `.env` dosyasını açın ve kopyaladığınız değerleri girin:

```
EXPO_PUBLIC_SUPABASE_URL=https://sizin-proje-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...sizin-anon-anahtariniz...
```

> **Önemli:** `.env` dosyası gizlidir, GitHub'a yüklenmez (`.gitignore`'da).

---

## Adım 4: E-posta Onayını Kapatma (Test İçin)

Kayıt sırasında e-posta onayı istemesin diye bu ayarı kapatın:

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Email** satırını bulun → yanındaki ayarları açın
3. **"Confirm email"** seçeneğini **KAPATIN** (off yapın)
4. **Save** düğmesine basın

> Bu ayar test sırasında kayıt olurken e-posta onayı gerektirmemesi içindir.
> Yayına alırken güvenlik için tekrar açabilirsiniz.

---

## Adım 5: Veritabanı Tablolarını Oluşturma

SQL migration dosyalarını Supabase SQL Editor'da sırayla çalıştırın.

1. Supabase Dashboard → **SQL Editor** (sol menü)
2. **"New query"** düğmesine basın
3. Aşağıdaki dosyaları **sırasıyla** kopyalayıp çalıştırın:

### 5.1 — Önce bu dosyayı çalıştırın:
`supabase/migrations/001_institutions_profiles.sql` dosyasını açın,
içindeki tüm metni kopyalayın, SQL Editor'a yapıştırın, **Run** düğmesine basın.
"Success" mesajı görmeniz gerekir.

### 5.2 — Sonra sırasıyla:
- `002_teams.sql` → kopyala → yapıştır → Run
- `007_invite_codes.sql` → kopyala → yapıştır → Run
- `008_activity_logs.sql` → kopyala → yapıştır → Run
- `010_invite_trigger.sql` → kopyala → yapıştır → Run

> Her dosyada "Success" mesajı görmelisiniz. Hata alırsanız tüm metni
> kopyaladığınızdan emin olun.

---

## Adım 6: Platform Admini (Kök Hesap) Oluşturma

Bu hesap sizin sahibi olduğunuz yönetici hesabıdır. Bir kez yapılır.

### 6.1 — Auth kullanıcısı oluşturma:
1. Supabase Dashboard → **Authentication** → **Users**
2. **"Add user"** → **"Create new user"** düğmesine basın
3. Şunları girin:
   - **Email:** Sizin e-posta adresiniz (giriş yaparken kullanacağınız)
   - **Password:** Güçlü bir şifre belirleyin (kaydedin!)
4. **"Auto Confirm User"** seçeneğini **İŞARETLEYİN**
5. **"Create user"** düğmesine basın

### 6.2 — Kullanıcı ID'sini kopyalama:
1. Oluşturduğunuz kullanıcı Users listesinde görünür
2. **User UID** sütunundaki uzun metni (UUID) kopyalayın
   (örnek: `a1b2c3d4-e5f6-...`)

### 6.3 — Profil kaydını oluşturma:
1. `supabase/migrations/000_bootstrap_platform_admin.sql` dosyasını açın
2. `BURAYA-KULLANICI-UUID-YAZIN` yazan yere kopyaladığınız UUID'yi yapıştırın
3. SQL Editor'a yapıştırın → **Run**
4. "Success" mesajı görmelisiniz

---

## Adım 7: Expo Go ile Test Etme

1. Telefonda **Expo Go** uygulamasını yükleyin (Google Play Store'dan)
2. Bilgisayarda terminal/komut penceresi açın
3. Proje klasörüne gidin: `benim-projem`
4. Şu komutu çalıştırın:
   ```
   npm start
   ```
5. Ekranda bir **QR kod** belirir
6. Telefonda Expo Go'yu açın → **"Scan QR code"** → QR kodu tarayın
7. Uygulama telefonda açılır

### Test Senaryosu (Faz 1):

1. **Platform admini ile giriş yapın**
   - E-posta: Adım 6'da belirlediğiniz e-posta
   - Şifre: Adım 6'da belirlediğiniz şifre
   - Ana sayfada "Kurum Yönetimi" düğmesi görünür

2. **Kurum oluşturun**
   - "Kurum Yönetimi" → "Yeni Kurum" → kurum adı girin → "Oluştur"

3. **Aboneliği aktif edin**
   - Kurum kartında "Aktif Et (30 gün)" düğmesine basın
   - "Abonelik Aktif" mesajı görünür, "30 gün" rozeti çıkar

4. **Davet kodu üretin**
   - "Davet Kodu" düğmesine basın
   - Kod ekranda görünür (örnek: `ABCD-EFGH`)

5. **İkinci cihazda kayıt olun** (rol testi)
   - Expo Go'yu başka bir telefonda açın (veya aynı telefonda çıkış yapın)
   - "Kayıt Ol" sekmesine geçin
   - Ad, e-posta, şifre ve **davet kodunu** girin
   - Kayıt başarılı → giriş yapın
   - Yeni kullanıcı "Ana Sayfa" ve "Profil" sekmelerini görür
   - "Kurum Yönetimi" düğmesi görünmez (rol: admin, platform_admini değil)

---

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| "Supabase çevre değişkenleri eksik" | `.env` dosyasını kontrol edin, URL ve anon key girili mi? |
| Giriş yapılamıyor | Email onayını kapattığınızdan emin olun (Adım 4) |
| Kayıt "Davet kodu geçersiz" hatası | Kodun doğru girildiğinden emin olun (büyük harf) |
| "Profil bilgisi bulunamadı" | Bootstrap SQL'ini çalıştırdığınızdan emin olun (Adım 6) |
| Kurum oluşturulamıyor | Platform admini ile giriş yaptığınızdan emin olun |
| QR kod görünmüyor | `npm start` komutunun tamamlandığını bekleyin |
