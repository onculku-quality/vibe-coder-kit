# Faz 9 — Play Store'a Yayınlama Rehberi

Bu rehber, uygulamayı Google Play Store'a yayınlamak ve gerçek Play Billing
aboneliğini bağlamak için hazırlanmıştır. Kod bilmeyen bir kullanıcı için adım
adım yazılmıştır.

> **Önemli:** Google Play kuralları zamanla değişebilir. Yayınlama aşamasında
> güncel şartları (testçi sayısı, test süresi, faturalandırma politikaları)
> Play Console yardım sayfalarından teyit edin.

---

## Bölüm 1: Bireysel Geliştirici Hesabı

1. **play.google.com/console** adresine gidin
2. **"Bireysel"** hesap türünü seçin (şirket gerekmez)
3. Google hesabınızla giriş yapın
4. Kimlik doğrulama:
   - **Kimlik belgesi** (ehliyet veya kimlik) yükleyin
   - **Selfie** ile yüz doğrulaması yapın
   - Bu adım birkaç dakika sürebilir
5. Tek seferlik **25 USD** kayıt ücretini ödeyin (kredi kartı)
6. Hesabınızın onaylanmasını bekleyin (genelde birkaç saat – 3 gün)

> **Not:** Bireysel hesapla uygulama yayımlayabilir ve abonelik satabilirsiniz.
> Ayrı bir şirket kurmanız gerekmez.

---

## Bölüm 2: Mali Konular (Önemli)

- Google Play satışlardan **%15 hizmet kesintisi** uygular (küçük geliştiriciler
  için ilk 1M USD'ye kadar; sonrasında %30 olabilir — güncel oranı kontrol edin).
- Google merchant of record olduğu için **fatura/şirket gerekmez**; Google
  müşteriden tahsilatı yapar ve size ödeme yapar.
- Gelirinizi **yerel gelir beyanı** kapsamında beyan etmeniz gerekir. Bunun için
  **bir mali müşavire danışın**. Bu rehber hukuki/mali tavsiye değildir.

---

## Bölüm 3: Uygulama Kimliği ve EAS Kurulumu

### 3.1 — Paket adını ayarlayın

`app.config.ts` dosyasında şu satırı kendinize göre düzenleyin:
```ts
android: { package: 'com.sizinadi.denetim' }   // com.sizinadi kısmını kendi işaretinizle değiştirin
ios:   { bundleIdentifier: 'com.sizinadi.denetim' }
```
Paket adı geri alınamaz — dikkatli seçin (ters alan adı biçimi).

### 3.2 — Expo CLI ve EAS'yi kurun
Terminalde:
```bash
npm install -g eas-cli
eas login                  # Expo hesabınızla giriş
eas build:configure        // eas.json oluşturur
```

### 3.3 — EAS projectId alın
```bash
eas init
```
Çıktıdaki `projectId` değerini `app.config.ts` içindeki `EAS_PROJECT_ID` yerine
yazın (veya `.easignore`/çevre değişkeniyle sağlayın).

---

## Bölüm 4: IAP (Uygulama İçi Satın Alma) Entegrasyonu

> **Kritik:** `react-native-iap` **Expo Go'da çalışmaz**. Gerçek cihazda test
> için **EAS development build** gerekir. Faz 1–8 Expo Go ile test edilmiştir;
> IAP yalnızca bu fazda dev build ile çalışır.

### 4.1 — Geliştirme build'i oluşturun
```bash
eas build --profile development --platform android
```
Bu, cihaza yüklenebilir bir `.apk` üretir (Expo Go yerine bu kullanılır).

### 4.2 — Bağımlılıkları ekleyin
```bash
npx expo install expo-dev-client
npm install react-native-iap
```
`app.config.ts` plugins dizisine ekleyin:
```ts
plugins: [
  'expo-router',
  'expo-dev-client',
  ['expo-splash-screen', { /* ... */ }],
  // react-native-iap yerel modül olduğu için autolinking ile gelir
],
```
Bu değişiklikten sonra tekrar `eas build --profile development` çalıştırın.

### 4.3 — "Abone Ol" akışını bağlayın
- `app/platform/institutions.tsx` içindeki platform admini "Aktif Et (30 gün)"
  düğmesi (manuel abonelik uzatma) yalnızca geliştirme/kurulum kolaylığı içindir.
  Yayın sonrasında kaldırılır veya yalnızca platform admini için tutulur; gerçek
  kullanıcı akışı `react-native-iap` ile `requestSubscription` çağrısı yapıp,
  alınan `purchaseToken`'ı Supabase Edge Function `verify-subscription`'a
  (kullanıcı JWT'si `Authorization: Bearer` başlığında) gönderir.
- Doğrulama başarılı olunca kurumun `subscription_status` / `subscription_active_until`
  alanları güncellenir.

---

## Bölüm 5: Supabase Service Account ve Webhook

### 5.1 — Google Cloud service account
1. **console.cloud.google.com** → proje oluşturun (veya Play ile bağlantılıyı seçin)
2. **IAM & Admin → Service Accounts → Create**
3. **Google Play Developer API** erişimi verin
4. **Play Console → Setup → API access** ile service account'u bağlayın
5. Service account için **JSON anahtar** indirin

### 5.2 — Anahtarı Supabase'e secret olarak ekleyin
```bash
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{ ...indirilen JSON... }'
```
> **Asla** bu JSON'u uygulamaya veya GitHub'a koymayın.

### 5.3 — Edge Function'u dağıtın
```bash
supabase functions deploy verify-subscription --no-verify-jwt
```
> `--no-verify-jwt` burada **kasıtlı**: fonksiyon kendi içinde `Authorization:
> Bearer <jwt>` başlığını doğrular ve çağıranın platform_admini VEYA ilgili
> kurumun admin'i olduğunu kontrol eder (Edge Function kodu). Supabase'in
> built-in JWT doğrulaması ile çakışmasın diye kapatılır.

`supabase/functions/verify-subscription/index.ts` bir iskelettir — Google Play
Developer API entegrasyonu (token doğrulama + abonelik güncelleme) yayınlama
aşamasında tamamlanır (TODO yorumları dosyada işaretli).

### 5.3.1 — İsteğe bağlı: CORS kısıtlama
Mobil uygulama aynı origin'den çağırdığı için CORS gevşek bırakılabilir, ancak
üretimde bilinen bir kök alan adıyla sınırlamak için Supabase secret olarak
`ALLOWED_ORIGIN` tanımlayın:
```bash
supabase secrets set ALLOWED_ORIGIN='https://denetim.example.com'
```

### 5.4 — RTDN webhook (yenileme/iptal)
Google **Real-time Developer Notifications** ile abonelik yenileme/iptal olayları:
1. **Play Console → Monetization → RTDN** adresinden Pub/Sub konusu oluşturun
2. Bir `play-rtdn-webhook` Edge Function yazıp dağıtın (aynı yapıda)
3. Pub/Sub push endpoint'ini bu fonksiyona yönlendirin
4. Fonksiyon, olay tipine göre kurum aboneliğini günceller

---

## Bölüm 6: Mağaza Listeleme Bilgileri

Play Console → uygulamanızı oluşturun ve şunları hazırlayın:
- **Uygulama adı:** Denetim Yönetim Sistemi
- **Kısa açıklama / Uzun açıklama:** denetim planları, saha denetimi, DİF takibi
- **Uygulama simgesi:** 512x512 PNG
- **Özellik grafiği:** 1024x500 PNG
- **Ekran görüntüleri:** en az 2 adet (telefon)
- **Gizlilik politikası URL'i** (zorunlu — basit bir sayfa hazırlayın)
- **Veri güvenliği beyanı:** uygulamanın topladığı verileri işaretleyin
- **İçerik derecelendirmesi:** anketi doldurun (iş/üretim aracı)

---

## Bölüm 7: Kapalı Test (Zorunlu)

Google, ilk yayından önce **kapalı test** ister:
- En az **20 testçi** ekleyin (gerçek kullanıcılar)
- **14 gün** boyunca test yayınlanmış olsun
- Testçiler uygulamayı yükleyip kullanmalı
- Bu süreçten sonra üretim yayınına geçebilirsiniz

### Test akışı:
1. `eas build --profile preview --platform android` → `.apk` paylaşın (test için)
2. Play Console → **Internal testing** track → testçilerin e-postalarını ekleyin
3. **License test hesapları** ekleyin (gerçek ödeme yapmadan IAP testi için)
4. Testçiler: kayıt → davet kodu → denetim → DİF → abonelik akışını denesin

---

## Bölüm 8: Üretim Yayını

1. `eas build --profile production --platform android` → imzalı `.aab` üretir
2. `eas submit --platform android` → `.aab`'i Play Console'a yükler
   (veya Play Console'a manuel yükleyin)
3. **Üretim track** → sürümü incelemeye gönderin
4. Google incelemesi (birkaç saat – birkaç gün) onayından sonra yayın

---

## Bölüm 9: Yayın Sonrası

- **Abonelik ürünlerini** Play Console → Monetization → Products içinde oluşturun
  (örn: aylık/yıllık abonelik; `product_id` değerlerini kodla eşleştirin).
- Crashlytics/analitik eklemek isterseniz `expo-application` + Sentry vb.
- Geri bildirim ve hataları Play Console → Crashes/ANR'den izleyin.

---

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| `eas build` IAP hatası | `expo-dev-client` + `react-native-iap` ekli mi? Development build mi? |
| Abonelik doğrulanmıyor | Service account JSON secret olarak ayarlı mı? Edge Function dağıtıldı mı? |
| `package` adı çakışması | Paket adı Play'de benzersiz olmalı; `com.sizinadi.denetim` farklılaştırın |
| Testçi daveti gitmedi | Testçi e-postası Google hesabıyla eşleşmeli; internal testing track'i kontrol edin |
| RTDN çalışmıyor | Pub/Sub push endpoint ve service account izinlerini kontrol edin |
