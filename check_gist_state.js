require('dotenv').config({ path: './dev.env' });

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;

async function checkGistState() {
  try {
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
    
    console.log('📖 Gist 상태 정보:');
    console.log('   마지막 체크 시간:', content.lastCheckTime);
    console.log('   처리된 ID 개수:', content.processedIds.length);
    console.log('   전체 처리 수:', content.totalProcessed);
    
    // 처리된 ID 목록 (최근 10개)
    console.log('\n📋 최근 처리된 ID (최근 10개):');
    const recentIds = content.processedIds.slice(-10);
    recentIds.forEach(item => {
      console.log(`   ID: ${item.id} - 처리시간: ${new Date(item.time).toLocaleString('ko-KR')}`);
    });
    
    // 처리된 ID Set 생성
    const processedIdSet = new Set(content.processedIds.map(item => item.id));
    
    // 새로운 리뷰 ID 목록
    const newReviewIds = [10002574, 10002499, 10002699, 10002454, 10002422, 10002491];
    
    console.log('\n🔍 새로운 리뷰 처리 상태:');
    newReviewIds.forEach(id => {
      const isProcessed = processedIdSet.has(id);
      console.log(`   ID ${id}: ${isProcessed ? '✅ 처리됨' : '❌ 미처리'}`);
    });
    
    // 가장 최근 처리 시간 확인
    if (content.processedIds.length > 0) {
      const lastProcessed = content.processedIds[content.processedIds.length - 1];
      const lastTime = new Date(lastProcessed.time);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastTime) / 1000 / 60);
      console.log(`\n⏱️  마지막 처리 시점: ${diffMinutes}분 전`);
    }
    
  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkGistState();