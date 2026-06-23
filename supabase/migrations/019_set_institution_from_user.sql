-- 019_set_institution_from_user.sql
-- Faz 11/12 oneri: RLS INSERT policy'lerin body'den institution_id beklemesi yerine
-- BEFORE INSERT trigger ile otomatik atanmasi
--
-- Problem:
--   RLS INSERT policy'ler (standards_insert_admin, teams_insert_admin,
--   plans_insert_admin_basdenetci vb.) WITH CHECK icinde:
--     institution_id = get_current_institution_id()
--   Bu nedenle client institution_id body'de gondermek ZORUNDA.
--   Yanlis institution_id gonderirse RLS reddeder (kurum izolasyonu dogru),
--   ama dogru gondermek kullanici deneyimi acisindan kotu (her API call'da
--   profiles'tan institution_id cekmek).
--
-- Cozum:
--   BEFORE INSERT trigger'lar institution_id body'de yoksa otomatik
--   profiles tablosundan alip set eder. body'de varsa RLS zaten dogrular.
--   Bu hem UX iyilestirmesi hem de RLS'in guvenlik kontrolu olarak kalmasini saglar.
--
-- Kapsam (INSERT policy'si olan ve body'den institution_id bekleyen tablolar):
--   - standards
--   - standard_questions (parent standard uzerinden inherit)
--   - teams
--   - plans
--   - meetings
--   - audits
--   - difs
--   - invite_codes
--   - audit_answers: INSERT sadece trigger'a izinli (on_audit_created), PATCH ile guncellenir
--                     -> bu tabloda trigger'a gerek yok, mevcut tasarim dogru
--
-- NOT: Bu migration BAGIMSIZ migrate edilebilir (016/017/018 sonrasinda).
--      Mevcut RLS policy'ler korunur, sadece INSERT trigger eklenir.

-- ============================================================
-- Yardimci fonksiyon: current_profile_institution()
-- (RLS bypass — get_current_institution_id zaten SECURITY DEFINER)
-- ============================================================
-- Mevcut get_current_institution_id() zaten var, yeniden kullanilir.

-- ============================================================
-- Trigger fonksiyonu: institution_id body'de yoksa profiles'tan set et
-- ============================================================
CREATE OR REPLACE FUNCTION set_institution_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_institution_id UUID;
  v_parent_institution UUID;
BEGIN
  -- NULL degilse: body'den geldi, dokunma (RLS zaten dogrulayacak)
  IF NEW.institution_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- NULL ise: kullanici profilinden cek
  -- (Standard_questions gibi parent uzerinden inherit edilenler parent'tan alir)
  IF TG_TABLE_NAME = 'standard_questions' THEN
    SELECT s.institution_id INTO v_parent_institution
    FROM standards s WHERE s.id = NEW.standard_id;
    NEW.institution_id := v_parent_institution;
    RETURN NEW;
  END IF;

  -- Diger tablolar: profiles uzerinden
  v_institution_id := get_current_institution_id();
  NEW.institution_id := v_institution_id;

  RETURN NEW;
END;
$$;

-- ============================================================
-- Trigger'lari ekle
-- ============================================================
DROP TRIGGER IF EXISTS standards_set_institution ON standards;
CREATE TRIGGER standards_set_institution
  BEFORE INSERT ON standards
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

DROP TRIGGER IF EXISTS standard_questions_set_institution ON standard_questions;
CREATE TRIGGER standard_questions_set_institution
  BEFORE INSERT ON standard_questions
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

DROP TRIGGER IF EXISTS teams_set_institution ON teams;
CREATE TRIGGER teams_set_institution
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

DROP TRIGGER IF EXISTS plans_set_institution ON plans;
CREATE TRIGGER plans_set_institution
  BEFORE INSERT ON plans
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

DROP TRIGGER IF EXISTS meetings_set_institution ON meetings;
CREATE TRIGGER meetings_set_institution
  BEFORE INSERT ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

DROP TRIGGER IF EXISTS audits_set_institution ON audits;
CREATE TRIGGER audits_set_institution
  BEFORE INSERT ON audits
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

DROP TRIGGER IF EXISTS difs_set_institution ON difs;
CREATE TRIGGER difs_set_institution
  BEFORE INSERT ON difs
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

DROP TRIGGER IF EXISTS invite_codes_set_institution ON invite_codes;
CREATE TRIGGER invite_codes_set_institution
  BEFORE INSERT ON invite_codes
  FOR EACH ROW
  EXECUTE FUNCTION set_institution_from_user();

-- ============================================================
-- DOGRULAMA
-- ============================================================
-- SELECT event_object_table, trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE '%set_institution%'
-- ORDER BY event_object_table;
