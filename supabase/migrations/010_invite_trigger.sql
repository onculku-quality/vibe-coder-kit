-- 010_invite_trigger.sql
-- Davet Kodu ile Kayit Dogrulama Trigger'i
-- auth.users AFTER INSERT -> handle_new_user()
--
-- Guvenlik:
-- - Kodsuz kayit reddedilir (halka acik kayit kapali)
-- - Rol ve kurum koddan alinir, metadata'dan IHMAL edilir
-- - Kod gecersizse kayit tumuyle geri alinir (exception -> rollback)
-- - FOR UPDATE ile race condition onlenir

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_code TEXT;
  v_code_record RECORD;
  v_name TEXT;
BEGIN
  -- Metadata'dan davet kodu ve ad al
  v_invite_code := COALESCE(NEW.raw_user_meta_data->>'invite_code', '');
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', 'Kullanici');

  -- Kodsuz kayit reddedilir
  IF v_invite_code = '' THEN
    RAISE EXCEPTION 'Davet kodu zorunludur. Kayit icin bir davet kodu gereklidir.';
  END IF;

  -- Kodu veritabaninda ara (kilitli — FOR UPDATE)
  SELECT id, institution_id, role, max_uses, used_count, expires_at
  INTO v_code_record
  FROM invite_codes
  WHERE code = upper(trim(v_invite_code))
  FOR UPDATE;

  -- Kod bulunamadi
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gecersiz davet kodu.';
  END IF;

  -- Kullanim limiti dolu
  IF v_code_record.used_count >= v_code_record.max_uses THEN
    RAISE EXCEPTION 'Bu davet kodu zaten kullanilmis.';
  END IF;

  -- Sure dolmus
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RAISE EXCEPTION 'Bu davet kodunun suresi dolmus.';
  END IF;

  -- Profili olustur (rol ve kurum KODDAN alinir — metadata'dan degil)
  INSERT INTO profiles (id, institution_id, name, role)
  VALUES (
    NEW.id,
    v_code_record.institution_id,
    v_name,
    v_code_record.role
  );

  -- Kullanim sayacini artir
  UPDATE invite_codes
  SET used_count = used_count + 1
  WHERE id = v_code_record.id;

  RETURN NEW;
END;
$$;

-- Trigger: auth.users AFTER INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
