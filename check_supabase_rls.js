const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

// 두 가지 키로 테스트
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLS() {
  console.log('🔍 Supabase RLS 정책 확인 중...\n');
  
  // 1. Anon key로 읽기 테스트
  console.log('1️⃣ Anon Key로 읽기 테스트...');
  try {
    const { data, error } = await supabaseAnon
      .from('exposure_tracking')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Anon key 읽기 실패:', error.message);
    } else {
      console.log('✅ Anon key 읽기 성공');
    }
  } catch (e) {
    console.error('❌ 예외:', e.message);
  }
  
  // 2. Anon key로 업데이트 테스트
  console.log('\n2️⃣ Anon Key로 업데이트 테스트...');
  try {
    const { data, error } = await supabaseAnon
      .from('exposure_tracking')
      .update({ feedback: 'RLS 테스트' })
      .eq('id', 1)
      .select();
    
    if (error) {
      console.error('❌ Anon key 업데이트 실패:', error.message);
      console.error('   에러 코드:', error.code);
      console.error('   에러 상세:', error.details);
    } else {
      console.log('✅ Anon key 업데이트 성공');
    }
  } catch (e) {
    console.error('❌ 예외:', e.message);
  }
  
  // 3. Service key로 업데이트 테스트
  console.log('\n3️⃣ Service Key로 업데이트 테스트...');
  try {
    const { data, error } = await supabaseService
      .from('exposure_tracking')
      .update({ feedback: 'Service key 테스트' })
      .eq('id', 1)
      .select();
    
    if (error) {
      console.error('❌ Service key 업데이트 실패:', error.message);
    } else {
      console.log('✅ Service key 업데이트 성공');
    }
  } catch (e) {
    console.error('❌ 예외:', e.message);
  }
  
  // 4. RLS 정책 확인을 위한 SQL 쿼리
  console.log('\n4️⃣ RLS 정책 상태 확인...');
  const { data: rlsCheck, error: rlsError } = await supabaseService
    .rpc('get_table_rls_status', { table_name: 'exposure_tracking' });
  
  if (rlsError) {
    // RLS가 활성화되어 있는지 다른 방법으로 확인
    console.log('⚠️  RLS 상태를 직접 확인할 수 없습니다.');
    console.log('   Supabase 대시보드에서 확인이 필요합니다.');
  } else {
    console.log('RLS 상태:', rlsCheck);
  }
}

console.log('🚀 Supabase RLS 정책 테스트 시작\n');
checkRLS();