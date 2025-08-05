const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyUpdate(id) {
  console.log(`🔍 ID ${id}의 현재 상태 확인 중...\n`);
  
  try {
    const { data, error } = await supabase
      .from('exposure_tracking')
      .select('id, proposition_id, success_status, feedback, first_check_rank, second_check_rank, updated_at')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ 조회 실패:', error.message);
      return;
    }
    
    if (data) {
      console.log('📋 현재 데이터:');
      console.log(`  ID: ${data.id}`);
      console.log(`  Proposition ID: ${data.proposition_id}`);
      console.log(`  성공 여부: ${data.success_status}`);
      console.log(`  1차 순위: ${data.first_check_rank || '없음'}`);
      console.log(`  2차 순위: ${data.second_check_rank || '없음'}`);
      console.log(`  피드백: ${data.feedback || '없음'}`);
      console.log(`  최종 수정: ${new Date(data.updated_at).toLocaleString('ko-KR')}`);
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

// 명령줄 인자로 ID 받기
const id = process.argv[2];
if (!id) {
  console.log('사용법: node verify_update.js [ID]');
  console.log('예시: node verify_update.js 15067');
} else {
  verifyUpdate(parseInt(id));
}