require('dotenv').config({ path: './dev.env' });

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;

async function updateGistForSavedReviews() {
  try {
    // Gist 읽기
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
    
    // Supabase에는 있지만 Gist에 없는 ID들 추가
    const missingIds = [10002552, 10002650, 10002508, 10002577, 10002638];
    
    console.log('📝 Gist에 추가할 ID들:', missingIds);
    
    // 이미 처리된 ID Set 생성
    const processedIdSet = new Set(content.processedIds.map(item => item.id));
    
    // 새로 추가할 ID들
    const newEntries = [];
    for (const id of missingIds) {
      if (!processedIdSet.has(id)) {
        newEntries.push({
          id: id,
          time: new Date().toISOString(),
          registeredAt: new Date().toISOString(),
          supabaseSaved: true
        });
      }
    }
    
    if (newEntries.length === 0) {
      console.log('✅ 추가할 새로운 ID가 없습니다.');
      return;
    }
    
    // 상태 업데이트
    content.processedIds = [...content.processedIds, ...newEntries];
    content.lastCheckTime = new Date().toISOString();
    content.totalProcessed = content.processedIds.length;
    
    // Gist 저장
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
      console.error('❌ Gist 저장 실패:', updateResponse.status);
      return;
    }
    
    console.log(`✅ Gist 업데이트 완료 - ${newEntries.length}개 ID 추가됨`);
    console.log('   총 처리된 ID:', content.processedIds.length);
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

updateGistForSavedReviews();