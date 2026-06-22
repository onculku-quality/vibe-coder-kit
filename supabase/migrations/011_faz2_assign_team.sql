-- 011_faz2_assign_team.sql
-- Faz 2: Takima kullanici atama (güvenli RPC)
--
-- Guvenlik:
-- - Yalnizca kurum admini cagirabilir
-- - Hedef kullanici ayni kurumdan olmali
-- - Takim ayni kurumdan olmali (veya NULL ile takimdan cikarma)
-- - SADECE team_id guncellenir — rol degistirilemez (rol yukseltme saldirisi yok)

CREATE OR REPLACE FUNCTION assign_user_to_team(target_profile_id UUID, team_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_inst UUID;
  v_target_inst UUID;
  v_team_inst UUID;
BEGIN
  v_caller_role := get_current_role();
  v_caller_inst := get_current_institution_id();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadi.';
  END IF;

  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Sadece kurum yoneticisi kullanicilari takima atayabilir.';
  END IF;

  IF v_caller_inst IS NULL THEN
    RAISE EXCEPTION 'Kurum bilgisi bulunamadi.';
  END IF;

  SELECT institution_id INTO v_target_inst FROM profiles WHERE id = target_profile_id;
  IF v_target_inst IS NULL OR v_target_inst != v_caller_inst THEN
    RAISE EXCEPTION 'Kullanici kurumunuza ait degil.';
  END IF;

  IF team_id IS NOT NULL THEN
    SELECT institution_id INTO v_team_inst FROM teams WHERE id = team_id;
    IF v_team_inst IS NULL OR v_team_inst != v_caller_inst THEN
      RAISE EXCEPTION 'Takim kurumunuza ait degil.';
    END IF;
  END IF;

  UPDATE profiles
  SET team_id = team_id
  WHERE id = target_profile_id;
END;
$$;
