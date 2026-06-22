-- 012_faz3_standards.sql
-- Faz 3: Standartlar ve Standart Sorulari + RLS
-- Kurum admini standart olusturur/duzenler/siler; kurum kullanicilari okur.

CREATE TABLE IF NOT EXISTS standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS standard_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id UUID NOT NULL REFERENCES standards(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  section TEXT,
  question TEXT NOT NULL,
  guidance TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS: standards
-- ============================================================
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;

-- Kurum kullanicisi: kendi kurumunun standartlarini okur
CREATE POLICY "standards_select_own"
  ON standards FOR SELECT
  USING (institution_id = get_current_institution_id());

-- Kurum admini: standart olusturur/duzenler/siler
CREATE POLICY "standards_insert_admin"
  ON standards FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

CREATE POLICY "standards_update_admin"
  ON standards FOR UPDATE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  )
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

CREATE POLICY "standards_delete_admin"
  ON standards FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

-- Platform admini: tum erisim
CREATE POLICY "standards_all_platform_admin"
  ON standards FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- RLS: standard_questions (ust standartin kurumuna bagli)
-- ============================================================
ALTER TABLE standard_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standard_questions_select_own"
  ON standard_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM standards s
      WHERE s.id = standard_questions.standard_id
        AND s.institution_id = get_current_institution_id()
    )
  );

CREATE POLICY "standard_questions_insert_admin"
  ON standard_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM standards s
      WHERE s.id = standard_questions.standard_id
        AND s.institution_id = get_current_institution_id()
    )
    AND get_current_role() = 'admin'
  );

CREATE POLICY "standard_questions_update_admin"
  ON standard_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM standards s
      WHERE s.id = standard_questions.standard_id
        AND s.institution_id = get_current_institution_id()
    )
    AND get_current_role() = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM standards s
      WHERE s.id = standard_questions.standard_id
        AND s.institution_id = get_current_institution_id()
    )
    AND get_current_role() = 'admin'
  );

CREATE POLICY "standard_questions_delete_admin"
  ON standard_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM standards s
      WHERE s.id = standard_questions.standard_id
        AND s.institution_id = get_current_institution_id()
    )
    AND get_current_role() = 'admin'
  );

CREATE POLICY "standard_questions_all_platform_admin"
  ON standard_questions FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- INDEX'ler
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_standards_institution_id ON standards(institution_id);
CREATE INDEX IF NOT EXISTS idx_standard_questions_standard_id ON standard_questions(standard_id);
