-- 001_institutions_profiles.sql
-- Kurumlar ve Kullanıcı Profilleri + RLS
-- Faz 1: Temel çok kiracılık iskeleti

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLO: institutions
-- ============================================================
CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'expired'
    CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
  subscription_active_until TIMESTAMPTZ,
  play_purchase_token TEXT,
  play_subscription_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- ============================================================
-- TABLO: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'denetci'
    CHECK (role IN ('platform_admini', 'admin', 'bas_denetci', 'denetci')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dairesel FK: institutions.created_by -> profiles.id
ALTER TABLE institutions
  ADD CONSTRAINT institutions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================================
-- YARDIMCI FONKSİYONLAR (SECURITY DEFINER — RLS'i atlar)
-- ============================================================
CREATE OR REPLACE FUNCTION get_current_institution_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT institution_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_current_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- RLS: institutions
-- ============================================================
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- Platform admini: tum erisim
CREATE POLICY "institutions_select_all_platform_admin"
  ON institutions FOR SELECT
  USING (get_current_role() = 'platform_admini');

CREATE POLICY "institutions_insert_platform_admin"
  ON institutions FOR INSERT
  WITH CHECK (get_current_role() = 'platform_admini');

CREATE POLICY "institutions_update_platform_admin"
  ON institutions FOR UPDATE
  USING (get_current_role() = 'platform_admini')
  WITH CHECK (get_current_role() = 'platform_admini');

CREATE POLICY "institutions_delete_platform_admin"
  ON institutions FOR DELETE
  USING (get_current_role() = 'platform_admini');

-- Kurum kullanicisi: yalnizca kendi kurumunu okur
CREATE POLICY "institutions_select_own"
  ON institutions FOR SELECT
  USING (get_current_institution_id() = id);

-- ============================================================
-- RLS: profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Kullanici: kendi profilini okur/gunceller
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Kurum admini / bas denetci: kendi kurumunun profillerini okur
CREATE POLICY "profiles_select_institution"
  ON profiles FOR SELECT
  USING (
    institution_id = get_current_institution_id()
    AND get_current_role() IN ('admin', 'bas_denetci')
  );

-- Platform admini: tum profilleri okur
CREATE POLICY "profiles_select_all_platform_admin"
  ON profiles FOR SELECT
  USING (get_current_role() = 'platform_admini');

-- ============================================================
-- INDEX'ler
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_institutions_subscription_status ON institutions(subscription_status);
