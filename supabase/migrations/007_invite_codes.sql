-- 007_invite_codes.sql
-- Davet Kodlari + RLS
-- Kayit, trigger (010) ile dogrulanir — istemci anon erisim gerektirmez

CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'denetci'
    CHECK (role IN ('platform_admini', 'admin', 'bas_denetci', 'denetci')),
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (used_count <= max_uses)
);

-- ============================================================
-- RLS: invite_codes
-- ============================================================
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Platform admini: tum erisim (her kuruma kod ekleyebilir)
CREATE POLICY "invite_codes_all_platform_admin"
  ON invite_codes FOR ALL
  USING (get_current_role() = 'platform_admini');

-- Kurum admini: kendi kurumuna kod ekler/okur
CREATE POLICY "invite_codes_select_own"
  ON invite_codes FOR SELECT
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

CREATE POLICY "invite_codes_insert_own"
  ON invite_codes FOR INSERT
  WITH CHECK (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

CREATE POLICY "invite_codes_delete_own"
  ON invite_codes FOR DELETE
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() = 'admin'
  );

-- Not: anon erisim YOK — kod dogrulaması trigger'da sunucu tarafinda yapilir
-- (Güvenlik: kodlar disaridan gorulemez)

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invite_codes_institution_id ON invite_codes(institution_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
