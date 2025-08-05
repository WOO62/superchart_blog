// 테스트를 위해 재알림 시간을 5분으로 설정한 버전
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './dev.env' });

// 알림 발송 이력을 저장할 파일
const NOTIFICATION_LOG_FILE = path.join(__dirname, 'notification_log.json');

// notification_log.json의 시간을 5분 전으로 수정
async function setTestTime() {
  try {
    const data = await fs.readFile(NOTIFICATION_LOG_FILE, 'utf8');
    const log = JSON.parse(data);
    
    // 모든 항목의 시간을 5분 전으로 수정
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    Object.keys(log).forEach(key => {
      log[key].notifiedAt = fiveMinutesAgo;
    });
    
    await fs.writeFile(NOTIFICATION_LOG_FILE, JSON.stringify(log, null, 2));
    console.log('✅ 테스트를 위해 알림 시간을 5분 전으로 설정했습니다.');
    
    // 모니터링 실행
    const { monitorPurchaseLinks } = require('./purchase_link_monitor');
    await monitorPurchaseLinks();
    
  } catch (error) {
    console.error('오류:', error);
  }
}

setTestTime();