const { monitorPurchaseLinks } = require('./purchase_link_monitor');

console.log('🚀 구매링크 모니터링 스케줄러 시작');
console.log(`⏰ 실행 간격: 10분`);
console.log(`📅 시작 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

// 10분마다 실행
setInterval(async () => {
  console.log(`\n[${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}] 정기 모니터링 실행`);
  await monitorPurchaseLinks();
}, 10 * 60 * 1000);

// 시작 시 즉시 실행
monitorPurchaseLinks();

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n\n🛑 모니터링 스케줄러 종료');
  process.exit();
});