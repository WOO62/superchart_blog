const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkUnprocessedReviews() {
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

    console.log('🔍 최근 24시간 내 리뷰 확인 중...\n');

    // 최근 24시간 이내 리뷰 조회
    const [reviews] = await connection.execute(`
      SELECT 
        p.id,
        p.cname,
        p.reviewRegisteredAt,
        u.outerId,
        comp.manager
      FROM Propositions p
      LEFT JOIN Users u ON p.uid = u.uid
      LEFT JOIN ChannelCampaigns cc ON p.campaignId = cc.campaignId
      LEFT JOIN Campaigns c ON cc.campaignId = c.id
      LEFT JOIN Companies comp ON c.companyId = comp.id
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 24 HOUR)
        AND p.reviewRegisteredAt <= DATE_ADD(NOW(), INTERVAL 9 HOUR)
      ORDER BY p.reviewRegisteredAt DESC
      LIMIT 20
    `);

    console.log(`📝 최근 24시간 내 리뷰: ${reviews.length}개\n`);

    // Gist 상태 확인
    const GIST_ID = process.env.GIST_ID;
    const GITHUB_TOKEN = process.env.GH_TOKEN;
    
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const gist = await response.json();
    const fileName = gist.files['review_state.json'] ? 'review_state.json' : 'gistfile1.txt';
    const content = JSON.parse(gist.files[fileName].content);
    const processedIdSet = new Set(content.processedIds.map(item => item.id));

    // Supabase 상태 확인
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('ID | 캠페인명 | 등록시간 | Gist 처리 | Supabase 저장');
    console.log('---|----------|----------|-----------|---------------');

    for (const review of reviews) {
      const gistProcessed = processedIdSet.has(review.id) ? '✅' : '❌';
      
      const { data: supabaseData } = await supabase
        .from('exposure_tracking')
        .select('id')
        .eq('proposition_id', review.id)
        .single();
      
      const supabaseSaved = supabaseData ? '✅' : '❌';
      const time = new Date(review.reviewRegisteredAt).toLocaleString('ko-KR');
      const shortCname = review.cname.length > 15 ? review.cname.substring(0, 15) + '...' : review.cname;
      
      console.log(`${review.id} | ${shortCname} | ${time} | ${gistProcessed} | ${supabaseSaved}`);
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkUnprocessedReviews();