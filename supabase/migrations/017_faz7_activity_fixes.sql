-- 017_faz7_activity_fixes.sql
-- Faz 7 gozden gecirme duzeltmeleri
--
-- 1) activity_logs INSERT policy: actor_id = auth.uid() kontrolu eklenir.
--    Eski policy herhangi bir kurum kullanicisinin baska bir kullanici
--    (ornegin admin) adina log yazabilmesine izin veriyordu — denetim izi
--    guvenilirligini bozuyordu.
-- 2) Composite index (institution_id, created_at DESC): tipik sorgu kalibi
--    WHERE institution_id = ? ORDER BY created_at DESC icin iki ayri
--    single-column index yerine tek composite index daha verimli.
--    (PostgreSQL composite index oncelikli sirayi (institution_id) da kapsar.)

-- ============================================================
-- 1) INSERT policy duzeltmesi
-- ============================================================
DROP POLICY IF EXISTS "activity_logs_insert_own" ON activity_logs;

CREATE POLICY "activity_logs_insert_own"
  ON activity_logs FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND (
      institution_id = get_current_institution_id()
      OR (institution_id IS NULL AND get_current_role() = 'platform_admini')
    )
  );

-- ============================================================
-- 2) Index yeniden yapilandirma
-- ============================================================
DROP INDEX IF EXISTS idx_activity_logs_institution_id;
DROP INDEX IF EXISTS idx_activity_logs_created_at;

CREATE INDEX IF NOT EXISTS idx_activity_logs_institution_created
  ON activity_logs(institution_id, created_at DESC);
