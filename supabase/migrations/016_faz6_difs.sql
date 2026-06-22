-- 016_faz6_difs.sql
-- Faz 6: Duzeltici ve Onleyici Faaliyet (DIF) Yonetimi + RLS
--
-- Akis:
-- - Uygun_degil/kismen cevaptan DIF acilir (audit + audit_answer bagli).
-- - Alanlar: kaynak, kok neden, aksiyon, sorumlu, termin.
-- - Durum akisi: acik -> inceleniyor -> onaylanmis -> kapali (bas_denetci onaylar/kapatir).
-- - status_history trigger ile otomatik kaydedilir.

-- ============================================================
-- TABLO: difs
-- ============================================================
CREATE TABLE IF NOT EXISTS difs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  audit_answer_id UUID REFERENCES audit_answers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source TEXT,
  root_cause TEXT,
  action TEXT,
  responsible TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'acik'
    CHECK (status IN ('acik','inceleniyor','onaylanmis','kapali')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLO: dif_status_history
-- ============================================================
CREATE TABLE IF NOT EXISTS dif_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dif_id UUID NOT NULL REFERENCES difs(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dif_status_history_dif_id ON dif_status_history(dif_id);

-- ============================================================
-- TRIGGER: dif INSERT -> ilk history (NULL -> acik)
-- ============================================================
CREATE OR REPLACE FUNCTION dif_insert_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dif_status_history (dif_id, from_status, to_status, changed_by, note)
  VALUES (NEW.id, NULL, NEW.status, NEW.created_by, 'DIF olusturuldu');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_dif_created ON difs;
CREATE TRIGGER on_dif_created
  AFTER INSERT ON difs
  FOR EACH ROW
  EXECUTE FUNCTION dif_insert_history();

-- ============================================================
-- TRIGGER: dif status UPDATE -> history (eski -> yeni)
-- ============================================================
CREATE OR REPLACE FUNCTION dif_status_change_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO dif_status_history (dif_id, from_status, to_status, changed_by, note)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NULL);
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_dif_status_changed ON difs;
CREATE TRIGGER on_dif_status_changed
  BEFORE UPDATE ON difs
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION dif_status_change_history();

-- updated_at (diger alan guncellemeleri icin)
DROP TRIGGER IF EXISTS dif_set_updated_at ON difs;
CREATE TRIGGER dif_set_updated_at
  BEFORE UPDATE ON difs
  FOR EACH ROW
  WHEN (NEW.status IS NOT DISTINCT FROM OLD.status)
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- RLS: difs
-- ============================================================
ALTER TABLE difs ENABLE ROW LEVEL SECURITY;

-- Kurum kullanicisi: kendi kurumunun DIF'lerini okur
CREATE POLICY "difs_select_own"
  ON difs FOR SELECT
  USING (institution_id = get_current_institution_id());

-- Olusturma: admin/bas_denetci veya denetimin atandigi denetci
CREATE POLICY "difs_insert_own"
  ON difs FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND (
      get_current_role() IN ('admin','bas_denetci')
      OR EXISTS (
        SELECT 1 FROM audits a
        WHERE a.id = difs.audit_id AND a.assigned_to = auth.uid()
      )
    )
  );

-- Guncelleme: admin/bas_denetci tam erisim; denetci yalnizca acikken kendi actigi DIF'i
CREATE POLICY "difs_update_own"
  ON difs FOR UPDATE
  USING (
    institution_id = get_current_institution_id()
    AND (
      get_current_role() IN ('admin','bas_denetci')
      OR (difs.created_by = auth.uid() AND difs.status = 'acik')
    )
  )
  WITH CHECK (
    institution_id = get_current_institution_id()
  );

-- Silme: admin/bas denetci
CREATE POLICY "difs_delete_admin_basdenetci"
  ON difs FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin','bas_denetci')
  );

-- Platform admini: tum erisim
CREATE POLICY "difs_all_platform_admin"
  ON difs FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- RLS: dif_status_history (trigger SECURITY DEFINER ile yazilir)
-- ============================================================
ALTER TABLE dif_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dif_status_history_select_own"
  ON dif_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM difs d
      WHERE d.id = dif_status_history.dif_id
        AND d.institution_id = get_current_institution_id()
    )
  );

CREATE POLICY "dif_status_history_all_platform_admin"
  ON dif_status_history FOR ALL
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- INDEX'ler
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_difs_institution_id ON difs(institution_id);
CREATE INDEX IF NOT EXISTS idx_difs_audit_id ON difs(audit_id);
CREATE INDEX IF NOT EXISTS idx_difs_status ON difs(status);
