SELECT tablename, policyname, cmd,
       LEFT(qual::text, 80) AS using_clause,
       LEFT(with_check::text, 200) AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'INSERT'
ORDER BY tablename, policyname;
