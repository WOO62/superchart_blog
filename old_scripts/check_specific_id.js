const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSpecificId() {
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
    console.log(`🔍 ID ${targetId} 확인 중...\n`);
    
    // MySQL에서 확인
    const [mysqlData] = await connection.execute(`
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
    
    if (mysqlData.length > 0) {
      const review = mysqlData[0];
      console.log('📊 MySQL 데이터:');
      console.log(`   ID: ${review.id}`);
      console.log(`   캠페인: ${review.cname}`);
      console.log(`   회사: ${review.companyName || 'N/A'}`);
      console.log(`   매니저: ${review.manager || 'N/A'}`);
      console.log(`   블로거: ${review.outerId || 'N/A'}`);
      console.log(`   등록시간: ${new Date(review.reviewRegisteredAt).toLocaleString('ko-KR')}`);
      console.log(`   리뷰 URL: ${review.review || 'NULL'}`);
      
      if (!review.review || review.review === '') {
        console.log('\n⚠️  리뷰 URL이 없습니다! 아직 리뷰가 등록되지 않은 상태입니다.');
      }
    } else {
      console.log('❌ MySQL에서 해당 ID를 찾을 수 없습니다.');
    }
    
    // Supabase에서 확인
    console.log('\n📋 Supabase 확인:');
    const { data: supabaseData, error } = await supabase
      .from('exposure_tracking')
      .select('*')
      .eq('proposition_id', targetId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase 조회 오류:', error);
    } else if (supabaseData) {
      console.log('✅ Supabase에 존재함');
      console.log(`   캠페인: ${supabaseData.campaign_name}`);
      console.log(`   매니저: ${supabaseData.manager}`);
      console.log(`   상태: ${supabaseData.success_status}`);
    } else {
      console.log('❌ Supabase에 없음');
    }
    
    // GitHub Gist에서 확인
    console.log('\n📝 GitHub Gist 확인:');
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
      
      const found = content.processedIds.find(item => item.id === targetId);
      if (found) {
        console.log('✅ Gist에서 처리된 것으로 기록됨');
        console.log(`   처리 시간: ${new Date(found.time).toLocaleString('ko-KR')}`);
      } else {
        console.log('❌ Gist에서 처리 기록 없음');
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

checkSpecificId();