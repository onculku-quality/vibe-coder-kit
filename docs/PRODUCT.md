# Ürün Dokümanı (Product Document)

## 1. Ürün Vizyonu ve Değer Önerisi
Denetim Yönetim Sistemi (Tetkik App), hastaneler, laboratuvarlar, gıda ve üretim tesisleri gibi yüksek standartlara (SKS, SAS, ISO, BRCGS vb.) tabi kurumların kağıt ve Excel tabanlı iç denetim süreçlerini dijitalleştiren çok kiracılı (multi-tenant) bir mobil SaaS (Hizmet Olarak Yazılım) çözümüdür.

Uygulamanın temel amacı; kurum içi kalite standartlarının korunmasını sağlamak, denetçilerin sahadaki yükünü hafifletmek ve elde edilen bulguları anında dijital kayıtlar ve fotoğraflarla kanıtlayarak uygunsuzlukların giderilme sürecini hızlandırmaktır.

## 2. Hedef Kitle
*   **Sağlık Kurumları:** Sağlıkta Kalite Standartları (SKS) ve Sağlık Akreditasyon Standartları (SAS) denetimlerini yürüten hastaneler ve tıp merkezleri.
*   **Üretim ve Gıda Tesisleri:** ISO 9001, BRCGS, IFS gibi kalite ve gıda güvenliği standartlarına uymak zorunda olan tesisler.
*   **Laboratuvarlar:** ISO 15189 veya ISO 17025 gerekliliklerini sağlayan kurumlar.
*   **Her Türlü Kurum İçi Denetim:** Kendi özel iç standartlarını uygulayıp sahada denetlemek isteyen organizasyonlar.

## 3. Temel Problemler ve Çözümler

| Mevcut Problem | Tetkik App'in Çözümü |
| --- | --- |
| Denetimlerin kağıt ve Excel ile yapılması, evrak yükü yaratması. | Tamamen dijitalleştirilmiş anketler ve mobil uyumlu soru formları. |
| Sahadaki uygunsuzlukların kanıtlanmasının ve raporlanmasının zorluğu. | Mobil cihaz kamerasıyla çekilen fotoğrafların anında ilgili bulguya eklenmesi (Supabase Storage entegrasyonu). |
| Denetim sonuçlarından Düzeltici / Önleyici Faaliyet (DİF) oluşturmanın vakit alması. | Uygunsuz bulgulardan tek tuşla, veriyi doğrudan bağlayarak DİF kaydı oluşturulabilmesi. |
| Tüm verilerin kurum izolesinden yoksun olması veya güvenlik riskleri. | Row Level Security (RLS) ile donatılmış Supabase mimarisi sayesinde tam kurumsal veri izolasyonu. |

## 4. Kullanıcı Rolleri ve Yetkileri

Uygulama temel olarak dört ana rolden oluşur:

1.  **Platform Yöneticisi (Super Admin):** 
    *   Uygulamanın sahibidir (Geliştirici).
    *   Kurumları (kiracıları) açar, sistem üzerindeki abonelik durumlarını kontrol eder.
    *   İlk kurum yöneticisi için davet kodu üretir.
2.  **Kurum Yöneticisi (Admin):**
    *   Kurumu sistemde temsil eden yöneticidir.
    *   Standart ve soru bankasını yönetir.
    *   Kullanıcıları, takımları ve davet kodlarını yönetir.
    *   Tüm planları ve denetimleri görebilir, DİF'leri inceleyip kapatabilir.
3.  **Baş Denetçi:**
    *   Denetim planlarını oluşturur.
    *   Bu planlara uygun denetçileri atar.
    *   Kapanış toplantılarını ve alınan kararları sisteme girer.
    *   DİF'leri yönetebilir ve denetleyebilir.
4.  **Denetçi:**
    *   Sahada denetimi gerçekleştiren kişidir.
    *   Kendisine atanan görevleri ve soruları görür, yanıtlar (Uygun, Kısmen, Uygun Değil, Uygulanamaz).
    *   Kanıt niteliğinde fotoğraf çeker.
    *   Kendi bulduğu uygunsuzluklar üzerinden DİF açabilir.

## 5. Uygulamanın Temel Modülleri

*   **Standart Yönetimi:** Kurumların uyguladıkları standartları ve her bir standardın barındırdığı maddeleri (soruları) yönettikleri alan.
*   **Denetim Planları ve Toplantılar:** Tarihi, saati, departmanları ve görevli takımları belirlenmiş olan ana plan kayıtları. Açılış ve kapanış toplantısı kararlarının tutulduğu alan.
*   **Saha Denetimi (Audits):** Denetçilerin atanmış planları sahada uyguladığı, soruları cevaplayıp kanıt fotoğrafları yüklediği aktif mobil kullanım alanı.
*   **DİF (Düzeltici ve Önleyici Faaliyet) Yönetimi:** Kısmen veya Uygun Değil olarak değerlendirilen bulgulardan başlatılan; "Açık -> İnceleniyor -> Onaylanmış -> Kapalı" yaşam döngüsüne sahip düzeltici faaliyet akışı.
*   **Aktivite Logları (Denetim İzi):** Sistemde yapılan kritik değişikliklerin kim tarafından, ne zaman ve hangi kayıt üzerinde yapıldığının geriye dönük izlenebildiği denetim günlüğü.
*   **Özet Ekranı (Dashboard):** Tamamlanmış denetim sayılarını, açık DİF'leri ve genel uygunluk oranını gösteren başlangıç paneli.

## 6. İş ve Gelir Modeli
Sistem Google Play Store üzerinden dağıtılacak olup, **Google Play Billing (In-App Purchases - Subscriptions)** sistemi ile B2B SaaS modeli üzerinden gelir üretecektir. Kurumlar uygulamayı indirip aylık olarak kurum bazında abonelik ücreti öderler. Bu sayede geliştiricinin bireysel olarak ayrı bir faturalandırma veya B2B tahsilat altyapısı kurmasına gerek kalmadan, ödemeler Google üzerinden otomatik yenilenerek tahsil edilir.
