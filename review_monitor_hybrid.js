const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

// GitHub Gist 설정
const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;

// Gist에서 상태 읽기
async function getProcessedState() {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Gist 읽기 실패:', response.status);
      return { 
        lastCheckTime: null,
        processedIds: [],
        lastProcessedTime: null
      };
    }
    
    const gist = await response.json();
    const fileName = gist.files['review_state.json'] ? 'review_state.json' : 'gistfile1.txt';
    const content = JSON.parse(gist.files[fileName].content);
    
    // 기존 형식과의 호환성
    if (!content.processedIds) {
      content.processedIds = [];
    }
    
    console.log('📖 마지막 체크 시간:', content.lastCheckTime);
    console.log('📖 처리된 ID 개수:', content.processedIds.length);
    
    return content;
  } catch (error) {
    console.error('❌ Gist 읽기 오류:', error.message);
    return { 
      lastCheckTime: null,
      processedIds: [],
      lastProcessedTime: null
    };
  }
}

// Gist에 상태 저장
async function saveProcessedState(state) {
  try {
    // 최근 7일 이내 ID만 유지 (메모리 관리)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const recentIds = state.processedIds.filter(item => {
      return new Date(item.time) > oneWeekAgo;
    });
    
    const stateToSave = {
      lastCheckTime: new Date().toISOString(),
      processedIds: recentIds,
      lastProcessedTime: state.lastProcessedTime,
      totalProcessed: recentIds.length
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
            content: JSON.stringify(stateToSave, null, 2)
          }
        }
      })
    });
    
    if (!response.ok) {
      console.error('❌ Gist 저장 실패:', response.status);
      return false;
    }
    
    console.log('💾 상태 저장 완료 - 처리된 ID 개수:', recentIds.length);
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
          text: `ID: ${review.id} | Hybrid System`
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
      return;
    }

    // 상태 읽기
    const state = await getProcessedState();
    const processedIdSet = new Set(state.processedIds.map(item => item.id));

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

    console.log('🔍 신규 리뷰 검증 시작... (Hybrid System)');
    console.log(`📍 처리된 ID 개수: ${processedIdSet.size}`);

    // 최근 2시간 이내 리뷰 조회 (충분한 여유 시간)
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
        AND p.reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 2 HOUR)
        AND p.reviewRegisteredAt <= DATE_ADD(NOW(), INTERVAL 9 HOUR)
      ORDER BY p.reviewRegisteredAt ASC
    `);

    console.log(`📝 최근 2시간 내 리뷰: ${newReviews.length}개`);

    // 처리되지 않은 리뷰만 필터링
    const unprocessedReviews = newReviews.filter(review => !processedIdSet.has(review.id));

    if (unprocessedReviews.length === 0) {
      console.log('✅ 새로운 리뷰 없음');
      return;
    }

    console.log(`🆕 처리할 신규 리뷰: ${unprocessedReviews.length}개`);

    // Slack 알림 전송
    const webhookUrl = process.env.SLACK_REVIEW_WEBHOOK_URL;
    
    if (webhookUrl) {
      let successCount = 0;
      const newProcessedIds = [];
      
      for (const review of unprocessedReviews) {
        await sendSlackNotification(webhookUrl, review);
        successCount++;
        
        // 처리된 ID 기록
        newProcessedIds.push({
          id: review.id,
          time: new Date().toISOString(),
          registeredAt: review.reviewRegisteredAt
        });
        
        // Slack rate limit 방지
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 상태 업데이트
      state.processedIds = [...state.processedIds, ...newProcessedIds];
      state.lastProcessedTime = new Date().toISOString();
      
      // 상태 저장
      await saveProcessedState(state);
      
      console.log(`✅ 완료: ${successCount}개 알림 전송`);
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