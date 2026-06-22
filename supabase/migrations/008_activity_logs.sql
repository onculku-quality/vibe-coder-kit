-- 008_activity_logs.sql
-- Aktivite Loglari + RLS
-- Faz 7'de logActivity() yardimcisi ile doldurulacak

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS: activity_logs
-- ============================================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Kurum admini / bas denetci: kendi kurumunun loglarini okur
CREATE POLICY "activity_logs_select_own"
  ON activity_logs FOR SELECT
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin', 'bas_denetci')
  );

-- Platform admini: tum loglari okur
CREATE POLICY "activity_logs_select_all_platform_admin"
  ON activity_logs FOR SELECT
  USING (get_current_role() = 'platform_admini');

-- Kullanicilar: kendi kurumlari (veya platform admini icin null) icin log ekler
CREATE POLICY "activity_logs_insert_own"
  ON activity_logs FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    OR (institution_id IS NULL AND get_current_role() = 'platform_admini')
  );

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_activity_logs_institution_id ON activity_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
