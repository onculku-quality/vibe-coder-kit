# Denetim Yönetim Sistemi — Mobil SaaS

Çok kiracılı kurum içi denetim uygulaması (Expo + Supabase).

## Geliştirme Komutları

```bash
npm install          # Bağımlılıkları kur
npm start            # Expo dev server başlat (Expo Go ile QR tara)
npm run typecheck    # TypeScript tip kontrolü (tsc --noEmit)
npm run lint         # ESLint (expo lint)
```

## Çevre Değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve Supabase URL + anon key girin:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Teknoloji Yığını

- Expo (SDK 56) + Expo Router + TypeScript
- NativeWind (Tailwind) + lucide-react-native
- @supabase/supabase-js (Auth + Postgres + Storage + RLS)
- @tanstack/react-query (veri çekme)
- expo-image-picker (kanıt fotoğrafı)

## Klasör Yapısı

- `app/` — Expo Router sayfaları (dosya tabanlı yönlendirme)
- `components/` — Yeniden kullanılabilir UI bileşenleri
- `lib/` — Supabase istemcisi, auth, tipler, yardımcılar
- `hooks/` — React Query sarmalayıcıları (Faz 2+)
- `constants/` — Rol, durum, enum etiketleri (TR)
- `supabase/migrations/` — SQL migration dosyaları
- `assets/` — İkon, splash görselleri

## Çalışma Kuralları (Tüm Oturumlar İçin Bağlayıcı)

1. **BAĞLAM ÖNCE — tek oturumda EN FAZLA 1–2 faz (kural 5 baskındır):** Bir faz bitince sonraki faza geçilebilir ANCAK bu bağlam şişmedikçe geçerlidir. **Asla 2'den fazla fazı tek oturumda tamamlama.** Faz bitince: durum özetle → AGENTS.md güncelle → typecheck+lint → DUR ve "yeni oturuma geç, 'Faz X devam et' de" yönergesi ver. Kural 1 eski halindeki "onay beklemeden hemen geç" yanlış yorumlanmıştır — bağlam önce. Kullanıcının manuel adımları rehber olarak verilir, beklenerek durulmaz; ama bağlam şişirmek için ileri taşınmaz.
2. **Tam kod, kısaltma yok:** Hiçbir dosya/fonksiyon "buraya geri kalanını ekleyin" diye kısaltılmaz — tam ve çalıştırılabilir olmalı.
3. **Hata yönetimi dahili:** Tüm async çağrılar `try/catch` içinde; boş/null kontrolleri ve Türkçe hata mesajları baştan eklenir.
4. **Dil:** Kullanıcıya yüzey metinleri, yorumlar, iletişim Türkçe; kod tanımlayıcıları İngilizce.
5. **Oturum yönetimi — OTOMATİK GEÇİŞ (PROAKTİF):** Bağlam (context) limiti dolmaya yaklaştığında VEYA bir faz tamamlandığında, agent beklemeden kendisi proaktif olarak:
   - O ana kadar yapılanların özetini çıkarır (hangi faz, hangi dosyalar, nerede kalındı)
   - Dosya sistemi ve git durumuyla teyit eder (gerçek durum, hafızadan değil)
   - Kullanıcıya net bir "Kaldığımız yer: X. Faz / Y. görev — yeni oturuma geçip 'Faz X devam et' demen yeterli" yönergesi verir
   - Kullanıcının onayını beklemeden bu geçiş noktasını kendi başlatır (bağlam tükenip çalışma yarıda kalmasın diye)
6. **Durum kontrolü:** Yeni oturuma geçince veya kritik adımdan önce, agent gerçek durumu anlamak için dosya yapısını + varsa git/terminal çıktılarını kontrol eder (kullanıcıdan konsol logu isteyebilir).
7. **Doğrulama:** Her faz sonunda `npm run typecheck` ve `npm run lint` çalıştırılır, hatalar giderilmeden faz bitirilmez.
8. **KOD GÖZDEN GEÇİRME — Faz 3'ten itibaren her oturumda (KURULUM PROJESİ, hatalar pahalı):** Her yeni oturum, önceki fazlarda yazılan kodu **satır satır gözden geçirerek** başlar — yalnızca typecheck/lint geçmesi yetmez. Kontrol edilenler:
   - SQL: RLS politika boşlukları, eksik index, cascade davranışı, trigger hataları
   - Hooks: query key tutarlılığı, invalidate eksikliği, hata yayılımı, null/boş dizi kontrolleri
   - Ekranlar: rol gate kontrolü, loading/error/empty durumları, form validasyon, navigasyon yolları
   - Tipler: DB kolonu ile TS tipi uyuşmazlığı, opsiyonel alanlar
   - Bulunan her hata DÜZELTİLİR, sonra bir sonraki fazın koduna geçilir
   - **Bu kuralın nedeni:** Bu basit bir iş değil, kurulum yapıyoruz. Burada yapılan hatalar sonra bizi çok uğraştıracak.

## Mevcut Durum (canlı tutulur — her faz sonunda güncellenir)

> **ÖNEMLİ — KURAL 8:** Faz 4–9 kodu tek oturumda hızlıca yazıldı (typecheck/lint geçiyor)
> ANCAK **satır satır gözden geçirilmedi**. Bu bir kurulum projesi — hatalar pahalı.
> Faz 4'ten itibaren her oturumda önceki kod gözden geçirilip düzeltilerek ilerlenir.

- **Faz 1 GÖZDEN GEÇRİLDİ ✅:** Temel kurulum + çok kiracılık iskeleti.
- **Faz 2 GÖZDEN GEÇRİLDİ ✅:** Kullanıcı + takım yönetimi.
  - `011_faz2_assign_team.sql`, `lib/activity.ts`, `hooks/useTeams|useProfiles|useInviteCodes.ts`
  - `app/(tabs)/teams/index.tsx`, `app/(tabs)/users/index.tsx`, `app/(tabs)/_layout.tsx`
- **Faz 3 GÖZDEN GEÇİRİLDİ ✅:** Standartlar + Denetim Planları.
  - `012_faz3_standards.sql`, `013_faz3_plans.sql`
  - `lib/types.ts` (Standard, StandardQuestion, AgendaItem, Plan, PlanStatus)
  - `constants/statuses.ts` (PLAN_STATUS), `hooks/useStandards.ts`, `hooks/usePlans.ts`
  - `app/(tabs)/standards/index.tsx`, `app/(tabs)/plans/index.tsx`
  - Gözden geçirmede düzeltilenler:
    - `useUpdatePlan`: `['plan', plan.id]` invalidate eksikti → eklendi (detay sayfası stale data gösteriyordu)
    - `UpdatePlanInput`: `status`/`departments`/`hourlyAgenda` opsiyoneldi + `?? 'planlandi'`/`?? []` default'ları tehlikeliydi (status sıfırlanabilirdi) → required yapıldı, default'lar kaldırıldı
    - `useDeleteStandard`/`useDeletePlan`: `logActivity` target bilgisizdi → `targetType`/`targetId` eklendi (denetim izi için)
    - `standards/index.tsx`: `handleAddQuestion` `questions.length`'i orderIndex olarak kullanıyordu (silme sonrası duplicate order_index) → `Math.max(...order_index) + 1` olarak düzeltildi
    - `lib/types.ts`: `Plan.hourly_agenda: AgendaItem[] | null` → `AgendaItem[]` (DB NOT NULL kısıtıyla uyumlu)
- **Faz 4 GÖZDEN GEÇİRİLDİ ✅:** Açılış / Kapanış toplantıları.
  - `014_faz4_meetings.sql` (+updated_at+trigger), `hooks/useMeetings.ts`, `app/(tabs)/plans/[id].tsx`
  - `lib/types.ts` (Meeting tipi eklendi: agenda/decisions NOT NULL uyumlu)
  - Gözden geçirmede düzeltilenler:
    - `Meeting.agenda`/`decisions` `... | null` idi ama SQL `JSONB NOT NULL DEFAULT '[]'` → `MeetingAgendaItem[]` / `MeetingDecision[]` yapıldı
    - `meetings` tablosuna `updated_at` + `set_updated_at` trigger eklendi (audit_answers/difs ile tutarlı)
    - `useUpdateMeeting`'e `institutionId` parametresi + actor eşleşme kontrolü eklendi (create ile tutarlı savunma-derinliği)
    - Toplantı tarihi timezone bug'ı: `YYYY-MM-DD HH:MM` doğrudan PG'ye gidiyordu → UTC'de parse edilip kullanıcının girdiği local saat kayboluyordu (TR'de 09:30 yazıp 12:30 görüyordu). `localDateTimeToISO` / `isoToLocalFormValue` helper'ları eklendi, form değeri artık local olarak parse edilip ISO 8601 UTC'ye çevriliyor
    - `useDeleteMeeting` artık `meta.type`/`meta.plan_id` log'luyor (silinen toplantı tipi/bağlamı denetim izinde görünür)
    - `plans/[id].tsx` — `meetingsQuery.error` artık kırmızı banner + Tekrar Dene butonu ile gösteriliyor (önceden yüklenememe boş liste gibi gösteriliyordu; duplicate oluşturma riski)
- **Faz 5 GÖZDEN GEÇRİLDİ ✅:** Saha denetim modülü + kanıt fotoğrafı.
  - `015_faz5_audits.sql` (+assigned_to trigger, +atomik kanıt RPC'leri, sıkı storage delete), `lib/storage.ts` (dead code kaldırıldı), `hooks/useAudits.ts` (RPC kullanımı), `app/(tabs)/audits/index.tsx`, `app/(tabs)/audits/[id].tsx`
  - Gözden geçirmede düzeltilenler:
    - `useAddEvidence`/`useRemoveEvidence` read-modify-write yarış koşu → `add_evidence_to_answer` / `remove_evidence_from_answer` SECURITY DEFINER RPC'leri (atomik `array_append`/`array_remove`, storage delete + DB update tek transaction)
    - `useCreateAudit`: `assigned_to` farklı kurumdan kullanıcıya atanabiliyordu → `validate_audit_assigned_to` BEFORE INSERT/UPDATE trigger'ı (DB seviyesinde bypass edilemez)
    - Storage DELETE RLS her kurum kullanıcısına açıktı (DOS riski) → `audit_evidence_delete_admin_basdenetci` (RPC SECURITY DEFINER ile denetçi hâlâ silebilir)
    - `useAuditAnswers` kurumdaki TÜM standart sorularını çekiyordu (gereksiz trafik) → `standardId` parametresi eklendi, sadece ilgili standardın soruları çekiliyor
    - `lib/storage.ts`: yanıltıcı `evidencePublicUrl` dead code kaldırıldı (bucket private, çağrı 403 verirdi)
    - `useUpdateAnswer` / `useUpdateAuditStatus`: kurum eşleşmesi client-side defense-in-depth eklendi (RLS zaten var)
    - `useDeleteAudit` log'unda `targetType`/`targetId` eksikti → eklendi; ayrıca `['audit', id]` invalidation eklendi
    - `audits/[id].tsx` tarih validasyonu: regex sadece format kontrol ediyordu (`2025-13-32` geçerdi) → gerçek tarih kontrolü (ay/gün aralığı + Date roundtrip)
    - `EvidencePhotos` `useEffect` yarış koşu: hızlı ardışık `paths` değişimlerinde stale URL set ediliyordu → `latestReq` ref ile sadece son istek commit edilir
    - `audits/[id].tsx`'te `audit` tanımdan önce kullanılıyordu (TS2448) → `useAuditAnswers` `audit`'ten sonra çağrılacak şekilde sıralandı
    - `difs/index.tsx` `useAuditAnswers`'ı 1 argümanla çağırıyordu → `selectedAudit?.standard_id` ikinci argüman olarak eklendi
- **Faz 6 GÖZDEN GEÇRİLDİ ✅:** Düzeltici / Önleyici Faaliyet (DİF) yönetimi.
  - `016_faz6_difs.sql` (`difs` + `dif_status_history` tabloları, INSERT/UPDATE history trigger'ları, mutually-exclusive `updated_at` trigger'ları, kurum izole RLS), `hooks/useDifs.ts`, `app/(tabs)/difs/index.tsx`, `app/(tabs)/difs/[id].tsx`, `constants/statuses.ts` (DIF_STATUS/COLOR/ORDER)
  - Gözden geçirmede düzeltilenler:
    - `useUpdateDif` / `useChangeDifStatus`: kurum eşleşmesi client-side defense-in-depth eksikti (RLS zaten var) → `actor.institution_id` null check + dönen satırın `institution_id` doğrulaması eklendi (`useUpdateAuditStatus`/`useUpdateAnswer` ile tutarlı)
    - `useDeleteDif` log'unda `targetType`/`targetId` eksikti (denetim izi için, Faz 3 düzeltmesiyle tutarsız) → eklendi; ayrıca `['dif', difId]` invalidation eklendi (detay sayfası stale data göstermesin)
    - `difs/index.tsx` & `difs/[id].tsx` `isValidDate`: regex sadece format kontrol ediyordu (`2025-13-32` geçerdi) → gerçek tarih kontrolü (ay/gün aralığı + Date roundtrip), Faz 5 `audits/[id].tsx` düzeltmesiyle aynı kalıba getirildi
    - `difs/index.tsx` formu: denetçiye kurumun tüm denetimlerini gösteriyordu ama RLS sadece atanmış denetimlere DIF açmaya izin verir → rol bazlı filtre eklendi (admin/bas_denetci: tümü; denetçi: yalnızca `assigned_to === profile.id`)
- **Faz 7 GÖZDEN GEÇRİLDİ ✅:** Aktivite logları (denetim izi).
  - `hooks/useActivityLogs.ts` (kurum loglarını `actor:profiles!actor_id(name)` join ile çeker, 200 limit), `app/(tabs)/activity/index.tsx` (rol gate admin/bas_denetci, loading/error/empty/refresh), `app/(tabs)/_layout.tsx` (tab eklendi, canPlan görünürlük)
  - Gözden geçirmede düzeltilenler:
    - **KRİTİK (güvenlik):** `008_activity_logs.sql` INSERT policy `actor_id = auth.uid()` kontrolü içermiyordu → herhangi bir kurum kullanıcısı başka birinin (admin dahil) `actor_id`'siyle log yazabilirdi (denetim izi güvenilirliğini bozuyordu). `017_faz7_activity_fixes.sql` ile policy yeniden yazıldı, `actor_id = auth.uid()` zorunlu kılındı (mevcut kurum VEYA platform_admini+institution_id=null branch'i)
    - **Performans:** iki ayrı single-column index (`institution_id`, `created_at DESC`) tipik sorgu kalıbı için verimsizdi → `017_faz7_activity_fixes.sql` ile composite `(institution_id, created_at DESC)` index (eski iki index drop edildi, composite onları kapsar)
    - `lib/activity.ts` `catch {}` tamamen sessizdi → `__DEV__` koşullu `console.warn` eklendi (production'da ana işlem yine bozulmaz)
    - `activity/index.tsx`'e pull-to-refresh (`RefreshControl` + `isRefetching`) eklendi — "az önce yaptığım işlem görünmüyor" senaryosunda kullanıcı elle yenileyebilir
- **Faz 8 GÖZDEN GEÇİRİLDİ ✅:** Basit özet ekranı (denetim sayıları + DİF + uygunluk oranı).
  - `hooks/useStats.ts` (uygunluk oranı client-side aggregate: `uygulanamaz` paydadan dışlı), `app/(tabs)/index.tsx` (rol bazlı özet kartları, "Termin ≤ 7 gün", "Uygunluk %", kurum/kurum yönetimi kartları)
  - Gözden geçirmede düzeltilenler:
    - `!profile` guard'ı eksikti → ilk frame'de "Merhaba, undefined" + sıfırlar gösteriliyordu (diğer ekranlarla tutarsız). `if (!profile) return LoadingState` eklendi
    - `auditsQuery.error` / `difsQuery.error` / `statsQuery.error` sessizce yutuluyordu → hata olunca boş "0" değerleri render ediliyordu (Faz 4'te `plans/[id].tsx`'te yapılan aynı hata). `ErrorState` + `Tekrar Dene` (3 refetch) eklendi
    - "Açık DİF" filtresinde `onaylanmis` eksikti → akış `acik → inceleniyor → onaylanmis → kapali`; "henüz kapatılmamış" iş tanımı gereği 3 durum da açık sayılmalı. Filtre genişletildi
    - `useUpdateAnswer.onSuccess` `['audit-answer-stats', institutionId]` invalidate etmiyordu → denetçi cevap kaydettiğinde ana sayfadaki uygunluk oranı stale kalıyordu. Eklendi
    - `useDeleteAudit.onSuccess` `['audit-answer-stats', institutionId]` invalidate etmiyordu → `audit_answers.audit_id ON DELETE CASCADE` ile tüm cevaplar silinse de oran eski kalıyordu. Eklendi
- **Faz 9 GÖZDEN GEÇİRİLDİ ✅:** Play Store yayınlama altyapısı (IAP iskeleti + rehber).
  - `app.config.ts` (placeholder proje kimlikleri), `docs/YAYINLAMA.md` (9 bölümlü yayınlama rehberi), `supabase/functions/verify-subscription/index.ts` (Google Play token doğrulama iskeleti)
  - Gözden geçirmede düzeltilenler:
    - **KRİTİK (güvenlik):** `verify-subscription` Edge Function'unda **kimlik doğrulama yoktu** — herhangi biri tarafından (anonim dahil) çağrılabiliyordu. Şu an `activity_logs`'a sahte "abonelik doğrulama isteği" kayıtları basılabiliyordu; TODO tamamlandığında ise abonelik atlatma (privilege escalation) mümkün olurdu. Fonksiyon artık `Authorization: Bearer <jwt>` başlığını `supabase.auth.getUser` ile doğruluyor; çağıranın `platform_admini` VEYA belirtilen `institution_id`'nin `admin`'i olduğunu kontrol ediyor; aksi halde 401/403 dönüyor. Activity log artık `actor_id: null` yerine gerçek kullanıcı id'siyle yazılıyor
    - **CORS sıkılaştırma:** `'Access-Control-Allow-Origin': '*'` kaldırıldı. Yalnızca Supabase secret'ı olarak tanımlanan `ALLOWED_ORIGIN` (örn. `https://denetim.example.com`) kabul ediliyor; tanımlı değilse CORS başlıkları hiç gönderilmiyor (üretimde güvenli default). Mobil uygulama aynı origin'den çağırdığı için mobil akış etkilenmiyor
    - **OPTIONS preflight eklendi:** 204 + uygun CORS başlıkları (`Allow: POST, OPTIONS`, `Allow-Headers: authorization, content-type`)
    - **Girdi doğrulama:** `purchase_token` (≤4096), `product_id`/`offer_id` (≤256) uzunluk sınırları; `institution_id` UUID format regex ile; hepsi tip+uzunluk+format kontrolü geçmeden DB'ye/servise gitmiyor (DoS / storage bloat engeli)
    - **API config doğrulama:** `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` boşsa 500 dönüyor (sessiz başarısızlık yerine)
    - **`activateMutation` denetim izi eksikti:** `app/platform/institutions.tsx`'te platform admini "Aktif Et (30 gün)" düğmesi kurumun abonelik durumunu değiştiriyor ama `activity_logs`'a kayıt yazmıyordu (Faz 3+'taki tüm diğer mutation'ların yaptığı gibi). `logActivity` çağrısı eklendi (`actor: profile, action: 'Kurum aboneligi manuel aktif edildi (30 gun)', targetType/Id: institution`)
    - **Dokümantasyon düzeltmesi:** `YAYINLAMA.md` 4.3 — "elle aktif etme mantığı `lib/subscription.ts` içinde" diyordu ama aslında o dosyada yalnızca `isSubscriptionActive` / `isSubscriptionLocked` / `daysRemaining` helper'ları var. Manuel aktifleştirme `app/platform/institutions.tsx` `activateMutation`'ında. Bölüm güncellendi
    - **Dokümantasyon eklentisi:** Bölüm 5.3'e `--no-verify-jwt` notu ve "5.3.1 — İsteğe bağlı: CORS kısıtlama (`ALLOWED_ORIGIN` secret)" eklendi (JWT doğrulamasının fonksiyon içinde yapıldığı, CORS'un üretimde nasıl sıkılaştırılacağı)
  - **Henüz TODO (yayınlama aşamasında tamamlanacak):** Google Play Developer API OAuth2 + `purchases.subscriptionsv2.get` çağrısı + `institutions` tablosunda `subscription_status`/`subscription_active_until`/`play_purchase_token`/`play_subscription_id` güncellemesi (dosyada TODO yorumları işaretli). `play-rtdn-webhook` Edge Function'ı yazılmadı (Bölüm 5.4)
- **Kaldığımız yer:** Faz 9 gözden geçirildi ve düzeltildi. Yayınlama aşamasında Google Play Developer API entegrasyonu + RTDN webhook'u (Faz 9.5 / Faz 10) eklenecek.
- **Plan:** `C:\Users\oncu.ulku\.local\share\kilo\plans\1782108081066-denetim-saas-mobil-plani.md`
- **Kurulum rehberi:** `docs/FAZ1-KURULUM.md` · **Yayınlama rehberi:** `docs/YAYINLAMA.md`
