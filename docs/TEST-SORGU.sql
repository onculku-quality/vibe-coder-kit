-- TEK SORGU - tum veriler tek JSON objesinde
-- SQL Editor'a yapistirip Ctrl+Enter

SELECT json_build_object(
  'profiles', (SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.created_at DESC), '[]'::json)
               FROM (SELECT id, name, role, institution_id, team_id, created_at FROM profiles) p),
  'institutions', (SELECT COALESCE(json_agg(row_to_json(i)), '[]'::json)
                   FROM (SELECT id, name, contact_email, subscription_status, is_active,
                                subscription_active_until, created_at FROM institutions) i),
  'invite_codes', (SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json)
                   FROM (SELECT id, institution_id, code, role, max_uses, used_count, expires_at FROM invite_codes) c),
  'auth_users', (SELECT COALESCE(json_agg(row_to_json(u) ORDER BY u.created_at DESC), '[]'::json)
                 FROM (SELECT id, email, email_confirmed_at, created_at,
                              raw_user_meta_data->>'name' AS meta_name,
                              raw_user_meta_data->>'invite_code' AS meta_invite
                       FROM auth.users) u),
  'standards', (SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
                FROM (SELECT id, institution_id, name, created_at FROM standards) s),
  'teams', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (SELECT id, institution_id, name, location, leader_id FROM teams) t),
  'plans', (SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json)
            FROM (SELECT id, institution_id, name, status, audit_date, team_id FROM plans) p),
  'audits', (SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json)
             FROM (SELECT id, institution_id, plan_id, standard_id, assigned_to, status FROM audits) a),
  'difs', (SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
           FROM (SELECT id, institution_id, audit_id, title, status, due_date FROM difs) d),
  'policies_check', (SELECT COALESCE(json_agg(row_to_json(p) ORDER BY p.tablename, p.cmd), '[]'::json)
                     FROM (SELECT tablename, policyname, cmd,
                                  LEFT(qual::text, 100) AS using_clause,
                                  LEFT(with_check::text, 200) AS with_check_clause
                           FROM pg_policies
                           WHERE schemaname = 'public'
                             AND tablename IN ('profiles', 'activity_logs', 'institutions', 'invite_codes')
                          ) p),
  'triggers', (SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.event_object_table), '[]'::json)
               FROM (SELECT event_object_table, trigger_name, event_manipulation, action_timing
                     FROM information_schema.triggers
                     WHERE trigger_schema = 'public' OR event_object_schema = 'auth') t)
) AS full_snapshot;
