-- 002_teams.sql
-- Takimlar (bos iskelet — Faz 2'de UI eklenecek) + RLS

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles.team_id FK (001'de teams tablosu yoktu, simdi ekleniyor)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================================
-- RLS: teams
-- ============================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Kurum kullanicisi: kendi kurumunun takimlarini okur
CREATE POLICY "teams_select_own"
  ON teams FOR SELECT
  USING (institution_id = get_current_institution_id());

-- Kurum admini: takim olusturur/duzenler/siler
CREATE POLICY "teams_insert_admin"
  ON teams FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

CREATE POLICY "teams_update_admin"
  ON teams FOR UPDATE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

CREATE POLICY "teams_delete_admin"
  ON teams FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

-- Platform admini: tum erisim
CREATE POLICY "teams_all_platform_admin"
  ON teams FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_teams_institution_id ON teams(institution_id);
