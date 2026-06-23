-- 000_bootstrap_platform_admin.sql
-- PLATFORM ADMINI (KOK HESAP) OLUSTURMA
--
-- Bu dosya OTOMATIK calistirilmaz. Manuel olarak Supabase SQL Editor'da calistirilir.
--
-- ADIMLAR:
-- 1. Supabase Dashboard > Authentication > Users > "Add user"
--    - Email ve sifre girin (bu sizin platform admini giris bilgileriniz)
--    - "Auto Confirm User" secenegini ISARETLEYIN (email onayi gerekmesin)
-- 2. Olusturdugunuz kullanicinin ID'sini kopyalayin
--    (Dashboard > Authentication > Users listesinde "User UID" sutununda)
-- 3. Asagidaki UUID'i kendi kullanici ID'nizle degistirin
-- 4. Supabase Dashboard > SQL Editor'a yapistirip calistirin
--
-- ONEMLI: Bu islem yalnizca BIR KEZ yapilir. Bu hesap tum sistemlerin sahibidir.

INSERT INTO profiles (id, institution_id, name, role)
VALUES (
  '02b8ddc3-7d8d-49fb-bcdd-ce90dabf551a',
  NULL,
  'Platform Yoneticisi',
  'platform_admini'
)
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      institution_id = EXCLUDED.institution_id;
