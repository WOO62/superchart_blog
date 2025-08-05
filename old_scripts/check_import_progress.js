const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProgress() {
  try {
    // 전체 카운트 확인
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 현재 Supabase 테이블 총 레코드 수: ${count}개`);
    
    // 최근 추가된 데이터 확인
    const { data: recentData } = await supabase
      .from('exposure_tracking')
      .select('id, campaign_name, manager, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\n최근 추가된 5개 데이터:');
    recentData?.forEach(item => {
      console.log(`  ID ${item.id}: ${item.campaign_name || item.keywords} (${item.manager})`);
    });
    
    // 매니저별 통계
    const { data: allData } = await supabase
      .from('exposure_tracking')
      .select('manager');
    
    const managerCount = {};
    allData?.forEach(item => {
      const manager = item.manager || '미지정';
      managerCount[manager] = (managerCount[manager] || 0) + 1;
    });
    
    console.log('\n매니저별 데이터:');
    Object.entries(managerCount).forEach(([manager, count]) => {
      console.log(`  ${manager}: ${count}개`);
    });
    
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkProgress();