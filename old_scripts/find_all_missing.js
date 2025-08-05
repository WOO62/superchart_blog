const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAllMissing() {
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

    console.log('🔍 누락된 모든 리뷰 찾기...\n');
    
    // 오늘 등록된 모든 리뷰 조회
    const [mysqlReviews] = await connection.execute(`
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
        AND p.reviewRegisteredAt >= DATE(DATE_ADD(NOW(), INTERVAL 9 HOUR))
      ORDER BY p.reviewRegisteredAt DESC
    `);
    
    console.log(`📊 MySQL에서 오늘 등록된 리뷰: ${mysqlReviews.length}개\n`);
    
    // Supabase에서 오늘 데이터 전체 조회
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: supabaseData } = await supabase
      .from('exposure_tracking')
      .select('proposition_id')
      .gte('review_registered_at', today.toISOString());
    
    const supabaseIds = new Set(supabaseData?.map(item => item.proposition_id) || []);
    console.log(`📋 Supabase에 저장된 오늘 리뷰: ${supabaseIds.size}개\n`);
    
    // 누락된 리뷰 찾기
    const missingReviews = [];
    
    for (const review of mysqlReviews) {
      if (!supabaseIds.has(review.id)) {
        missingReviews.push(review);
      }
    }
    
    if (missingReviews.length === 0) {
      console.log('✅ 누락된 리뷰가 없습니다!');
    } else {
      console.log(`❌ 누락된 리뷰 ${missingReviews.length}개 발견:\n`);
      
      for (const review of missingReviews) {
        const time = new Date(review.reviewRegisteredAt);
        console.log(`ID: ${review.id}`);
        console.log(`   캠페인: ${review.cname}`);
        console.log(`   회사: ${review.companyName || 'N/A'}`);
        console.log(`   매니저: ${review.manager || 'N/A'}`);
        console.log(`   블로거: ${review.outerId || 'N/A'}`);
        console.log(`   등록시간: ${time.toLocaleString('ko-KR')}`);
        console.log(`   URL: ${review.review}`);
        console.log('');
      }
      
      // GitHub Gist 확인
      console.log('📝 GitHub Gist 상태 확인...');
      const GIST_ID = process.env.GIST_ID;
      const GITHUB_TOKEN = process.env.GH_TOKEN;
      
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.ok) {
        const gist = await response.json();
        const fileName = gist.files['review_state.json'] ? 'review_state.json' : 'gistfile1.txt';
        const content = JSON.parse(gist.files[fileName].content);
        
        const processedIds = new Set(content.processedIds.map(item => item.id));
        
        console.log('\nGist 처리 상태:');
        for (const review of missingReviews) {
          const isProcessed = processedIds.has(review.id);
          console.log(`   ID ${review.id}: ${isProcessed ? '✅ Gist에 처리됨 (하지만 Supabase 저장 실패)' : '❌ Gist에도 없음'}`);
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

findAllMissing();