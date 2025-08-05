-- exposure_tracking 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'exposure_tracking';

-- RLS가 활성화되어 있는지 확인
SELECT 
  relname,
  relrowsecurity
FROM pg_class
WHERE relname = 'exposure_tracking';

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON exposure_tracking;
DROP POLICY IF EXISTS "Enable read for anon" ON exposure_tracking;
DROP POLICY IF EXISTS "Enable update for anon" ON exposure_tracking;
DROP POLICY IF EXISTS "Enable insert for anon" ON exposure_tracking;

-- RLS 비활성화 (임시)
ALTER TABLE exposure_tracking DISABLE ROW LEVEL SECURITY;

-- 또는 모든 사용자에게 전체 권한 부여 (RLS 활성화 상태에서)
-- ALTER TABLE exposure_tracking ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable all operations for all users" ON exposure_tracking
--   FOR ALL 
--   USING (true)
--   WITH CHECK (true);