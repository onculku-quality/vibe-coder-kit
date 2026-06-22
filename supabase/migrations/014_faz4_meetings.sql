-- 014_faz4_meetings.sql
-- Faz 4: Açılış / Kapanış Toplantıları + RLS
-- Plana bagli. admin ve bas_denetci olusturur/duzenler/siler; kurum kullanicilari okur.

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('acilis','kapanis')),
  meeting_date TIMESTAMPTZ,
  location TEXT,
  participants TEXT[] NOT NULL DEFAULT '{}',
  agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at otomatik guncelleme (denetim izi icin)
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meetings_set_updated_at ON meetings;
CREATE TRIGGER meetings_set_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS: meetings
-- ============================================================
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Kurum kullanicisi: kendi kurumunun toplantilarini okur
CREATE POLICY "meetings_select_own"
  ON meetings FOR SELECT
  USING (institution_id = get_current_institution_id());

-- Kurum admini / bas denetci: toplantu olusturur/duzenler/siler
CREATE POLICY "meetings_insert_admin_basdenetci"
  ON meetings FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

CREATE POLICY "meetings_update_admin_basdenetci"
  ON meetings FOR UPDATE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  )
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

CREATE POLICY "meetings_delete_admin_basdenetci"
  ON meetings FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

-- Platform admini: tum erisim
CREATE POLICY "meetings_all_platform_admin"
  ON meetings FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- INDEX'ler
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_meetings_plan_id ON meetings(plan_id);
CREATE INDEX IF NOT EXISTS idx_meetings_institution_id ON meetings(institution_id);
