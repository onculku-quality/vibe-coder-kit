-- 018_rls_update_with_check_hardening.sql
-- RLS UPDATE policy'lerinde WITH_CHECK boslugu kapaniyor.
-- Sorun: Mevcut UPDATE policy'leri sadece USING (eski satir uzerinde kosul) icerir,
--        WITH CHECK (yeni satir uzerinde kosul) yok. Bu, bir kurumun bas_denetci/admin'i
--        kendi kurumundaki bir kaydin institution_id'sini baskla kuruma tasimasina izin verir.
--        Ayrica profiles_update_own'da role degisikligi de korunmuyor (privilege escalation).
--
-- Cozum: Her UPDATE policy'de USING ile ayni institution_id kosulunu WITH_CHECK'e de ekle.
--        profiles icin: role ve institution_id'nin degismedigini zorla.
--        Platform admin tarafindan kapsanan tablolar zaten "ALL" policy ile korunuyor.
--
-- Etki: Daha once WITH_CHECK'i olmayan policy'ler artik "institution_id kendi kurumumda
--       kalmali" kosulunu da icerir. Mevcut kullanicilar (denetci/bas_denetci/admin) davranis
--       degisikligi yasamaz cunku institution_id'yi zaten degistirmiyorlardi.

-- ============================================================
-- 1) profiles_update_own
--    KRITIK: role ve institution_id'nin degistirilemeyecegini zorla
-- ============================================================
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid())
  AND institution_id IS NOT DISTINCT FROM (SELECT institution_id FROM profiles WHERE id = auth.uid())
);

-- ============================================================
-- 2) plans_update_admin_basdenetci
-- ============================================================
DROP POLICY IF EXISTS plans_update_admin_basdenetci ON plans;
CREATE POLICY plans_update_admin_basdenetci ON plans
FOR UPDATE
USING (
  institution_id = get_current_institution_id()
  AND get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
)
WITH CHECK (
  institution_id = get_current_institution_id()
  AND get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
);

-- ============================================================
-- 3) meetings_update_admin_basdenetci
-- ============================================================
DROP POLICY IF EXISTS meetings_update_admin_basdenetci ON meetings;
CREATE POLICY meetings_update_admin_basdenetci ON meetings
FOR UPDATE
USING (
  institution_id = get_current_institution_id()
  AND get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
)
WITH CHECK (
  institution_id = get_current_institution_id()
  AND get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
);

-- ============================================================
-- 4) audits_update_own
--    Denetci sadece atanmis denetimleri guncelleyebilir;
--    institution_id'yi tasima.
-- ============================================================
DROP POLICY IF EXISTS audits_update_own ON audits;
CREATE POLICY audits_update_own ON audits
FOR UPDATE
USING (
  institution_id = get_current_institution_id()
  AND (
    get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
    OR assigned_to = auth.uid()
  )
)
WITH CHECK (
  institution_id = get_current_institution_id()
  AND (
    get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
    OR assigned_to = auth.uid()
  )
);

-- ============================================================
-- 5) audit_answers_update_own
-- ============================================================
DROP POLICY IF EXISTS audit_answers_update_own ON audit_answers;
CREATE POLICY audit_answers_update_own ON audit_answers
FOR UPDATE
USING (
  institution_id = get_current_institution_id()
  AND (
    get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
    OR EXISTS (
      SELECT 1 FROM audits a
      WHERE a.id = audit_answers.audit_id
        AND a.assigned_to = auth.uid()
    )
  )
)
WITH CHECK (
  institution_id = get_current_institution_id()
  AND (
    get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
    OR EXISTS (
      SELECT 1 FROM audits a
      WHERE a.id = audit_answers.audit_id
        AND a.assigned_to = auth.uid()
    )
  )
);

-- ============================================================
-- 6) difs_update_own
--    Denetci sadece kendi olusturdugu + status='acik' olanlari guncelleyebilir
-- ============================================================
DROP POLICY IF EXISTS difs_update_own ON difs;
CREATE POLICY difs_update_own ON difs
FOR UPDATE
USING (
  institution_id = get_current_institution_id()
  AND (
    get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
    OR (created_by = auth.uid() AND status = 'acik'::text)
  )
)
WITH CHECK (
  institution_id = get_current_institution_id()
  AND (
    get_current_role() = ANY (ARRAY['admin'::text, 'bas_denetci'::text])
    OR (created_by = auth.uid() AND status = 'acik'::text)
  )
);

-- ============================================================
-- 7) standards_update_admin
-- ============================================================
DROP POLICY IF EXISTS standards_update_admin ON standards;
CREATE POLICY standards_update_admin ON standards
FOR UPDATE
USING (
  institution_id = get_current_institution_id()
  AND get_current_role() = 'admin'::text
)
WITH CHECK (
  institution_id = get_current_institution_id()
  AND get_current_role() = 'admin'::text
);

-- ============================================================
-- 8) standard_questions_update_admin
--    institution_id standards uzerinden join ile kontrol ediliyor
-- ============================================================
DROP POLICY IF EXISTS standard_questions_update_admin ON standard_questions;
CREATE POLICY standard_questions_update_admin ON standard_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM standards s
    WHERE s.id = standard_questions.standard_id
      AND s.institution_id = get_current_institution_id()
  )
  AND get_current_role() = 'admin'::text
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM standards s
    WHERE s.id = standard_questions.standard_id
      AND s.institution_id = get_current_institution_id()
  )
  AND get_current_role() = 'admin'::text
);

-- ============================================================
-- 9) teams_update_admin
-- ============================================================
DROP POLICY IF EXISTS teams_update_admin ON teams;
CREATE POLICY teams_update_admin ON teams
FOR UPDATE
USING (
  institution_id = get_current_institution_id()
  AND get_current_role() = 'admin'::text
)
WITH CHECK (
  institution_id = get_current_institution_id()
  AND get_current_role() = 'admin'::text
);

-- ============================================================
-- DOGRULAMA: Yeni policy'lerin WITH_CHECK'i artik institution_id korumasi iceriyor mu?
-- ============================================================
-- SELECT tablename, policyname, cmd,
--        LEFT(qual::text, 120) AS using_clause,
--        LEFT(with_check::text, 200) AS with_check_clause
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND cmd = 'UPDATE'
-- ORDER BY tablename;
