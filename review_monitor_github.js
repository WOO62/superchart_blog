const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

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
          text: `*등록 시간:*\n${new Date(review.reviewRegisteredAt).toLocaleString('ko-KR')}`
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

// GitHub Actions용 신규 리뷰 모니터링 (최근 10분 내 리뷰만)
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

    console.log('🔍 신규 리뷰 검증 시작... (GitHub Actions - 최근 10분)');

    // 최근 10분 내 신규 리뷰만 조회 (GitHub Actions 실행 간격 불규칙 대응)
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    // KST 형식으로 변환하여 출력
    const toKSTString = (date) => {
      const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      return kst.toISOString().replace('T', ' ').slice(0, 19);
    };
    
    console.log(`체크 기준 시간 (KST): ${toKSTString(tenMinutesAgo)}`);
    console.log(`현재 시간 (KST): ${toKSTString(now)}`);

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
        AND p.reviewRegisteredAt > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        AND p.reviewRegisteredAt <= NOW()
      ORDER BY p.reviewRegisteredAt DESC
    `);

    if (newReviews.length === 0) {
      console.log('✅ 최근 10분 내 신규 리뷰 없음');
      return;
    }

    console.log(`📝 ${newReviews.length}개의 신규 리뷰 발견 (최근 10분)`);

    // Slack Webhook URL 확인
    const webhookUrl = process.env.SLACK_REVIEW_WEBHOOK_URL;
    
    if (webhookUrl) {
      // 중복 방지: 최근 5분 내 리뷰만 알림 (10분 윈도우에서 필터링)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const recentReviews = newReviews.filter(review => 
        new Date(review.reviewRegisteredAt) > fiveMinutesAgo
      );
      
      if (recentReviews.length > 0) {
        console.log(`🔄 중복 방지 필터링: ${newReviews.length}개 중 ${recentReviews.length}개 전송`);
        
        // 각 리뷰에 대해 개별 알림 전송
        for (const review of recentReviews) {
          await sendSlackNotification(webhookUrl, review);
          // 각 알림 사이에 약간의 딜레이 추가 (Slack rate limit 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(`✅ ${recentReviews.length}개의 개별 Slack 알림 전송 완료`);
      } else {
        console.log('🔄 중복 방지: 최근 5분 내 새 리뷰 없음 (알림 생략)');
      }
    } else {
      console.log('⚠️  SLACK_REVIEW_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
    }

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