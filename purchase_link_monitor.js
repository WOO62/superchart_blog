const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './dev.env' });

// 알림 발송 이력을 저장할 파일 (현재 사용 안 함)
// const NOTIFICATION_LOG_FILE = path.join(__dirname, 'notification_log.json');

// Slack Webhook 전송 함수
async function sendSlackNotification(webhookUrl, violations) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚨 구매링크 누락 알림",
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${violations.length}개의 구매링크 누락*이 발견되었습니다.`
      }
    },
    {
      type: "divider"
    }
  ];

  // 각 누락 건에 대한 상세 정보 추가
  violations.forEach((violation, index) => {
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Proposition ID:*\n${violation.id}`
        },
        {
          type: "mrkdwn",
          text: `*캠페인명:*\n${violation.cname}`
        },
        {
          type: "mrkdwn",
          text: `*Campaign ID:*\n${violation.campaignId}`
        },
        {
          type: "mrkdwn",
          text: `*Channel 구매링크:*\n${violation.channelPurchaseLink}`
        }
      ]
    });
    
    if (index < violations.length - 1) {
      blocks.push({ type: "divider" });
    }
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `검사 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
      }
    ]
  });

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blocks })
    });

    if (!response.ok) {
      throw new Error(`Slack API responded with ${response.status}`);
    }

    console.log('✅ Slack 알림 전송 성공');
  } catch (error) {
    console.error('❌ Slack 알림 전송 실패:', error.message);
  }
}

// 알림 발송 이력 로드 (현재 사용 안 함)
// async function loadNotificationLog() {
//   try {
//     const data = await fs.readFile(NOTIFICATION_LOG_FILE, 'utf8');
//     return JSON.parse(data);
//   } catch (error) {
//     // 파일이 없으면 빈 객체 반환
//     return {};
//   }
// }

// 알림 발송 이력 저장 (현재 사용 안 함)
// async function saveNotificationLog(log) {
//   await fs.writeFile(NOTIFICATION_LOG_FILE, JSON.stringify(log, null, 2));
// }

// 구매링크 누락 검증 및 모니터링
async function monitorPurchaseLinks() {
  let connection;
  
  try {
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('🔍 구매링크 누락 검증 시작...');

    // 누락된 purchaseLink 조회 (최근 2개월, responsedAt이 있는 경우만)
    const [violations] = await connection.execute(`
      SELECT 
        p.id,
        p.cname,
        p.campaignId,
        cc.purchaseLink as channelPurchaseLink,
        p.purchaseLink as propositionPurchaseLink,
        p.createdAt,
        p.updatedAt,
        p.responsedAt
      FROM Propositions p
      INNER JOIN ChannelCampaigns cc ON p.campaignId = cc.campaignId
      WHERE cc.purchaseLink IS NOT NULL 
        AND cc.purchaseLink != ''
        AND (p.purchaseLink IS NULL OR p.purchaseLink = '')
        AND p.responsedAt IS NOT NULL
        AND p.createdAt >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
      ORDER BY p.id DESC
    `);

    if (violations.length === 0) {
      console.log('✅ 구매링크 누락 없음');
      return;
    }

    console.log(`⚠️  ${violations.length}개의 구매링크 누락 발견`);
    console.log(`📨 모든 누락 건에 대해 알림을 전송합니다.`);
    
    // Slack Webhook URL 확인
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (webhookUrl) {
      // 모든 누락 건에 대해 알림 전송 (중복 체크 없음)
      await sendSlackNotification(webhookUrl, violations);
      console.log('✅ Slack 알림 전송 완료');
    } else {
      console.log('⚠️  SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
      console.log('누락 건:', violations);
    }

    // 전체 누락 현황 요약
    console.log('\n📊 전체 누락 현황:');
    const summary = {};
    violations.forEach(v => {
      if (!summary[v.campaignId]) {
        summary[v.campaignId] = {
          cname: v.cname,
          count: 0,
          channelPurchaseLink: v.channelPurchaseLink
        };
      }
      summary[v.campaignId].count++;
    });

    Object.entries(summary).forEach(([campaignId, info]) => {
      console.log(`  Campaign ${campaignId} (${info.cname}): ${info.count}건`);
      console.log(`  Channel Link: ${info.channelPurchaseLink}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  monitorPurchaseLinks();
}

module.exports = { monitorPurchaseLinks };