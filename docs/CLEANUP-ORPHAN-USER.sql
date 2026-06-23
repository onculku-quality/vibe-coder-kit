-- YARIM USER TEMIZLIK SCRIPTI
-- test@test.com (uid: dab161eb-72e4-47c7-876b-1e2d96a418ca) auth.users'ta var ama profiles'ta yok
-- Dashboard'dan "Add user" ile direkt olusturulmus, handle_new_user trigger calismamis
-- Bu user'i temizlemek guvenli (atama yok, profile yok)
-- Tarih: 2026-06-23

-- ============================================================
-- 1) ONIZLEME — bu user'a atanmis birsey var mi?
-- ============================================================
SELECT '=== ATANMIS KAYITLAR ===' AS section;
SELECT
  (SELECT COUNT(*) FROM audits WHERE assigned_to = 'dab161eb-72e4-47c7-876b-1e2d96a418ca') AS assigned_audits,
  (SELECT COUNT(*) FROM difs WHERE created_by = 'dab161eb-72e4-47c7-876b-1e2d96a418ca') AS created_difs,
  (SELECT COUNT(*) FROM plans WHERE created_by = 'dab161eb-72e4-47c7-876b-1e2d96a418ca') AS created_plans,
  (SELECT COUNT(*) FROM profiles WHERE id = 'dab161eb-72e4-47c7-876b-1e2d96a418ca') AS has_profile,
  (SELECT COUNT(*) FROM auth.users WHERE id = 'dab161eb-72e4-47c7-876b-1e2d96a418ca') AS auth_user_exists;

-- ============================================================
-- 2) Eger tum sayilar 0 ise TEMIZLIK
-- ============================================================
BEGIN;
DELETE FROM auth.users WHERE id = 'dab161eb-72e4-47c7-876b-1e2d96a418ca';
COMMIT;

-- ============================================================
-- 3) DOGRULAMA
-- ============================================================
SELECT '=== SONRA ===' AS section;
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE email = 'test@test.com') AS user_count,
  (SELECT COUNT(*) FROM profiles WHERE name = 'test' AND id = 'dab161eb-72e4-47c7-876b-1e2d96a418ca') AS orphan_profile;
