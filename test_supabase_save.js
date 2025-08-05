const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSupabaseSave() {
  console.log('🔍 Supabase 저장 기능 테스트 시작...\n');
  
  // 1. 연결 테스트
  console.log('1️⃣ Supabase 연결 테스트...');
  try {
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ 연결 성공! 현재 레코드 수: ${count}개\n`);
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    return;
  }
  
  // 2. 테스트 데이터
  const testReview = {
    id: 99999999, // 테스트 ID
    cname: 'TEST 캠페인',
    review: 'https://test.blog.com/test',
    reviewRegisteredAt: new Date().toISOString(),
    manager: 'test_manager',
    companyName: 'TEST 회사',
    keywords: 'test, keywords',
    outerId: 'test_blogger'
  };
  
  console.log('2️⃣ 테스트 데이터로 저장 시도...');
  console.log('테스트 데이터:', testReview);
  
  // 3. 실제 saveToSupabase 함수 로직 복사
  try {
    // 중복 체크
    const { data: existing, error: checkError } = await supabase
      .from('exposure_tracking')
      .select('id')
      .eq('proposition_id', testReview.id);
    
    if (checkError) {
      console.error('❌ 중복 체크 오류:', checkError);
    }
    
    if (existing && existing.length > 0) {
      console.log(`⚠️  ID ${testReview.id}는 이미 존재합니다.`);
      
      // 기존 데이터 삭제
      console.log('🗑️  테스트를 위해 기존 데이터 삭제...');
      const { error: deleteError } = await supabase
        .from('exposure_tracking')
        .delete()
        .eq('proposition_id', testReview.id);
      
      if (deleteError) {
        console.error('❌ 삭제 실패:', deleteError);
        return;
      }
    }
    
    // 데이터 준비
    const dataToSave = {
      proposition_id: testReview.id,
      campaign_name: testReview.cname,
      manager: testReview.manager || null,
      company_name: testReview.companyName || null,
      keywords: testReview.keywords || null,
      post_link: testReview.review,
      blogger_id: testReview.outerId || null,
      review_registered_at: testReview.reviewRegisteredAt,
      success_status: 'pending'
    };
    
    console.log('\n📤 Supabase에 저장할 데이터:');
    console.log(JSON.stringify(dataToSave, null, 2));
    
    // 저장 시도
    const { data, error } = await supabase
      .from('exposure_tracking')
      .insert(dataToSave);
    
    if (error) {
      console.error('\n❌ 저장 실패!');
      console.error('에러 코드:', error.code);
      console.error('에러 메시지:', error.message);
      console.error('에러 상세:', error.details);
      console.error('에러 힌트:', error.hint);
      console.error('전체 에러 객체:', JSON.stringify(error, null, 2));
    } else {
      console.log('\n✅ 저장 성공!');
      console.log('반환된 데이터:', data);
      
      // 저장 확인
      const { data: saved } = await supabase
        .from('exposure_tracking')
        .select('*')
        .eq('proposition_id', testReview.id)
        .single();
      
      if (saved) {
        console.log('\n✅ 저장 확인 완료:');
        console.log(`  ID: ${saved.proposition_id}`);
        console.log(`  캠페인: ${saved.campaign_name}`);
        console.log(`  생성시간: ${new Date(saved.created_at).toLocaleString('ko-KR')}`);
      }
      
      // 테스트 데이터 삭제
      console.log('\n🧹 테스트 데이터 정리 중...');
      const { error: cleanupError } = await supabase
        .from('exposure_tracking')
        .delete()
        .eq('proposition_id', testReview.id);
      
      if (cleanupError) {
        console.error('❌ 정리 실패:', cleanupError);
      } else {
        console.log('✅ 테스트 데이터 정리 완료');
      }
    }
    
  } catch (error) {
    console.error('\n❌ 예외 발생:', error.message);
    console.error('스택:', error.stack);
  }
  
  // 4. 환경변수 확인
  console.log('\n3️⃣ 환경변수 확인...');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 없음');
}

console.log('🚀 Supabase 저장 기능 상세 테스트\n');
testSupabaseSave();