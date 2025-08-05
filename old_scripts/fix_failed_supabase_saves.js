require('dotenv').config({ path: './dev.env' });

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;

async function fixFailedSupabaseSaves() {
  try {
    console.log('🔍 GitHub Gist에서 Supabase 저장 실패 건들을 확인 및 제거...\n');
    
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
    
    // 2. supabaseSaved가 false이거나 없는 ID들 찾기
    const failedIds = content.processedIds.filter(item => !item.supabaseSaved);
    
    console.log(`❌ Supabase 저장 실패 건수: ${failedIds.length}`);
    
    if (failedIds.length > 0) {
      console.log('\n실패한 ID들:');
      failedIds.forEach(item => {
        console.log(`  ID ${item.id}: ${new Date(item.registeredAt).toLocaleString('ko-KR')}`);
      });
      
      // 3. 성공한 ID들만 유지
      content.processedIds = content.processedIds.filter(item => item.supabaseSaved);
      
      console.log(`\n✅ 정리 후 처리된 ID 개수: ${content.processedIds.length}`);
      
      // 4. Gist 업데이트
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
      
      console.log('\n🎉 Gist 상태 업데이트 완료!');
      console.log('실패한 ID들이 제거되어 다음 실행 시 재처리됩니다.');
      
    } else {
      console.log('\n✅ 모든 ID가 정상적으로 Supabase에 저장되었습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

console.log('🚀 Supabase 저장 실패 건 수정 시작\n');
fixFailedSupabaseSaves();