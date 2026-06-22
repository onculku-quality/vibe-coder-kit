-- 015_faz5_audits.sql
-- Faz 5: Saha Denetim Modulu (audits + audit_answers) + Storage (kanit foto)
--
-- Akis:
-- - bas_denetci, bir plana denetci atar (audit olusturur).
-- - Trigger, planin standardinin tum sorulari icin audit_answers satirlari olusturur.
-- - denetci sorulari cevaplar (uygun/uygun_degil/kismen/uygulanamaz), sorumlu/termin/not ekler.
-- - kanit foto → Storage bucket 'audit-evidence', yol: institutions/{inst}/audits/{audit}/{answer}/{uuid}.jpg

-- ============================================================
-- TABLO: audits
-- ============================================================
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  standard_id UUID REFERENCES standards(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'atandi'
    CHECK (status IN ('atandi','devam_ediyor','tamamlandi')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLO: audit_answers
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES standard_questions(id) ON DELETE CASCADE,
  answer TEXT
    CHECK (answer IN ('uygun','uygun_degil','kismen','uygulanamaz') OR answer IS NULL),
  responsible TEXT,
  due_date DATE,
  notes TEXT,
  evidence_paths TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ayni audit + soru cifti tek olmali (trigger ile olusturulur)
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_answers_audit_question
  ON audit_answers(audit_id, question_id);

-- RLS performansi + institution_id ile yapilan sorgular icin
CREATE INDEX IF NOT EXISTS idx_audit_answers_institution_id
  ON audit_answers(institution_id);

-- ============================================================
-- TRIGGER: audit olusturulunca cevap satirlari olussun
-- ============================================================
CREATE OR REPLACE FUNCTION create_audit_answers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.standard_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO audit_answers (audit_id, institution_id, question_id, answer, responsible, due_date, notes, evidence_paths)
  SELECT NEW.id, NEW.institution_id, sq.id, NULL, NULL, NULL, NULL, '{}'::text[]
  FROM standard_questions sq
  WHERE sq.standard_id = NEW.standard_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_audit_created ON audits;
CREATE TRIGGER on_audit_created
  AFTER INSERT ON audits
  FOR EACH ROW
  EXECUTE FUNCTION create_audit_answers();

-- updated_at otomatik guncelleme (audit_answers)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_answers_set_updated_at ON audit_answers;
CREATE TRIGGER audit_answers_set_updated_at
  BEFORE UPDATE ON audit_answers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: assigned_to kurum dogrulamasi
-- ============================================================
-- Bir denetimcinin farkli kurumdan kullaniciya atanmasi engellenir.
-- (Client-side check bypass edilebilir, DB trigger guvenilir.)
CREATE OR REPLACE FUNCTION validate_audit_assigned_to()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_assigned_inst UUID;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT institution_id INTO v_assigned_inst
  FROM profiles WHERE id = NEW.assigned_to;

  IF v_assigned_inst IS NULL THEN
    RAISE EXCEPTION 'Atanan kullanici bulunamadi.';
  END IF;
  IF v_assigned_inst != NEW.institution_id THEN
    RAISE EXCEPTION 'Atanan kullanici ayni kurumdan olmali.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audits_validate_assigned_to ON audits;
CREATE TRIGGER audits_validate_assigned_to
  BEFORE INSERT OR UPDATE OF assigned_to ON audits
  FOR EACH ROW
  EXECUTE FUNCTION validate_audit_assigned_to();

-- ============================================================
-- RPC: atomik kanit ekleme/cikarma
-- ============================================================
-- Read-modify-write yarisma kosunu (eski paths + new path) ortadan kaldirir.
-- SECURITY DEFINER: storage RLS bypass; auth kontrolu fonksiyon govdesinde.
CREATE OR REPLACE FUNCTION add_evidence_to_answer(
  p_answer_id UUID,
  p_path TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_user_inst UUID;
  v_audit_assigned_to UUID;
  v_answer_inst UUID;
BEGIN
  v_user_role := get_current_role();
  v_user_inst := get_current_institution_id();

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadi.';
  END IF;

  SELECT institution_id INTO v_answer_inst
  FROM audit_answers WHERE id = p_answer_id;
  IF v_answer_inst IS NULL OR v_answer_inst != v_user_inst THEN
    RAISE EXCEPTION 'Cevap kurumunuzdan degil.';
  END IF;

  IF v_user_role NOT IN ('admin', 'bas_denetci') THEN
    SELECT a.assigned_to INTO v_audit_assigned_to
    FROM audit_answers aa
    JOIN audits a ON a.id = aa.audit_id
    WHERE aa.id = p_answer_id;
    IF v_audit_assigned_to != auth.uid() THEN
      RAISE EXCEPTION 'Sadece atanan denetci kanit ekleyebilir.';
    END IF;
  END IF;

  IF p_path NOT LIKE 'institutions/' || v_user_inst::text || '/%' THEN
    RAISE EXCEPTION 'Gecersiz kanit yolu.';
  END IF;

  UPDATE audit_answers
  SET evidence_paths = array_append(evidence_paths, p_path)
  WHERE id = p_answer_id;
END;
$$;

CREATE OR REPLACE FUNCTION remove_evidence_from_answer(
  p_answer_id UUID,
  p_path TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_user_role TEXT;
  v_user_inst UUID;
  v_audit_assigned_to UUID;
  v_answer_inst UUID;
  v_paths TEXT[];
BEGIN
  v_user_role := get_current_role();
  v_user_inst := get_current_institution_id();

  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadi.';
  END IF;

  SELECT institution_id INTO v_answer_inst
  FROM audit_answers WHERE id = p_answer_id;
  IF v_answer_inst IS NULL OR v_answer_inst != v_user_inst THEN
    RAISE EXCEPTION 'Cevap kurumunuzdan degil.';
  END IF;

  IF v_user_role NOT IN ('admin', 'bas_denetci') THEN
    SELECT a.assigned_to INTO v_audit_assigned_to
    FROM audit_answers aa
    JOIN audits a ON a.id = aa.audit_id
    WHERE aa.id = p_answer_id;
    IF v_audit_assigned_to != auth.uid() THEN
      RAISE EXCEPTION 'Sadece atanan denetci kanit silebilir.';
    END IF;
  END IF;

  IF p_path NOT LIKE 'institutions/' || v_user_inst::text || '/%' THEN
    RAISE EXCEPTION 'Gecersiz kanit yolu.';
  END IF;

  SELECT evidence_paths INTO v_paths
  FROM audit_answers WHERE id = p_answer_id;
  IF NOT (p_path = ANY(v_paths)) THEN
    RAISE EXCEPTION 'Bu kanit cevapta bulunamadi.';
  END IF;

  -- Storage'dan sil
  DELETE FROM storage.objects
  WHERE bucket_id = 'audit-evidence' AND name = p_path;

  -- DB array'inden cikar (atomik)
  UPDATE audit_answers
  SET evidence_paths = array_remove(evidence_paths, p_path)
  WHERE id = p_answer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_evidence_to_answer TO authenticated;
GRANT EXECUTE ON FUNCTION remove_evidence_from_answer TO authenticated;

-- ============================================================
-- RLS: audits
-- ============================================================
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Kurum kullanicisi: kendi kurumunun denetimlerini okur
CREATE POLICY "audits_select_own"
  ON audits FOR SELECT
  USING (institution_id = get_current_institution_id());

-- Kurum admini / bas denetci: denetim olusturur (denetci atar)
CREATE POLICY "audits_insert_admin_basdenetci"
  ON audits FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

-- Guncelleme: admin/bas_denetci veya atanan denetci (kendi denetiminin durumunu gunceller)
CREATE POLICY "audits_update_own"
  ON audits FOR UPDATE
  USING (
    institution_id = get_current_institution_id()
    AND (
      get_current_role() IN ('admin','bas_denetci')
      OR assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND (
      get_current_role() IN ('admin','bas_denetci')
      OR assigned_to = auth.uid()
    )
  );

-- Silme: admin/bas denetci
CREATE POLICY "audits_delete_admin_basdenetci"
  ON audits FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

-- Platform admini: tum erisim
CREATE POLICY "audits_all_platform_admin"
  ON audits FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- RLS: audit_answers
-- ============================================================
ALTER TABLE audit_answers ENABLE ROW LEVEL SECURITY;

-- Kurum kullanicisi: kendi kurumunun cevaplarini okur
CREATE POLICY "audit_answers_select_own"
  ON audit_answers FOR SELECT
  USING (institution_id = get_current_institution_id());

-- Guncelleme: admin/bas denetci veya denetimin atandigi denetci
CREATE POLICY "audit_answers_update_own"
  ON audit_answers FOR UPDATE
  USING (
    institution_id = get_current_institution_id()
    AND (
      get_current_role() IN ('admin','bas_denetci')
      OR EXISTS (
        SELECT 1 FROM audits a
        WHERE a.id = audit_answers.audit_id
          AND a.assigned_to = auth.uid()
      )
    )
  )
  WITH CHECK (
    institution_id = get_current_institution_id()
  );

-- Silme: admin/bas denetci
CREATE POLICY "audit_answers_delete_admin_basdenetci"
  ON audit_answers FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

-- Platform admini: tum erisim
CREATE POLICY "audit_answers_all_platform_admin"
  ON audit_answers FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- INDEX'ler
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audits_institution_id ON audits(institution_id);
CREATE INDEX IF NOT EXISTS idx_audits_plan_id ON audits(plan_id);
CREATE INDEX IF NOT EXISTS idx_audits_assigned_to ON audits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_answers_audit_id ON audit_answers(audit_id);

-- ============================================================
-- STORAGE: audit-evidence bucket + RLS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-evidence', 'audit-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Okuma: kurum kullanicisi kendi kurumunun klasorunu okur
-- Yol: institutions/{inst_id}/audits/...
CREATE POLICY "audit_evidence_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audit-evidence'
    AND (storage.foldername(name))[2] = get_current_institution_id()::text
  );

-- Yukleme: kurum kullanicisi kendi kurumuna yukler
CREATE POLICY "audit_evidence_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audit-evidence'
    AND (storage.foldername(name))[2] = get_current_institution_id()::text
  );

-- Silme: yalnizca admin/bas_denetci (defense-in-depth).
-- Denetci kanit silmek istediginde remove_evidence_from_answer RPC'sini kullanir
-- (SECURITY DEFINER — storage RLS'i bypass eder).
CREATE POLICY "audit_evidence_delete_admin_basdenetci"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audit-evidence'
    AND (storage.foldername(name))[2] = get_current_institution_id()::text
    AND get_current_role() IN ('admin', 'bas_denetci')
  );
