const { monitorNewReviews } = require('./review_monitor_simple');

console.log('🚀 리뷰 모니터링 스케줄러 시작');
console.log(`⏰ 실행 간격: 1분`); // 리뷰는 실시간성이 중요하므로 1분마다 체크
console.log(`📅 시작 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

// 1분마다 실행
setInterval(async () => {
  console.log(`\n[${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}] 리뷰 모니터링 실행`);
  await monitorNewReviews();
}, 1 * 60 * 1000);

// 시작 시 즉시 실행
monitorNewReviews();

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n\n🛑 리뷰 모니터링 스케줄러 종료');
  process.exit();
});