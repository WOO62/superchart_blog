const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fillMissingData() {
  let connection;
  
  try {
    console.log('🔍 Supabase에서 post_link가 있는 데이터 조회 중...\n');
    
    // 1. Supabase에서 모든 post_link 조회
    const { data: supabaseData, error } = await supabase
      .from('exposure_tracking')
      .select('*')
      .not('post_link', 'is', null);
    
    if (error) {
      console.error('Supabase 조회 오류:', error);
      return;
    }
    
    console.log(`📊 Supabase에서 ${supabaseData.length}개의 레코드를 찾았습니다.\n`);
    
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
    
    console.log('💾 MySQL에서 매칭되는 데이터를 조회하여 업데이트 시작...\n');
    
    let updateCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const updates = [];
    
    // 3. 각 Supabase 레코드에 대해 MySQL 데이터 조회 및 업데이트
    for (const record of supabaseData) {
      // proposition_id가 있으면 우선 사용, 없으면 post_link로 매칭
      let query;
      let params;
      
      if (record.proposition_id) {
        query = `
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
        `;
        params = [record.proposition_id];
      } else {
        query = `
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
          WHERE p.review = ?
          LIMIT 1
        `;
        params = [record.post_link];
      }
      
      const [mysqlData] = await connection.execute(query, params);
      
      if (mysqlData.length === 0) {
        skipCount++;
        continue;
      }
      
      const mysqlRecord = mysqlData[0];
      
      // 업데이트할 필드 확인
      const updateFields = {};
      let needsUpdate = false;
      
      if (!record.proposition_id && mysqlRecord.id) {
        updateFields.proposition_id = mysqlRecord.id;
        needsUpdate = true;
      }
      
      if (!record.campaign_name && mysqlRecord.cname) {
        updateFields.campaign_name = mysqlRecord.cname;
        needsUpdate = true;
      }
      
      if (!record.manager && mysqlRecord.manager) {
        updateFields.manager = mysqlRecord.manager;
        needsUpdate = true;
      }
      
      if (!record.company_name && mysqlRecord.companyName) {
        updateFields.company_name = mysqlRecord.companyName;
        needsUpdate = true;
      }
      
      if (!record.keywords && mysqlRecord.keywords) {
        updateFields.keywords = mysqlRecord.keywords;
        needsUpdate = true;
      }
      
      if (!record.blogger_id && mysqlRecord.outerId) {
        updateFields.blogger_id = mysqlRecord.outerId;
        needsUpdate = true;
      }
      
      if (!record.review_registered_at && mysqlRecord.reviewRegisteredAt) {
        updateFields.review_registered_at = mysqlRecord.reviewRegisteredAt;
        needsUpdate = true;
      }
      
      // 업데이트 실행
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('exposure_tracking')
          .update(updateFields)
          .eq('id', record.id);
        
        if (updateError) {
          failCount++;
          console.error(`❌ ID ${record.id} 업데이트 실패:`, updateError.message);
        } else {
          updateCount++;
          updates.push({
            id: record.id,
            post_link: record.post_link.substring(0, 50) + '...',
            fields: Object.keys(updateFields).join(', ')
          });
          
          if (updateCount % 10 === 0) {
            console.log(`✅ ${updateCount}개 업데이트 완료...`);
          }
        }
      } else {
        skipCount++;
      }
      
      // Rate limiting 방지
      if (updateCount % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // 4. 결과 요약
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 업데이트: ${updateCount}개`);
    console.log(`⏭️  건너뜀: ${skipCount}개 (이미 완전한 데이터)`)
    console.log(`❌ 실패: ${failCount}개`);
    
    if (updates.length > 0 && updates.length <= 20) {
      console.log('\n업데이트된 레코드 (상위 20개):');
      updates.slice(0, 20).forEach(update => {
        console.log(`  ID ${update.id}: ${update.post_link}`);
        console.log(`    업데이트 필드: ${update.fields}`);
      });
    }
    
    // 5. 업데이트 후 통계
    const { data: statsData } = await supabase
      .from('exposure_tracking')
      .select('*');
    
    let completeCount = 0;
    let partialCount = 0;
    
    statsData?.forEach(item => {
      const hasAllFields = item.proposition_id && 
                          item.campaign_name && 
                          item.manager && 
                          item.company_name &&
                          item.keywords &&
                          item.post_link &&
                          item.review_registered_at;
      
      if (hasAllFields) {
        completeCount++;
      } else if (item.post_link) {
        partialCount++;
      }
    });
    
    console.log('\n📈 데이터 완전성 통계:');
    console.log(`  완전한 데이터: ${completeCount}개`);
    console.log(`  부분적 데이터: ${partialCount}개`);
    console.log(`  전체: ${statsData?.length}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 데이터 보완 작업 완료');
    }
  }
}

console.log('🚀 Supabase 누락 데이터 채우기 시작\n');
console.log('MySQL의 Propositions.review와 매칭하여 빈 필드를 채웁니다.\n');
fillMissingData();