-- TEST VERISI TEMIZLIK SCRIPTI
-- Supabase Dashboard > SQL Editor'da calistirin
-- ONEMLI: Once SELECT'leri calistirip ne sileceginizi gorun, sonra DELETE'lere gecin
-- Tarih: 2026-06-23

-- ============================================================
-- 1) Test verilerini gormek icin ONIZLEME (calistirin, sonucu kontrol edin)
-- ============================================================
SELECT '=== TEST STANDARDS ===' AS section;
SELECT id, name, created_at FROM standards WHERE name = 'ISO 27001 Test';

SELECT '=== TEST TEAMS (duplicate dahil) ===' AS section;
SELECT id, name, location, created_at FROM teams
WHERE name = 'Denetim Ekibi A' ORDER BY created_at;

SELECT '=== TEST PLANS (duplicate dahil) ===' AS section;
SELECT id, name, status, created_at FROM plans
WHERE name = 'ISO 27001 Yillik Denetim 2026' ORDER BY created_at;

SELECT '=== TEST AUDITS ===' AS section;
SELECT id, status, created_at FROM audits
WHERE plan_id IN (SELECT id FROM plans WHERE name = 'ISO 27001 Yillik Denetim 2026');

SELECT '=== TEST AUDIT_ANSWERS ===' AS section;
SELECT id, answer, responsible FROM audit_answers
WHERE audit_id IN (SELECT id FROM audits WHERE plan_id IN (SELECT id FROM plans WHERE name = 'ISO 27001 Yillik Denetim 2026'));

SELECT '=== KULLANILMAMIS DAVET KODU ===' AS section;
SELECT id, code, used_count, expires_at FROM invite_codes WHERE code = '7YMF-HAKA';

-- ============================================================
-- 2) TEMIZLIK (onizleme sonuclarini onayladiktan sonra calistirin)
-- ============================================================
-- Asagidaki BEGIN; ... COMMIT; blogunu SELECT sonuclarina guveniyorsaniz calistirin
-- Ya da tek tek DELETE'leri calistirip aralarda SELECT ile kontrol edin

BEGIN;

-- DIIF varsa once onu sil (audit_answer_id SET NULL yapacak, ama biz siliyoruz)
DELETE FROM difs WHERE audit_id IN (
  SELECT id FROM audits WHERE plan_id IN (
    SELECT id FROM plans WHERE name = 'ISO 27001 Yillik Denetim 2026'
  )
);

-- Test audit_answers (CASCADE ile silinir ama emin olalim)
DELETE FROM audit_answers WHERE audit_id IN (
  SELECT id FROM audits WHERE plan_id IN (
    SELECT id FROM plans WHERE name = 'ISO 27001 Yillik Denetim 2026'
  )
);

-- Test audits
DELETE FROM audits WHERE plan_id IN (
  SELECT id FROM plans WHERE name = 'ISO 27001 Yillik Denetim 2026'
);

-- Test plans (1 duplicate)
DELETE FROM plans WHERE name = 'ISO 27001 Yillik Denetim 2026';

-- Test teams (1 duplicate)
DELETE FROM teams WHERE name = 'Denetim Ekibi A';

-- Test standard + questions (CASCADE)
DELETE FROM standards WHERE name = 'ISO 27001 Test';

-- Kullanılmamis davet kodu (1 hafta icinde expire olacak, kullanilmayacak)
DELETE FROM invite_codes WHERE code = '7YMF-HAKA';

COMMIT;

-- ============================================================
-- 3) DOGRULAMA — sifir test verisi kalmali
-- ============================================================
SELECT '=== SONRA ===' AS section;
SELECT
  (SELECT COUNT(*) FROM standards WHERE name = 'ISO 27001 Test') AS test_standard,
  (SELECT COUNT(*) FROM teams WHERE name = 'Denetim Ekibi A') AS test_teams,
  (SELECT COUNT(*) FROM plans WHERE name = 'ISO 27001 Yillik Denetim 2026') AS test_plans,
  (SELECT COUNT(*) FROM audits) AS total_audits,
  (SELECT COUNT(*) FROM audit_answers) AS total_answers,
  (SELECT COUNT(*) FROM difs) AS total_difs,
  (SELECT COUNT(*) FROM invite_codes WHERE code = '7YMF-HAKA') AS unused_invite;
