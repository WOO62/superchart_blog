const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSingleMissing() {
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

    const targetId = 10002638;
    console.log(`🔧 ID ${targetId} 복구 작업...\n`);
    
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
    `, [targetId]);
    
    if (reviews.length > 0) {
      const review = reviews[0];
      
      console.log('📋 리뷰 정보:');
      console.log(`   ID: ${review.id}`);
      console.log(`   캠페인: ${review.cname}`);
      console.log(`   회사: ${review.companyName}`);
      console.log(`   매니저: ${review.manager}`);
      console.log(`   블로거: ${review.outerId}`);
      console.log(`   URL: ${review.review}`);
      console.log('');
      
      // Supabase에 저장
      console.log('📤 Supabase 저장 시도...');
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
        console.error('❌ 저장 실패:', error);
      } else {
        console.log('✅ Supabase 저장 성공!');
        
        // 확인
        const { data: checkData } = await supabase
          .from('exposure_tracking')
          .select('proposition_id, campaign_name')
          .eq('proposition_id', targetId)
          .single();
        
        if (checkData) {
          console.log('\n✅ 확인 완료: 데이터가 정상적으로 저장되었습니다.');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('⚠️  ID 10002638 (하기스 스킨에센셜 기저귀)를 Supabase에 추가합니다.');
console.log('진행하시겠습니까? (3초 후 시작)\n');

setTimeout(() => {
  fixSingleMissing();
}, 3000);