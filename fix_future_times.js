const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixFutureTimes() {
  try {
    console.log('🔍 미래 시간으로 저장된 데이터 찾기...');
    
    // 현재 시간보다 미래인 review_registered_at을 가진 데이터 조회
    const now = new Date();
    const { data: futureRecords, error: fetchError } = await supabase
      .from('exposure_tracking')
      .select('id, proposition_id, review_registered_at')
      .gt('review_registered_at', now.toISOString())
      .order('review_registered_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ 데이터 조회 오류:', fetchError);
      return;
    }
    
    console.log(`\n📊 미래 시간 데이터 ${futureRecords.length}개 발견\n`);
    
    if (futureRecords.length === 0) {
      console.log('✅ 수정할 데이터가 없습니다.');
      return;
    }
    
    // 각 레코드 수정
    for (const record of futureRecords) {
      const oldTime = new Date(record.review_registered_at);
      // 9시간을 빼서 UTC로 변환
      const correctedTime = new Date(oldTime.getTime() - 9 * 60 * 60 * 1000);
      
      console.log(`🔧 ID ${record.id} (Proposition ${record.proposition_id}) 수정:`);
      console.log(`   기존: ${record.review_registered_at}`);
      console.log(`   수정: ${correctedTime.toISOString()}`);
      
      const { error: updateError } = await supabase
        .from('exposure_tracking')
        .update({ review_registered_at: correctedTime.toISOString() })
        .eq('id', record.id);
      
      if (updateError) {
        console.error(`   ❌ 업데이트 실패:`, updateError.message);
      } else {
        console.log(`   ✅ 업데이트 성공`);
      }
    }
    
    console.log('\n✨ 시간 수정 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 실행
fixFutureTimes();