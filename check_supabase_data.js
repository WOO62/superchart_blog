const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSupabaseData() {
  try {
    // 새로운 리뷰 ID 목록
    const newReviewIds = [10002574, 10002499, 10002699, 10002454, 10002422, 10002491];
    
    console.log('🔍 Supabase 데이터 확인 중...\n');
    
    // 각 ID별로 확인
    for (const id of newReviewIds) {
      const { data, error } = await supabase
        .from('exposure_tracking')
        .select('*')
        .eq('proposition_id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116은 데이터 없음
        console.error(`❌ ID ${id} 조회 오류:`, error.message);
      } else if (data) {
        const registeredAt = new Date(data.review_registered_at);
        console.log(`✅ ID ${id}: 저장됨`);
        console.log(`   캠페인: ${data.campaign_name}`);
        console.log(`   매니저: ${data.manager}`);
        console.log(`   등록시간: ${registeredAt.toLocaleString('ko-KR')}`);
        console.log(`   상태: ${data.success_status}`);
      } else {
        console.log(`❌ ID ${id}: Supabase에 없음`);
      }
    }
    
    // 전체 카운트 확인
    const { count: totalCount } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Supabase 전체 데이터: ${totalCount}개`);
    
    // 오늘 데이터 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayData, error: todayError } = await supabase
      .from('exposure_tracking')
      .select('proposition_id, campaign_name, review_registered_at')
      .gte('review_registered_at', today.toISOString())
      .order('review_registered_at', { ascending: false });
    
    if (!todayError && todayData) {
      console.log(`\n📅 오늘 저장된 데이터: ${todayData.length}개`);
      
      if (todayData.length > 0) {
        console.log('\n최근 5개:');
        todayData.slice(0, 5).forEach(item => {
          const time = new Date(item.review_registered_at);
          console.log(`   ID ${item.proposition_id}: ${item.campaign_name} (${time.toLocaleString('ko-KR')})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkSupabaseData();