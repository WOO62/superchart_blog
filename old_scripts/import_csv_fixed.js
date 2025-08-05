const fs = require('fs');
const csv = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importCSVFixed() {
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
    
    console.log(`📌 현재 데이터베이스 레코드: ${existingCount}개\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const errors = [];
    
    // 개별 처리 (NULL 체크 포함)
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // post_link가 없으면 건너뛰기
      if (!record.post_link || record.post_link.trim() === '') {
        skipCount++;
        console.log(`⚠️  행 ${i + 2}: post_link 없음 - 건너뜀`);
        continue;
      }
      
      // 날짜 형식 변환
      let reviewDate = null;
      if (record.review_registered_at) {
        reviewDate = record.review_registered_at.replace(' ', 'T');
      }
      
      // success_status 처리
      const successStatus = record.success_status || 'pending';
      
      const dataToInsert = {
        campaign_name: record.keywords || record.campaign_name || '',
        manager: record.manager || null,
        company_name: record.company_name || null,
        keywords: record.keywords || null,
        post_link: record.post_link.trim(),
        blogger_id: null,
        review_registered_at: reviewDate,
        success_status: successStatus === 'success' ? 'success' : 
                       successStatus === 'failure' ? 'failure' : 'pending',
        first_check_rank: record.first_check_rank || null,
        second_check_rank: record.second_check_rank || null,
        feedback: record.feedback || null
      };
      
      // 중복 체크 (post_link 기준)
      const { data: existing } = await supabase
        .from('exposure_tracking')
        .select('id')
        .eq('post_link', dataToInsert.post_link)
        .single();
      
      if (existing) {
        skipCount++;
        if (skipCount % 50 === 0) {
          console.log(`⏭️  ${skipCount}개 중복 건너뜀...`);
        }
        continue;
      }
      
      // Supabase에 삽입
      const { data, error } = await supabase
        .from('exposure_tracking')
        .insert(dataToInsert);
      
      if (error) {
        failCount++;
        errors.push({
          row: i + 2,
          link: record.post_link,
          error: error.message
        });
        console.log(`❌ 행 ${i + 2}: 실패 - ${error.message}`);
      } else {
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`✅ ${successCount}개 완료...`);
        }
      }
      
      // Rate limiting 방지
      if ((successCount + failCount) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`⏭️  건너뜀: ${skipCount}개 (중복 또는 post_link 없음)`);
    console.log(`❌ 실패: ${failCount}개`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n실패한 레코드:');
      errors.forEach(err => {
        console.log(`  행 ${err.row}: ${err.error}`);
      });
    }
    
    // 전체 카운트 확인
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n💾 Supabase 테이블 총 레코드 수: ${count}개`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

console.log('🚀 CSV 데이터를 Supabase에 임포트합니다.');
console.log('개선 사항: post_link NULL 체크, 중복 체크');
console.log('\n시작...\n');

importCSVFixed();