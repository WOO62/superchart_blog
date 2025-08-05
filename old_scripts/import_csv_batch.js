const fs = require('fs');
const csv = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importCSVBatch() {
  try {
    console.log('📁 CSV 파일 읽기 시작...\n');
    
    // CSV 파일 읽기
    const fileContent = fs.readFileSync('/Users/woo/superchart_blog/exposure_tracking_data.csv', 'utf-8');
    
    // CSV 파싱
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`📊 총 ${records.length}개의 레코드를 찾았습니다.\n`);
    
    // 이미 처리된 개수 확인
    const { count: existingCount } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📌 이미 처리된 레코드: ${existingCount}개`);
    
    // 처리 시작 위치
    const startIndex = Math.max(0, existingCount - 23); // 오늘 데이터 23개 제외
    console.log(`📍 ${startIndex}번째부터 처리 시작...\n`);
    
    const batchSize = 50; // 배치 크기
    let successCount = 0;
    let failCount = 0;
    
    // 배치 처리
    for (let i = startIndex; i < records.length; i += batchSize) {
      const batch = records.slice(i, Math.min(i + batchSize, records.length));
      const batchData = [];
      
      for (const record of batch) {
        // 날짜 형식 변환
        let reviewDate = null;
        if (record.review_registered_at) {
          reviewDate = record.review_registered_at.replace(' ', 'T');
        }
        
        // success_status 처리
        const successStatus = record.success_status || 'pending';
        
        batchData.push({
          campaign_name: record.keywords || '',
          manager: record.manager || null,
          company_name: record.company_name || null,
          keywords: record.keywords || null,
          post_link: record.post_link || null,
          blogger_id: null,
          review_registered_at: reviewDate,
          success_status: successStatus === 'success' ? 'success' : 
                         successStatus === 'failure' ? 'failure' : 'pending',
          first_check_rank: record.first_check_rank || null,
          second_check_rank: record.second_check_rank || null,
          feedback: record.feedback || null
        });
      }
      
      // 배치 삽입
      const { data, error } = await supabase
        .from('exposure_tracking')
        .insert(batchData);
      
      if (error) {
        console.error(`❌ 배치 ${Math.floor(i/batchSize) + 1} 실패:`, error.message);
        failCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ 배치 ${Math.floor(i/batchSize) + 1} 완료 (${successCount}/${records.length})`);
      }
      
      // 잠시 대기 (Rate limiting 방지)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    
    // 전체 카운트 확인
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n💾 Supabase 테이블 총 레코드 수: ${count}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

console.log('🚀 CSV 데이터를 Supabase에 배치로 임포트합니다.');
console.log('파일: exposure_tracking_data.csv');
console.log('배치 크기: 50개씩');
console.log('\n시작...\n');

importCSVBatch();