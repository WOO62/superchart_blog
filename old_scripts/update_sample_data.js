const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSampleData() {
  try {
    // salt 매니저의 일부 데이터를 성공으로 업데이트
    const { data: saltData } = await supabase
      .from('exposure_tracking')
      .select('id')
      .eq('manager', 'salt')
      .limit(5);
    
    if (saltData && saltData.length > 0) {
      // 처음 3개는 성공으로
      for (let i = 0; i < Math.min(3, saltData.length); i++) {
        await supabase
          .from('exposure_tracking')
          .update({ success_status: 'success' })
          .eq('id', saltData[i].id);
      }
      
      // 다음 1개는 실패로
      if (saltData.length > 3) {
        await supabase
          .from('exposure_tracking')
          .update({ success_status: 'failure' })
          .eq('id', saltData[3].id);
      }
    }
    
    // yuzu 매니저의 일부 데이터를 성공으로 업데이트
    const { data: yuzuData } = await supabase
      .from('exposure_tracking')
      .select('id')
      .eq('manager', 'yuzu')
      .limit(4);
    
    if (yuzuData && yuzuData.length > 0) {
      // 처음 2개는 성공으로
      for (let i = 0; i < Math.min(2, yuzuData.length); i++) {
        await supabase
          .from('exposure_tracking')
          .update({ success_status: 'success' })
          .eq('id', yuzuData[i].id);
      }
      
      // 다음 1개는 실패로
      if (yuzuData.length > 2) {
        await supabase
          .from('exposure_tracking')
          .update({ success_status: 'failure' })
          .eq('id', yuzuData[2].id);
      }
    }
    
    console.log('✅ 샘플 데이터 업데이트 완료');
    
    // 업데이트된 통계 확인
    const { data: allData } = await supabase
      .from('exposure_tracking')
      .select('manager, success_status');
    
    const stats = {};
    allData?.forEach(item => {
      const manager = item.manager || '미지정';
      if (!stats[manager]) {
        stats[manager] = { total: 0, success: 0, failure: 0, pending: 0 };
      }
      stats[manager].total++;
      stats[manager][item.success_status || 'pending']++;
    });
    
    console.log('\n업데이트된 매니저별 통계:');
    Object.entries(stats).forEach(([manager, stat]) => {
      const successRate = stat.total > 0 ? ((stat.success / stat.total) * 100).toFixed(1) : '0.0';
      console.log(`${manager}: 총 ${stat.total}개 (성공: ${stat.success}, 실패: ${stat.failure}, 대기: ${stat.pending}) - 성공률: ${successRate}%`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

updateSampleData();