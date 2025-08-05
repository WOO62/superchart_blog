const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fillRemainingData() {
  let connection;
  
  try {
    console.log('🔍 Supabase에서 나머지 불완전한 데이터 조회 중...\n');
    
    // 1. 전체 데이터 조회 (페이지네이션)
    let allData = [];
    let offset = 1000; // 이미 처리한 첫 1000개 건너뛰기
    const limit = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('exposure_tracking')
        .select('*')
        .not('post_link', 'is', null)
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Supabase 조회 오류:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      allData = allData.concat(data);
      offset += limit;
      
      if (data.length < limit) break;
    }
    
    // proposition_id가 없는 데이터만 필터링
    const incompleteData = allData.filter(r => !r.proposition_id);
    
    console.log(`📊 추가로 처리할 레코드: ${incompleteData.length}개 (전체 ${allData.length}개 중)\n`);
    
    if (incompleteData.length === 0) {
      console.log('✅ 추가로 처리할 데이터가 없습니다!');
      
      // 최종 통계 출력
      const { count: totalCount } = await supabase
        .from('exposure_tracking')
        .select('*', { count: 'exact', head: true });
      
      const { count: withPropositionId } = await supabase
        .from('exposure_tracking')
        .select('*', { count: 'exact', head: true })
        .not('proposition_id', 'is', null);
      
      console.log('\n📈 최종 통계:');
      console.log(`  전체 레코드: ${totalCount}개`);
      console.log(`  proposition_id 있음: ${withPropositionId}개`);
      console.log(`  proposition_id 없음: ${totalCount - withPropositionId}개`);
      
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
    
    console.log('💾 MySQL에서 매칭 데이터 조회 중...\n');
    
    // 3. 배치 단위로 처리
    const batchSize = 100;
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    for (let i = 0; i < incompleteData.length; i += batchSize) {
      const batch = incompleteData.slice(i, Math.min(i + batchSize, incompleteData.length));
      const postLinks = batch.map(r => r.post_link);
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
      
      // MySQL 데이터를 post_link로 인덱싱
      const mysqlMap = {};
      mysqlData.forEach(row => {
        mysqlMap[row.review] = row;
      });
      
      // 업데이트 실행
      for (const record of batch) {
        const mysqlRecord = mysqlMap[record.post_link];
        
        if (!mysqlRecord) {
          totalSkipped++;
          continue;
        }
        
        const updateFields = {};
        
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
        
        if (Object.keys(updateFields).length > 0) {
          try {
            const { error: updateError } = await supabase
              .from('exposure_tracking')
              .update(updateFields)
              .eq('id', record.id);
            
            if (!updateError) {
              totalUpdated++;
            }
          } catch (err) {
            // 오류 무시하고 계속 진행
          }
        }
      }
      
      console.log(`✅ 배치 ${Math.floor(i/batchSize) + 1} 완료: ${totalUpdated}개 업데이트됨`);
    }
    
    // 4. 최종 결과
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 업데이트: ${totalUpdated}개`);
    console.log(`⏭️  건너뜀: ${totalSkipped}개`);
    
    // 5. 전체 통계
    const { count: totalCount } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    const { count: withPropositionId } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true })
      .not('proposition_id', 'is', null);
    
    const { data: sampleComplete } = await supabase
      .from('exposure_tracking')
      .select('*')
      .not('proposition_id', 'is', null)
      .not('campaign_name', 'is', null)
      .not('manager', 'is', null)
      .not('company_name', 'is', null)
      .limit(5);
    
    console.log('\n📈 전체 데이터 상태:');
    console.log(`  전체 레코드: ${totalCount}개`);
    console.log(`  proposition_id 있음: ${withPropositionId}개 (${((withPropositionId/totalCount)*100).toFixed(1)}%)`);
    console.log(`  proposition_id 없음: ${totalCount - withPropositionId}개 (${(((totalCount - withPropositionId)/totalCount)*100).toFixed(1)}%)`);
    
    if (sampleComplete && sampleComplete.length > 0) {
      console.log('\n📝 완전한 데이터 샘플:');
      sampleComplete.slice(0, 3).forEach(item => {
        console.log(`  ID ${item.proposition_id}: ${item.campaign_name} (${item.manager})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 나머지 데이터 보완 작업 완료');
    }
  }
}

console.log('🚀 Supabase 나머지 데이터 채우기\n');
console.log('1000개 이후의 데이터를 처리합니다.\n');
fillRemainingData();