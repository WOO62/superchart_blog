const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function saveFailedReviews() {
  let connection;
  
  try {
    console.log('🔍 실패한 리뷰들을 다시 저장합니다...\n');
    
    // 실패한 ID들
    const failedIds = [10002650, 10002812, 10002730];
    
    // MySQL 연결
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
    
    // 각 ID에 대해 처리
    for (const id of failedIds) {
      console.log(`\n📝 ID ${id} 처리 중...`);
      
      // MySQL에서 데이터 조회
      const [reviews] = await connection.execute(`
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
        WHERE p.id = ?
      `, [id]);
      
      if (reviews.length === 0) {
        console.log(`❌ ID ${id}를 MySQL에서 찾을 수 없습니다.`);
        continue;
      }
      
      const review = reviews[0];
      console.log(`  캠페인: ${review.cname}`);
      console.log(`  매니저: ${review.manager || '없음'}`);
      console.log(`  등록시간: ${new Date(review.reviewRegisteredAt).toLocaleString('ko-KR')}`);
      
      // Supabase에 저장
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
        console.error(`❌ 저장 실패:`, error.message);
      } else {
        console.log(`✅ 저장 성공!`);
      }
    }
    
    // 전체 통계
    console.log('\n📊 최종 결과 확인...');
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`💾 전체 Supabase 레코드: ${count}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🚀 실패한 리뷰 재저장 시작\n');
saveFailedReviews();