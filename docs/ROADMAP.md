# Geliştirme Yol Haritası (Roadmap)

Denetim Yönetim Sistemi'nin (Tetkik App) mevcut durumunu ve gelecekteki gelişim vizyonunu özetler.

## Mevcut Durum (Faz 1 - 10)
Uygulamanın MVP (Minimum Viable Product) özellikleri başarıyla tamamlanmış ve veri güvenliği testleri sağlanmıştır.

*   **✅ Altyapı ve Veri İzolasyonu:** Supabase Postgres, çok kiracılı mimari ve sağlamlaştırılmış Row Level Security (RLS) politikaları.
*   **✅ Kullanıcı ve Takım Yönetimi:** Davet kodu ile rol tabanlı sistem.
*   **✅ Standart ve Plan Yönetimi:** Standartların oluşturulması ve buna bağlı saatlik/departman bazlı iç denetim planları.
*   **✅ Saha Denetimi:** Soruların cevaplanması ve kameradan doğrudan Supabase Storage'a kanıt fotoğrafı eklenebilmesi.
*   **✅ DİF (Düzeltici/Önleyici Faaliyet) Süreci:** Uygunsuz bulgulardan tek tuşla, bir yaşam döngüsüne (durum yönetimi) bağlı DİF kayıtları.
*   **✅ Denetim İzi (Activity Logs):** Sistemdeki her tür kritik hareketin güvenli bir şekilde günlüklenmesi.
*   **✅ Mobil Arayüz:** Expo Router, NativeWind (Tailwind) ve lucide-react-native ile kullanıcı dostu arayüz.

---

## Lansman Öncesi Son Adımlar (Faz 9.5 & 11)

Lansmana çıkmadan önce teknik borçların kapatılması ve yayınlama altyapısının devreye alınması gerekmektedir.

*   **PostgREST ve JWT İyileştirmeleri:** Supabase üzerindeki key-rotation problemine bağlı PostgREST yetkilendirme hatalarının giderilmesi. `service_role` anahtarlarının panelden yenilenmesi.
*   **Production Ortamı Hazırlığı:** `.env` tarafında test amaçlı `mailer_autoconfirm` bayrağının kapatılarak gerçek kimlik doğrulama süreçlerine geçilmesi. 
*   **Google Play Billing Tamamlanması:** 
    *   Google Play Developer API entegrasyonu (OAuth2).
    *   Play Store üzerinden abonelik satın alındığında Supabase tarafını güncelleyecek gerçek zamanlı bildirimlerin (RTDN - Webhook) devreye alınması.
*   **Test Verilerinin Temizlenmesi:** Test ortamında biriken yetim kullanıcı kayıtları ve kurum verilerinin temizlenmesi (`docs/TEST-CLEANUP.sql`).
*   **Kapalı Test (Closed Testing):** Google Play'in politikası gereği 20 testçi ile en az 14 gün kapalı test yapılması.

---

## Orta Dönem İyileştirmeler (Faz 12)

Kullanıcı deneyimini bir üst seviyeye taşıyacak, iş akışını hızlandıracak özellikler.

*   **Push Bildirimleri (Push Notifications):**
    *   Yeni bir saha denetimi atandığında denetçiye bildirim gitmesi.
    *   Bir DİF açıldığında kurum yöneticisine veya baş denetçiye bildirim düşmesi.
    *   DİF durumu değiştiğinde (örn: Onaylandı) sorumluya haber verilmesi.
*   **Çevrimdışı Çalışma (Offline Mode):**
    *   Kurumların, internet çekmeyen bodrum katlarında veya ücra köşelerinde denetim yapabilmeleri.
    *   Cevapların (ve kanıtların) cihazda saklanıp (React Query Persist veya AsyncStorage) ağ bağlantısı sağlandığında otomatik senkronize edilmesi.

---

## Uzun Dönem Vizyonu (Faz 13 ve Sonrası)

Sistemin kurumsallaşması ve akıllı hale gelmesi.

*   **PDF ve Excel Dışa Aktarma (Export):**
    *   Gerçekleştirilen saha denetimlerinin veya açılış/kapanış toplantı tutanaklarının PDF formatında cihazda indirilmesi veya paylaşılması.
    *   DİF listelerinin Excel/CSV olarak alınarak aylık yönetim gözden geçirme (YGG) toplantılarına sunulması.
*   **Yönetici Dashboard'u (Web & Gelişmiş Analitik):**
    *   Şu anda sadece mobilde olan uygulamanın, sadece yöneticiler/baş denetçiler için detaylı analitikler sunan (departman bazlı başarı oranları vb.) bir web paneli haline gelmesi (Expo Web).
*   **AI Destekli Akıllı Öneriler:**
    *   Denetçi uygunsuz bir durum yazdığında/çektiğinde, yapay zekanın (Örn: Gemini) ilgili durum için olası kök neden analizlerini (Balık Kılçığı - Ishikawa) ve DİF çözümlerini önermesi.
    *   Denetim geçmişine bakarak kurumun riskli alanlarını yöneticilere raporlaması.
