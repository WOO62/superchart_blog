const fs = require('fs');
const csv = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importCSVToSupabase() {
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
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // 각 레코드 처리
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // 날짜 형식 변환 (YYYY-MM-DD HH:MM:SS → ISO 8601)
      let reviewDate = null;
      if (record.review_registered_at) {
        // "2024-07-17 00:00:00" → "2024-07-17T00:00:00"
        reviewDate = record.review_registered_at.replace(' ', 'T');
      }
      
      // success_status 처리 (빈 값이면 'pending'으로)
      const successStatus = record.success_status || 'pending';
      
      // 데이터 준비
      const dataToInsert = {
        // proposition_id는 자동 생성 (auto-increment)
        campaign_name: record.keywords || '', // keywords를 campaign_name으로 사용
        manager: record.manager || null,
        company_name: record.company_name || null,
        keywords: record.keywords || null,
        post_link: record.post_link || null,
        blogger_id: null, // CSV에 없음
        review_registered_at: reviewDate,
        success_status: successStatus === 'success' ? 'success' : 
                       successStatus === 'failure' ? 'failure' : 'pending',
        first_check_rank: record.first_check_rank || null,
        second_check_rank: record.second_check_rank || null,
        feedback: record.feedback || null
      };
      
      // Supabase에 삽입
      const { data, error } = await supabase
        .from('exposure_tracking')
        .insert(dataToInsert);
      
      if (error) {
        failCount++;
        errors.push({
          row: i + 2, // 헤더 포함
          link: record.post_link,
          error: error.message
        });
        console.log(`❌ 행 ${i + 2}: 실패 - ${error.message}`);
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✅ ${successCount}개 완료...`);
        }
      }
    }
    
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    
    if (errors.length > 0) {
      console.log('\n❌ 실패한 레코드:');
      errors.slice(0, 10).forEach(err => {
        console.log(`   행 ${err.row}: ${err.link}`);
        console.log(`     오류: ${err.error}`);
      });
      
      if (errors.length > 10) {
        console.log(`   ... 그 외 ${errors.length - 10}개 더`);
      }
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

// csv-parse 패키지 확인
try {
  require('csv-parse');
} catch (e) {
  console.log('⚠️  csv-parse 패키지가 없습니다. 설치 중...');
  const { execSync } = require('child_process');
  execSync('npm install csv-parse', { stdio: 'inherit' });
  console.log('✅ csv-parse 설치 완료\n');
}

console.log('🚀 CSV 데이터를 Supabase에 임포트합니다.');
console.log('파일: exposure_tracking_data.csv');
console.log('\n3초 후 시작...\n');

setTimeout(() => {
  importCSVToSupabase();
}, 3000);