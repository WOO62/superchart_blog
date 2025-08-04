const { monitorNewReviews } = require('./review_monitor_hybrid');

console.log('🚀 로컬 리뷰 모니터링 시작...');
console.log('⏰ 실행 주기: 2분');
console.log('📍 GitHub Gist와 상태 동기화 중...');
console.log('✅ GitHub Actions와 중복 실행 가능 (Gist로 중복 방지)\n');

// 시작 시 즉시 한 번 실행
console.log(`[${new Date().toLocaleString('ko-KR')}] 첫 실행...`);
monitorNewReviews().catch(console.error);

// 2분마다 실행
setInterval(async () => {
  console.log(`\n[${new Date().toLocaleString('ko-KR')}] 정기 실행...`);
  try {
    await monitorNewReviews();
  } catch (error) {
    console.error('❌ 모니터링 오류:', error.message);
  }
}, 2 * 60 * 1000); // 2분

// 종료 시그널 처리
process.on('SIGINT', () => {
  console.log('\n\n👋 로컬 모니터링 종료...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 로컬 모니터링 종료...');
  process.exit(0);
});