const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMissingReviews() {
  let connection;
  
  try {
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

    console.log('🔧 누락된 리뷰 복구 시작...\n');
    
    // 누락된 리뷰 ID들
    const missingIds = [10002574, 10002499];
    
    for (const id of missingIds) {
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
      
      if (reviews.length > 0) {
        const review = reviews[0];
        
        console.log(`📋 ID ${id} 정보:`);
        console.log(`   캠페인: ${review.cname}`);
        console.log(`   회사: ${review.companyName}`);
        console.log(`   매니저: ${review.manager}`);
        console.log(`   블로거: ${review.outerId}`);
        console.log(`   URL: ${review.review}`);
        
        // Supabase에 저장
        const { data, error } = await supabase
          .from('exposure_tracking')
          .upsert({
            proposition_id: review.id,
            campaign_name: review.cname,
            manager: review.manager || null,
            company_name: review.companyName || null,
            keywords: review.keywords || null,
            post_link: review.review,
            blogger_id: review.outerId || null,
            review_registered_at: review.reviewRegisteredAt,
            success_status: 'pending'
          }, {
            onConflict: 'proposition_id'
          });
        
        if (error) {
          console.log(`   ❌ 저장 실패:`, error.message);
        } else {
          console.log(`   ✅ Supabase 저장 완료`);
        }
        console.log('');
      }
    }
    
    // 최종 확인
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Supabase 전체 데이터: ${count}개`);
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ 복구 작업 완료');
    }
  }
}

console.log('⚠️  이 스크립트는 누락된 리뷰 데이터를 Supabase에 추가합니다.');
console.log('ID: 10002574 (오르조), 10002499 (플라이밀)');
console.log('\n진행하시겠습니까? (Ctrl+C로 취소)\n');

// 3초 대기 후 실행
setTimeout(() => {
  fixMissingReviews();
}, 3000);