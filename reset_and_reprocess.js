require('dotenv').config({ path: './dev.env' });

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;

async function resetGistForMissingReviews() {
  try {
    console.log('🔧 누락된 리뷰 재처리를 위한 Gist 수정...\n');
    
    // 현재 Gist 상태 읽기
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
    
    console.log('현재 처리된 ID 개수:', content.processedIds.length);
    
    // 누락된 리뷰 ID들
    const missingIds = [10002574, 10002499];
    
    // 처리된 ID 목록에서 제거
    const originalLength = content.processedIds.length;
    content.processedIds = content.processedIds.filter(item => !missingIds.includes(item.id));
    const removedCount = originalLength - content.processedIds.length;
    
    console.log(`제거된 ID 개수: ${removedCount}`);
    
    if (removedCount > 0) {
      // Gist 업데이트
      const updateResponse = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            'gistfile1.txt': {
              content: JSON.stringify(content, null, 2)
            }
          }
        })
      });
      
      if (!updateResponse.ok) {
        console.error('❌ Gist 업데이트 실패:', updateResponse.status);
        return;
      }
      
      console.log('✅ Gist에서 누락된 ID 제거 완료');
      console.log('   제거된 ID:', missingIds.join(', '));
      console.log('\n이제 review_monitor_hybrid.js를 실행하면 이 리뷰들이 다시 처리됩니다.');
    } else {
      console.log('⚠️  제거할 ID가 Gist에 없습니다.');
      console.log('   이미 처리되지 않은 상태일 수 있습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

resetGistForMissingReviews();