require('dotenv').config({ path: './dev.env' });
const { createClient } = require('@supabase/supabase-js');

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixGistSupabaseField() {
  try {
    console.log('🔍 Gist의 supabaseSaved 필드 수정 중...\n');
    
    // 1. 현재 Gist 상태 읽기
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Gist 읽기 실패:', response.status);
      return;
    }
    
    const gist = await response.json();
    const fileName = gist.files['review_state.json'] ? 'review_state.json' : 'gistfile1.txt';
    const content = JSON.parse(gist.files[fileName].content);
    
    console.log(`📖 현재 처리된 ID 개수: ${content.processedIds.length}`);
    
    // 2. supabaseSaved가 undefined인 ID들 확인
    const undefinedIds = content.processedIds.filter(item => item.supabaseSaved === undefined);
    console.log(`⚠️  supabaseSaved가 undefined인 ID 개수: ${undefinedIds.length}`);
    
    if (undefinedIds.length > 0) {
      console.log('\n확인할 ID들:');
      
      // 3. 각 ID가 실제로 Supabase에 있는지 확인
      for (const item of undefinedIds) {
        const { data, error } = await supabase
          .from('exposure_tracking')
          .select('proposition_id')
          .eq('proposition_id', item.id)
          .single();
        
        if (data) {
          console.log(`  ID ${item.id}: ✅ Supabase에 있음`);
          item.supabaseSaved = true;
        } else {
          console.log(`  ID ${item.id}: ❌ Supabase에 없음`);
          // Supabase에 없는 경우 processedIds에서 제거
          const index = content.processedIds.findIndex(p => p.id === item.id);
          if (index > -1) {
            content.processedIds.splice(index, 1);
            console.log(`    → processedIds에서 제거`);
          }
        }
      }
      
      // 4. Gist 업데이트
      console.log('\n💾 Gist 업데이트 중...');
      const updateResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [fileName]: {
              content: JSON.stringify(content, null, 2)
            }
          }
        })
      });
      
      if (!updateResponse.ok) {
        console.error('❌ Gist 업데이트 실패:', updateResponse.status);
        return;
      }
      
      console.log('✅ Gist 상태 업데이트 완료!');
      console.log(`   최종 처리된 ID 개수: ${content.processedIds.length}`);
      
    } else {
      console.log('\n✅ 모든 ID가 올바른 supabaseSaved 값을 가지고 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

console.log('🚀 Gist supabaseSaved 필드 수정 시작\n');
fixGistSupabaseField();