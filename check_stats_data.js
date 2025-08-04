const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  try {
    // 전체 데이터 수 확인
    const { count: totalCount } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log('전체 데이터:', totalCount, '개');
    
    // 최근 5개 데이터 확인
    const { data: recentData } = await supabase
      .from('exposure_tracking')
      .select('id, campaign_name, manager, review_registered_at, success_status')
      .order('review_registered_at', { ascending: false })
      .limit(5);
    
    console.log('\n최근 5개 데이터:');
    recentData?.forEach(item => {
      console.log('-', item.campaign_name, '|', item.manager || '미지정', '|', 
        new Date(item.review_registered_at).toLocaleString('ko-KR'), '|', item.success_status);
    });
    
    // 오늘 데이터 확인
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const { count: todayCount } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true })
      .gte('review_registered_at', todayStart.toISOString());
    
    console.log('\n오늘 등록:', todayCount, '개');
    
    // 이번 달 데이터 확인
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const { count: monthCount } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true })
      .gte('review_registered_at', thisMonthStart.toISOString());
    
    console.log('이번 달 등록:', monthCount, '개');
    
    // 매니저별 통계
    const { data: allData } = await supabase
      .from('exposure_tracking')
      .select('manager, success_status');
    
    const managerStats = {};
    allData?.forEach(item => {
      const manager = item.manager || '미지정';
      if (!managerStats[manager]) {
        managerStats[manager] = { total: 0, success: 0, failure: 0, pending: 0 };
      }
      managerStats[manager].total++;
      const status = item.success_status || 'pending';
      managerStats[manager][status]++;
    });
    
    console.log('\n매니저별 전체 통계:');
    Object.entries(managerStats).forEach(([manager, stats]) => {
      const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0';
      console.log(`${manager}: 총 ${stats.total}개 (성공: ${stats.success}, 실패: ${stats.failure}, 대기: ${stats.pending}) - 성공률: ${successRate}%`);
    });
    
    // 이번 달 매니저별 통계
    const { data: monthData } = await supabase
      .from('exposure_tracking')
      .select('manager, success_status')
      .gte('review_registered_at', thisMonthStart.toISOString());
    
    const monthManagerStats = {};
    monthData?.forEach(item => {
      const manager = item.manager || '미지정';
      if (!monthManagerStats[manager]) {
        monthManagerStats[manager] = { total: 0, success: 0, failure: 0, pending: 0 };
      }
      monthManagerStats[manager].total++;
      const status = item.success_status || 'pending';
      monthManagerStats[manager][status]++;
    });
    
    console.log('\n매니저별 이번 달 통계:');
    Object.entries(monthManagerStats).forEach(([manager, stats]) => {
      const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0';
      console.log(`${manager}: 총 ${stats.total}개 (성공: ${stats.success}, 실패: ${stats.failure}, 대기: ${stats.pending}) - 성공률: ${successRate}%`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();