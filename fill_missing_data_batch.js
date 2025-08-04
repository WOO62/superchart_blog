const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fillMissingDataBatch() {
  let connection;
  
  try {
    console.log('🔍 Supabase에서 불완전한 데이터 조회 중...\n');
    
    // 1. Supabase에서 proposition_id가 없는 데이터만 조회
    const { data: incompleteData, error } = await supabase
      .from('exposure_tracking')
      .select('*')
      .is('proposition_id', null)
      .not('post_link', 'is', null);
    
    if (error) {
      console.error('Supabase 조회 오류:', error);
      return;
    }
    
    console.log(`📊 proposition_id가 없는 레코드: ${incompleteData?.length || 0}개\n`);
    
    if (!incompleteData || incompleteData.length === 0) {
      console.log('✅ 모든 레코드에 proposition_id가 있습니다!');
      return;
    }
    
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
    
    console.log('💾 MySQL에서 매칭 데이터를 배치로 조회 중...\n');
    
    // 3. post_link들로 MySQL 배치 조회
    const postLinks = incompleteData.map(r => r.post_link);
    const placeholders = postLinks.map(() => '?').join(',');
    
    const query = `
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
      WHERE p.review IN (${placeholders})
    `;
    
    const [mysqlData] = await connection.execute(query, postLinks);
    
    console.log(`📝 MySQL에서 ${mysqlData.length}개의 매칭 데이터를 찾았습니다.\n`);
    
    // MySQL 데이터를 post_link로 인덱싱
    const mysqlMap = {};
    mysqlData.forEach(row => {
      mysqlMap[row.review] = row;
    });
    
    // 4. 업데이트 데이터 준비
    let updateCount = 0;
    let skipCount = 0;
    const updateBatch = [];
    
    for (const record of incompleteData) {
      const mysqlRecord = mysqlMap[record.post_link];
      
      if (!mysqlRecord) {
        skipCount++;
        continue;
      }
      
      // 업데이트할 필드 확인
      const updateFields = {
        id: record.id  // Supabase ID
      };
      
      if (mysqlRecord.id) {
        updateFields.proposition_id = mysqlRecord.id;
      }
      
      if (!record.campaign_name && mysqlRecord.cname) {
        updateFields.campaign_name = mysqlRecord.cname;
      }
      
      if (!record.manager && mysqlRecord.manager) {
        updateFields.manager = mysqlRecord.manager;
      }
      
      if (!record.company_name && mysqlRecord.companyName) {
        updateFields.company_name = mysqlRecord.companyName;
      }
      
      if (!record.keywords && mysqlRecord.keywords) {
        updateFields.keywords = mysqlRecord.keywords;
      }
      
      if (!record.blogger_id && mysqlRecord.outerId) {
        updateFields.blogger_id = mysqlRecord.outerId;
      }
      
      if (!record.review_registered_at && mysqlRecord.reviewRegisteredAt) {
        updateFields.review_registered_at = mysqlRecord.reviewRegisteredAt;
      }
      
      updateBatch.push(updateFields);
    }
    
    console.log(`📦 ${updateBatch.length}개 레코드 업데이트 준비 완료\n`);
    
    // 5. 배치로 업데이트 실행 (개별 처리로 중복 키 오류 방지)
    for (const update of updateBatch) {
      const id = update.id;
      delete update.id;
      
      try {
        const { error: updateError } = await supabase
          .from('exposure_tracking')
          .update(update)
          .eq('id', id);
        
        if (updateError) {
          if (updateError.message.includes('duplicate')) {
            // 중복 키 오류는 무시
            skipCount++;
          } else {
            console.error(`❌ ID ${id} 업데이트 실패:`, updateError.message);
          }
        } else {
          updateCount++;
          if (updateCount % 50 === 0) {
            console.log(`✅ ${updateCount}개 업데이트 완료...`);
          }
        }
      } catch (err) {
        console.error(`❌ ID ${id} 예외 발생:`, err.message);
      }
    }
    
    // 6. 결과 요약
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 업데이트: ${updateCount}개`);
    console.log(`⏭️  건너뜀: ${skipCount}개`);
    
    // 7. 최종 통계
    const { data: finalStats } = await supabase
      .from('exposure_tracking')
      .select('proposition_id, campaign_name, manager, company_name, keywords, post_link, review_registered_at');
    
    let completeCount = 0;
    let hasPropositionId = 0;
    
    finalStats?.forEach(item => {
      if (item.proposition_id) hasPropositionId++;
      
      const hasAllFields = item.proposition_id && 
                          item.campaign_name && 
                          item.manager && 
                          item.company_name &&
                          item.keywords &&
                          item.post_link &&
                          item.review_registered_at;
      
      if (hasAllFields) completeCount++;
    });
    
    console.log('\n📈 최종 데이터 상태:');
    console.log(`  전체 레코드: ${finalStats?.length}개`);
    console.log(`  proposition_id 있음: ${hasPropositionId}개`);
    console.log(`  모든 필드 완전: ${completeCount}개`);
    console.log(`  proposition_id 없음: ${(finalStats?.length || 0) - hasPropositionId}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 데이터 보완 작업 완료');
    }
  }
}

console.log('🚀 Supabase 누락 데이터 채우기 (배치 처리)\n');
console.log('proposition_id가 없는 레코드만 처리합니다.\n');
fillMissingDataBatch();