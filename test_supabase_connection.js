const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

async function testSupabaseConnection() {
  console.log('🔍 Supabase 연결 테스트 시작...\n');
  
  // 환경변수 확인
  console.log('환경변수 확인:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 없음');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 없음');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ 필수 환경변수가 없습니다!');
    return;
  }
  
  // Supabase 클라이언트 생성
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('\n📊 테이블 접근 테스트:');
  
  // 1. SELECT 테스트
  try {
    const { data, error, count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('SELECT 테스트: ❌ 실패');
      console.error('에러:', error);
    } else {
      console.log(`SELECT 테스트: ✅ 성공 (총 ${count}개 레코드)`);
    }
  } catch (err) {
    console.error('SELECT 예외:', err);
  }
  
  // 2. INSERT 테스트 (테스트 데이터)
  console.log('\n📝 INSERT 테스트:');
  const testData = {
    proposition_id: 99999999, // 테스트용 ID
    campaign_name: 'TEST_CAMPAIGN',
    manager: 'TEST',
    company_name: 'TEST_COMPANY',
    keywords: '["test"]',
    post_link: 'https://test.com',
    blogger_id: 'test_blogger',
    review_registered_at: new Date().toISOString(),
    success_status: 'pending'
  };
  
  try {
    const { data, error } = await supabase
      .from('exposure_tracking')
      .insert(testData);
    
    if (error) {
      console.log('INSERT 테스트: ❌ 실패');
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      console.error('에러 상세:', error.details);
    } else {
      console.log('INSERT 테스트: ✅ 성공');
      
      // 테스트 데이터 삭제
      const { error: deleteError } = await supabase
        .from('exposure_tracking')
        .delete()
        .eq('proposition_id', 99999999);
      
      if (!deleteError) {
        console.log('테스트 데이터 삭제: ✅ 완료');
      }
    }
  } catch (err) {
    console.error('INSERT 예외:', err);
  }
  
  // 3. UPSERT 테스트
  console.log('\n🔄 UPSERT 테스트:');
  try {
    const { data, error } = await supabase
      .from('exposure_tracking')
      .upsert(testData, {
        onConflict: 'proposition_id'
      });
    
    if (error) {
      console.log('UPSERT 테스트: ❌ 실패');
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      console.error('에러 상세:', error.details);
    } else {
      console.log('UPSERT 테스트: ✅ 성공');
      
      // 테스트 데이터 삭제
      const { error: deleteError } = await supabase
        .from('exposure_tracking')
        .delete()
        .eq('proposition_id', 99999999);
      
      if (!deleteError) {
        console.log('테스트 데이터 삭제: ✅ 완료');
      }
    }
  } catch (err) {
    console.error('UPSERT 예외:', err);
  }
  
  console.log('\n✅ 테스트 완료');
}

testSupabaseConnection();