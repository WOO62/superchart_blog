const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

// GitHub Gist 설정 (이 값들을 환경변수로 설정해야 함)
const GIST_ID = process.env.GIST_ID; // Gist ID
const GITHUB_TOKEN = process.env.GH_TOKEN; // Personal Access Token

// Gist에서 상태 읽기
async function getLastProcessedState() {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Gist 읽기 실패:', response.status);
      return { lastProcessedId: 0 };
    }
    
    const gist = await response.json();
    // Gist 파일명 확인 (gistfile1.txt 또는 review_state.json)
    const fileName = gist.files['review_state.json'] ? 'review_state.json' : 'gistfile1.txt';
    const content = JSON.parse(gist.files[fileName].content);
    console.log('📖 마지막 처리 ID:', content.lastProcessedId);
    return content;
  } catch (error) {
    console.error('❌ Gist 읽기 오류:', error.message);
    return { lastProcessedId: 0 };
  }
}

// Gist에 상태 저장
async function saveLastProcessedState(lastId, count) {
  try {
    const state = {
      lastProcessedId: lastId,
      lastCheckTime: new Date().toISOString(),
      processedCount: count
    };
    
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          'gistfile1.txt': {
            content: JSON.stringify(state, null, 2)
          }
        }
      })
    });
    
    if (!response.ok) {
      console.error('❌ Gist 저장 실패:', response.status);
      return false;
    }
    
    console.log('💾 상태 저장 완료 - 마지막 ID:', lastId);
    return true;
  } catch (error) {
    console.error('❌ Gist 저장 오류:', error.message);
    return false;
  }
}

// Slack 알림 전송
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
          text: `ID: ${review.id} | Stateful System`
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

    console.log('✅ Slack 알림 전송 성공 - ID:', review.id);
  } catch (error) {
    console.error('❌ Slack 알림 전송 실패:', error.message);
  }
}

// 메인 모니터링 함수
async function monitorNewReviews() {
  let connection;
  
  try {
    // Gist 설정 확인
    if (!GIST_ID || !GITHUB_TOKEN) {
      console.error('❌ GIST_ID 또는 GH_TOKEN 환경변수가 설정되지 않았습니다.');
      console.log('설정 방법:');
      console.log('1. GitHub에서 Personal Access Token 생성 (gist 권한 필요)');
      console.log('2. Gist 생성 후 ID 복사');
      console.log('3. 환경변수 설정:');
      console.log('   GIST_ID=your_gist_id');
      console.log('   GH_TOKEN=your_token');
      return;
    }

    // 마지막 처리 상태 읽기
    const state = await getLastProcessedState();
    const lastProcessedId = state.lastProcessedId || 0;

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

    console.log('🔍 신규 리뷰 검증 시작... (Stateful - 1시간 윈도우)');
    console.log(`📍 마지막 처리 ID: ${lastProcessedId}`);

    // 새로운 리뷰 조회 (ID 기반 + 1시간 안전 윈도우)
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
        AND p.id > ?
        AND p.reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 1 HOUR)
        AND p.reviewRegisteredAt <= DATE_ADD(NOW(), INTERVAL 9 HOUR)
      ORDER BY p.id ASC
    `, [lastProcessedId]);

    if (newReviews.length === 0) {
      console.log('✅ 새로운 리뷰 없음');
      return;
    }

    console.log(`📝 ${newReviews.length}개의 신규 리뷰 발견`);

    // Slack 알림 전송
    const webhookUrl = process.env.SLACK_REVIEW_WEBHOOK_URL;
    
    if (webhookUrl) {
      let successCount = 0;
      
      for (const review of newReviews) {
        await sendSlackNotification(webhookUrl, review);
        successCount++;
        // Slack rate limit 방지
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 마지막 처리 ID 저장
      const maxId = Math.max(...newReviews.map(r => r.id));
      await saveLastProcessedState(maxId, successCount);
      
      console.log(`✅ 완료: ${successCount}개 알림 전송, 마지막 ID: ${maxId}`);
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