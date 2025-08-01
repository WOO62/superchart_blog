const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './dev.env' });

// 알림 발송 이력을 저장할 파일
const NOTIFICATION_LOG_FILE = path.join(__dirname, 'notification_log.json');

// Slack Webhook 전송 함수
async function sendSlackNotification(webhookUrl, violations) {
  // notificationLog 로드하여 재알림 여부 확인
  const notificationLog = await loadNotificationLog();
  const reNotifyCount = violations.filter(v => {
    const key = `${v.id}_${v.campaignId}`;
    return notificationLog[key] && notificationLog[key].notificationCount > 1;
  }).length;
  
  const headerText = reNotifyCount > 0 
    ? `🚨 구매링크 누락 알림 (${reNotifyCount}개 미해결)`
    : "🚨 구매링크 누락 알림";
    
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: headerText,
        emoji: true
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${violations.length}개의 구매링크 누락*이 발견되었습니다.\n${reNotifyCount > 0 ? `_※ ${reNotifyCount}개는 24시간 이상 미해결된 건입니다._` : ''}`
      }
    },
    {
      type: "divider"
    }
  ];

  // 각 누락 건에 대한 상세 정보 추가
  violations.forEach((violation, index) => {
    const key = `${violation.id}_${violation.campaignId}`;
    const logEntry = notificationLog[key];
    const notifyCount = logEntry ? logEntry.notificationCount : 1;
    
    blocks.push({
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Proposition ID:*\n${violation.id} ${notifyCount > 1 ? `(${notifyCount}차 알림)` : ''}`
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

// 알림 발송 이력 로드
async function loadNotificationLog() {
  try {
    const data = await fs.readFile(NOTIFICATION_LOG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 파일이 없으면 빈 객체 반환
    return {};
  }
}

// 알림 발송 이력 저장
async function saveNotificationLog(log) {
  await fs.writeFile(NOTIFICATION_LOG_FILE, JSON.stringify(log, null, 2));
}

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

    // 알림 발송 이력 로드
    const notificationLog = await loadNotificationLog();
    const violationsToNotify = [];
    const now = new Date();

    // 알림 대상 필터링 (새로운 건 + 24시간 경과한 미해결 건)
    for (const violation of violations) {
      const key = `${violation.id}_${violation.campaignId}`;
      const lastNotified = notificationLog[key];
      
      if (!lastNotified) {
        // 새로운 누락 건
        violationsToNotify.push(violation);
        notificationLog[key] = {
          notifiedAt: now.toISOString(),
          lastCheckedAt: now.toISOString(),
          propositionId: violation.id,
          campaignId: violation.campaignId,
          cname: violation.cname,
          notificationCount: 1
        };
      } else {
        // 24시간 경과 확인 (재알림 주기)
        const lastNotifiedTime = new Date(lastNotified.notifiedAt);
        const hoursSinceLastNotification = (now - lastNotifiedTime) / (1000 * 60 * 60);
        
        if (hoursSinceLastNotification >= 24) {
          violationsToNotify.push(violation);
          notificationLog[key] = {
            ...lastNotified,
            notifiedAt: now.toISOString(),
            lastCheckedAt: now.toISOString(),
            notificationCount: (lastNotified.notificationCount || 1) + 1
          };
        } else {
          // 24시간이 안 지났어도 체크 시간은 업데이트
          notificationLog[key].lastCheckedAt = now.toISOString();
        }
      }
    }

    if (violationsToNotify.length > 0) {
      console.log(`📨 ${violationsToNotify.length}개의 알림 대상 (새로운 건 + 24시간 경과 미해결 건)`);
      
      // Slack Webhook URL 확인
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      
      if (webhookUrl) {
        // 새로운 누락 건에 대해서만 알림 전송
        await sendSlackNotification(webhookUrl, violationsToNotify);
        
        // 알림 발송 이력 저장
        await saveNotificationLog(notificationLog);
      } else {
        console.log('⚠️  SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
        console.log('새로운 누락 건:', newViolations);
      }
    } else {
      console.log('ℹ️  24시간 내 알림이 발송된 건이거나 새로운 누락 건이 없습니다.');
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