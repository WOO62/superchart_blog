const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateRecentReviews() {
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

    console.log('📊 최근 리뷰 데이터 마이그레이션 시작...');

    // 최근 20개 리뷰 조회
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
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt IS NOT NULL
      ORDER BY p.reviewRegisteredAt DESC
      LIMIT 20
    `);

    console.log(`✅ ${reviews.length}개의 리뷰를 찾았습니다.`);

    // Supabase에 데이터 삽입
    let successCount = 0;
    let failCount = 0;

    for (const review of reviews) {
      try {
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
            success_status: 'pending' // 기본값
          }, {
            onConflict: 'proposition_id'
          });

        if (error) {
          console.error(`❌ ID ${review.id} 저장 실패:`, error.message);
          failCount++;
        } else {
          console.log(`✅ ID ${review.id} - ${review.cname} 저장 완료`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ ID ${review.id} 처리 오류:`, error.message);
        failCount++;
      }
    }

    console.log('\n📊 마이그레이션 완료!');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);

    // 저장된 데이터 확인
    const { data: savedData, count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });

    console.log(`\n💾 Supabase 테이블 총 레코드 수: ${count}개`);

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 MySQL 연결 종료');
    }
  }
}

// 스크립트 실행
migrateRecentReviews();