-- 013_faz3_plans.sql
-- Faz 3: Denetim Planlari + RLS
-- admin ve bas_denetci olusturur/duzenler/siler; kurum kullanicilari okur.

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  standard_id UUID REFERENCES standards(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  audit_date DATE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  departments TEXT[] NOT NULL DEFAULT '{}',
  hourly_agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'planlandi'
    CHECK (status IN ('planlandi','devam_ediyor','tamamlandi','iptal')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS: plans
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Kurum kullanicisi: kendi kurumunun planlarini okur
CREATE POLICY "plans_select_own"
  ON plans FOR SELECT
  USING (institution_id = get_current_institution_id());

-- Kurum admini / bas denetci: plan olusturur/duzenler/siler
CREATE POLICY "plans_insert_admin_basdenetci"
  ON plans FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

CREATE POLICY "plans_update_admin_basdenetci"
  ON plans FOR UPDATE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  )
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

CREATE POLICY "plans_delete_admin_basdenetci"
  ON plans FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

-- Platform admini: tum erisim
CREATE POLICY "plans_all_platform_admin"
  ON plans FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- INDEX'ler
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_plans_institution_id ON plans(institution_id);
CREATE INDEX IF NOT EXISTS idx_plans_standard_id ON plans(standard_id);
CREATE INDEX IF NOT EXISTS idx_plans_team_id ON plans(team_id);
CREATE INDEX IF NOT EXISTS idx_plans_audit_date ON plans(audit_date);
