const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './dev.env' });

// 마지막 체크 시간을 저장할 파일
const LAST_CHECK_FILE = path.join(__dirname, 'review_last_check.json');

// Slack Webhook 전송 함수 (개별 리뷰용)
async function sendSlackNotification(webhookUrl, review) {
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📝 신규 리뷰 등록 알림",
        emoji: true
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*캠페인명:*\n${review.cname}`
        },
        {
          type: "mrkdwn",
          text: `*블로거 ID:*\n${review.outerId || 'N/A'}`
        },
        {
          type: "mrkdwn",
          text: `*매니저:*\n${review.manager || 'N/A'}`
        },
        {
          type: "mrkdwn",
          text: `*등록 시간:*\n${review.reviewRegisteredAt}`
        }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*리뷰 URL:* ${review.review}`
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Proposition ID: ${review.id}`
        }
      ]
    }
  ];

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ blocks })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✅ Slack 알림 전송 성공');
  } catch (error) {
    console.error('❌ Slack 알림 전송 실패:', error.message);
  }
}

// 마지막 체크 시간 로드
async function loadLastCheckTime() {
  // GitHub Actions 환경에서는 환경변수로 마지막 체크 시간 전달
  if (process.env.LAST_CHECK_TIME) {
    console.log('📌 환경변수에서 마지막 체크 시간 로드');
    return process.env.LAST_CHECK_TIME;
  }
  
  try {
    const data = await fs.readFile(LAST_CHECK_FILE, 'utf8');
    return JSON.parse(data).lastCheckTime;
  } catch (error) {
    // 파일이 없으면 10분 전 시간 반환 (초기 실행 시)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    console.log('⚠️  초기 실행: 10분 전부터 확인합니다.');
    return tenMinutesAgo.toISOString();
  }
}

// 마지막 체크 시간 저장
async function saveLastCheckTime(time) {
  await fs.writeFile(LAST_CHECK_FILE, JSON.stringify({ lastCheckTime: time }, null, 2));
}

// 신규 리뷰 모니터링
async function monitorNewReviews() {
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

    console.log('🔍 신규 리뷰 검증 시작...');

    // 마지막 체크 시간 로드
    const lastCheckTime = await loadLastCheckTime();
    console.log(`마지막 체크 시간: ${new Date(lastCheckTime).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

    // 신규 리뷰 조회 (매니저 정보 포함)
    const [newReviews] = await connection.execute(`
      SELECT 
        p.id,
        p.cname,
        p.review,
        p.reviewRegisteredAt,
        p.uid,
        u.outerId,
        comp.manager
      FROM Propositions p
      LEFT JOIN Users u ON p.uid = u.uid
      LEFT JOIN Campaigns c ON p.campaignId = c.id
      LEFT JOIN Companies comp ON c.companyId = comp.id
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt > ?
      ORDER BY p.reviewRegisteredAt DESC
    `, [lastCheckTime]);

    if (newReviews.length === 0) {
      console.log('✅ 신규 리뷰 없음');
      return;
    }

    console.log(`📝 ${newReviews.length}개의 신규 리뷰 발견`);

    // Slack Webhook URL 확인
    const webhookUrl = process.env.SLACK_REVIEW_WEBHOOK_URL;
    
    if (webhookUrl) {
      // 각 리뷰에 대해 개별 알림 전송
      for (const review of newReviews) {
        await sendSlackNotification(webhookUrl, review);
        // 각 알림 사이에 약간의 딜레이 추가 (Slack rate limit 방지)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log(`✅ ${newReviews.length}개의 개별 Slack 알림 전송 완료`);
      
      // 가장 최근 리뷰의 시간을 마지막 체크 시간으로 저장
      const latestReviewTime = newReviews[0].reviewRegisteredAt;
      await saveLastCheckTime(new Date(latestReviewTime).toISOString());
      console.log('✅ 마지막 체크 시간 업데이트 완료');
    } else {
      console.log('⚠️  SLACK_REVIEW_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
      console.log('신규 리뷰:', newReviews);
    }

    // 신규 리뷰 요약 출력
    console.log('\n📊 신규 리뷰 요약:');
    newReviews.forEach(review => {
      console.log(`  - ${review.cname} (${review.outerId || 'Unknown'}, 담당: ${review.manager || 'N/A'}): ${review.review}`);
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
  monitorNewReviews();
}

module.exports = { monitorNewReviews };