const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkRecentReviews() {
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

    console.log('🔍 최근 리뷰 확인 중...\n');
    
    // 최근 10개 리뷰 확인 (시간 순서대로)
    const [reviews] = await connection.execute(`
      SELECT 
        p.id,
        p.cname,
        p.review,
        p.reviewRegisteredAt,
        p.uid,
        u.outerId,
        comp.manager,
        comp.name as companyName
      FROM Propositions p
      LEFT JOIN Users u ON p.uid = u.uid
      LEFT JOIN Campaigns c ON p.campaignId = c.id
      LEFT JOIN Companies comp ON c.companyId = comp.id
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt IS NOT NULL
      ORDER BY p.reviewRegisteredAt DESC
      LIMIT 10
    `);

    console.log(`📊 최근 10개 리뷰:`);
    reviews.forEach((review, index) => {
      const kstTime = new Date(review.reviewRegisteredAt);
      console.log(`\n${index + 1}. ID: ${review.id}`);
      console.log(`   캠페인: ${review.cname}`);
      console.log(`   회사: ${review.companyName || 'N/A'}`);
      console.log(`   매니저: ${review.manager || 'N/A'}`);
      console.log(`   블로거: ${review.outerId || 'N/A'}`);
      console.log(`   등록시간: ${kstTime.toLocaleString('ko-KR')}`);
      console.log(`   URL: ${review.review}`);
    });

    // 오늘 등록된 리뷰 확인
    const [todayReviews] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM Propositions p
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt >= DATE(DATE_ADD(NOW(), INTERVAL 9 HOUR))
    `);

    console.log(`\n📅 오늘 등록된 리뷰: ${todayReviews[0].count}개`);

    // 최근 2시간 내 리뷰 확인
    const [recentReviews] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM Propositions p
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 2 HOUR)
        AND p.reviewRegisteredAt <= DATE_ADD(NOW(), INTERVAL 9 HOUR)
    `);

    console.log(`⏰ 최근 2시간 내 리뷰: ${recentReviews[0].count}개`);

    // 처리되지 않은 리뷰 ID 확인
    const [unprocessedReviews] = await connection.execute(`
      SELECT 
        p.id,
        p.cname,
        p.reviewRegisteredAt
      FROM Propositions p
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 2 HOUR)
        AND p.reviewRegisteredAt <= DATE_ADD(NOW(), INTERVAL 9 HOUR)
      ORDER BY p.reviewRegisteredAt DESC
    `);

    if (unprocessedReviews.length > 0) {
      console.log(`\n🆕 최근 2시간 내 리뷰 ID 목록:`);
      unprocessedReviews.forEach(review => {
        const kstTime = new Date(review.reviewRegisteredAt);
        console.log(`   ID: ${review.id} - ${review.cname} (${kstTime.toLocaleString('ko-KR')})`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkRecentReviews();