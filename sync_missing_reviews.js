const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncMissingReviews() {
  let connection;
  
  try {
    // 1. Supabase에서 가장 최근 review_registered_at 확인
    console.log('📊 Supabase에서 가장 최근 데이터 확인 중...\n');
    
    const { data: latestData } = await supabase
      .from('exposure_tracking')
      .select('review_registered_at')
      .order('review_registered_at', { ascending: false })
      .limit(1)
      .single();
    
    let lastDate = null;
    if (latestData && latestData.review_registered_at) {
      lastDate = latestData.review_registered_at;
      console.log(`📅 가장 최근 등록 시간: ${new Date(lastDate).toLocaleString('ko-KR')}\n`);
    } else {
      console.log('⚠️  Supabase에 데이터가 없습니다. 최근 3개월 데이터를 가져옵니다.\n');
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      lastDate = threeMonthsAgo.toISOString();
    }
    
    // 2. MySQL 연결
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // 3. MySQL에서 그 이후 데이터 조회
    console.log('🔍 MySQL에서 새로운 리뷰 검색 중...\n');
    
    const [newReviews] = await connection.execute(`
      SELECT 
        p.id,
        p.cname,
        p.review,
        p.reviewRegisteredAt,
        p.uid,
        u.outerId,
        comp.manager,
        comp.name as companyName,
        cc.requiredKeywords as keywords
      FROM Propositions p
      LEFT JOIN Users u ON p.uid = u.uid
      LEFT JOIN ChannelCampaigns cc ON p.campaignId = cc.campaignId
      LEFT JOIN Campaigns c ON cc.campaignId = c.id
      LEFT JOIN Companies comp ON c.companyId = comp.id
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt > ?
      ORDER BY p.reviewRegisteredAt ASC
    `, [lastDate]);
    
    console.log(`📝 MySQL에서 ${newReviews.length}개의 새로운 리뷰를 찾았습니다.\n`);
    
    if (newReviews.length === 0) {
      console.log('✅ 모든 데이터가 최신 상태입니다!');
      return;
    }
    
    // 4. Supabase에서 이미 있는 데이터 확인 (중복 방지)
    const { data: existingData } = await supabase
      .from('exposure_tracking')
      .select('proposition_id')
      .gte('review_registered_at', lastDate);
    
    const existingIds = new Set(existingData?.map(item => item.proposition_id) || []);
    console.log(`📌 이미 Supabase에 있는 레코드: ${existingIds.size}개\n`);
    
    // 5. 누락된 리뷰만 필터링
    const missingReviews = newReviews.filter(review => !existingIds.has(review.id));
    
    if (missingReviews.length === 0) {
      console.log('✅ 누락된 데이터가 없습니다!');
      return;
    }
    
    console.log(`🆕 ${missingReviews.length}개의 누락된 리뷰를 처리합니다.\n`);
    
    // 6. 누락된 리뷰를 Supabase에 삽입
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (const review of missingReviews) {
      try {
        // 먼저 중복 체크
        const { data: existing } = await supabase
          .from('exposure_tracking')
          .select('id')
          .eq('proposition_id', review.id)
          .single();
        
        if (existing) {
          console.log(`⚠️  ID ${review.id}는 이미 존재합니다. 건너뜀.`);
          continue;
        }
        
        const { data, error } = await supabase
          .from('exposure_tracking')
          .insert({
            proposition_id: review.id,
            campaign_name: review.cname,
            manager: review.manager || null,
            company_name: review.companyName || null,
            keywords: review.keywords || null,
            post_link: review.review,
            blogger_id: review.outerId || null,
            review_registered_at: review.reviewRegisteredAt,
            success_status: 'pending'
          });
        
        if (error) {
          failCount++;
          errors.push({
            id: review.id,
            campaign: review.cname,
            error: error.message
          });
          console.error(`❌ ID ${review.id} 저장 실패: ${error.message}`);
        } else {
          successCount++;
          const time = new Date(review.reviewRegisteredAt).toLocaleString('ko-KR');
          console.log(`✅ ID ${review.id}: ${review.cname} (${time})`);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ ID ${review.id} 예외 발생: ${error.message}`);
      }
      
      // Rate limiting 방지
      if (successCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 7. 결과 요약
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n실패한 레코드:');
      errors.forEach(err => {
        console.log(`  ID ${err.id} (${err.campaign}): ${err.error}`);
      });
    }
    
    // 8. 전체 카운트 확인
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n💾 Supabase 테이블 총 레코드 수: ${count}개`);
    
    // 9. 가장 최근 데이터 확인
    const { data: newestData } = await supabase
      .from('exposure_tracking')
      .select('proposition_id, campaign_name, review_registered_at')
      .order('review_registered_at', { ascending: false })
      .limit(3);
    
    console.log('\n📅 가장 최근 등록된 3개:');
    newestData?.forEach(item => {
      const time = new Date(item.review_registered_at).toLocaleString('ko-KR');
      console.log(`  ID ${item.proposition_id}: ${item.campaign_name} (${time})`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 동기화 완료');
    }
  }
}

console.log('🚀 MySQL과 Supabase 동기화를 시작합니다.\n');
syncMissingReviews();