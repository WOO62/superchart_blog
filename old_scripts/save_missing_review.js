const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function saveMissingReview() {
  let connection;
  
  try {
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

    const reviewId = 10002487;
    
    console.log(`🔍 리뷰 ID ${reviewId} 정보 조회 중...`);

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
    `, [reviewId]);

    if (reviews.length === 0) {
      console.log('❌ 리뷰를 찾을 수 없습니다.');
      return;
    }

    const review = reviews[0];
    console.log('\n📋 리뷰 정보:');
    console.log(`   ID: ${review.id}`);
    console.log(`   캠페인: ${review.cname}`);
    console.log(`   매니저: ${review.manager}`);
    console.log(`   URL: ${review.review}`);
    console.log(`   등록시간: ${new Date(review.reviewRegisteredAt).toLocaleString('ko-KR')}`);

    // Supabase에 저장
    const dataToSave = {
      proposition_id: review.id,
      campaign_name: review.cname,
      manager: review.manager || null,
      company_name: review.companyName || null,
      keywords: review.keywords || null,
      post_link: review.review,
      blogger_id: review.outerId || null,
      review_registered_at: review.reviewRegisteredAt,
      success_status: 'pending'
    };

    console.log('\n💾 Supabase에 저장 중...');
    
    const { data, error } = await supabase
      .from('exposure_tracking')
      .insert(dataToSave);

    if (error) {
      console.error('❌ 저장 실패:', error.message);
    } else {
      console.log('✅ 저장 성공!');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

saveMissingReview();