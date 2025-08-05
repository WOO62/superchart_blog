const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');

// GitHub Actions에서는 환경변수가 직접 제공되므로 dotenv는 조건부로만 사용
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './dev.env' });
}

// GitHub Gist 설정
const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GH_TOKEN;

// 필수 환경변수 검증
const requiredEnvVars = [
  'MYSQL_HOST',
  'MYSQL_USERNAME', 
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
  'GIST_ID',
  'GH_TOKEN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ 필수 환경변수가 설정되지 않았습니다: ${envVar}`);
    process.exit(1);
  }
}

// Supabase 클라이언트를 나중에 초기화
let supabase = null;

// Supabase 클라이언트 초기화 함수
function initializeSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 Supabase 환경변수 확인:');
  console.log(`   URL: ${supabaseUrl ? '✅ 설정됨' : '❌ 없음'}`);
  console.log(`   KEY: ${supabaseKey ? '✅ 설정됨 (길이: ${supabaseKey.length})' : '❌ 없음'}`);

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경변수가 누락되었습니다!');
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

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

// Supabase에 데이터 저장
async function saveToSupabase(review) {
  try {
    // Supabase 클라이언트 상태 확인
    if (!supabase) {
      console.error('❌ Supabase 클라이언트가 초기화되지 않았습니다!');
      return false;
    }
    
    // 데이터 준비
    const dataToSave = {
      proposition_id: review.id,
      campaign_name: review.cname,
      manager: review.manager || null,
      company_name: review.companyName || null,
      keywords: review.keywords || null,
      post_link: review.review,
      blogger_id: review.outerId || null,
      review_registered_at: review.reviewRegisteredAt,
      success_status: 'pending'
    };
    
    console.log(`📤 Supabase 저장 시도 - ID: ${review.id}, 캠페인: ${review.cname}`);
    
    // 중복 체크 후 insert (upsert 대신)
    const { data: existing, error: checkError } = await supabase
      .from('exposure_tracking')
      .select('id')
      .eq('proposition_id', review.id);
    
    if (checkError) {
      console.error('❌ 중복 체크 오류:', checkError.message);
    }
    
    if (existing && existing.length > 0) {
      console.log(`⚠️  ID ${review.id}는 이미 존재합니다. 건너뜀.`);
      return true; // 이미 존재하면 성공으로 처리
    }
    
    console.log('📋 저장할 데이터:', JSON.stringify(dataToSave, null, 2));
    
    const { data, error } = await supabase
      .from('exposure_tracking')
      .insert(dataToSave);

    if (error) {
      console.error('❌ Supabase 저장 실패 - ID:', review.id);
      console.error('   에러 코드:', error.code);
      console.error('   에러 메시지:', error.message);
      console.error('   에러 상세:', error.details);
      console.error('   에러 힌트:', error.hint);
      console.error('   전체 에러 객체:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log(`✅ Supabase 저장 성공 - ID: ${review.id}`);
    return true;
  } catch (error) {
    console.error('❌ Supabase 저장 예외 발생 - ID:', review.id);
    console.error('   예외 타입:', error.constructor.name);
    console.error('   예외 메시지:', error.message);
    console.error('   예외 스택:', error.stack);
    console.error('   전체 에러:', error);
    
    // 네트워크 에러인 경우
    if (error.message && error.message.includes('fetch')) {
      console.error('   🌐 네트워크 에러 감지됨');
    }
    
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
    // Supabase 초기화
    supabase = initializeSupabase();
    if (!supabase) {
      console.error('❌ Supabase 클라이언트 초기화 실패');
      return;
    }
    
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
        comp.manager,
        comp.name as companyName,
        cc.requiredKeywords as keywords
      FROM Propositions p
      LEFT JOIN Users u ON p.uid = u.uid
      LEFT JOIN ChannelCampaigns cc ON p.campaignId = cc.campaignId
      LEFT JOIN Campaigns c ON cc.campaignId = c.id
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
        console.log(`\n🔄 리뷰 처리 시작 - ID: ${review.id}`);
        
        // 먼저 Supabase에 저장 시도
        let saveSuccess = await saveToSupabase(review);
        
        if (!saveSuccess) {
          console.log(`⚠️  ID ${review.id} Supabase 저장 실패, 재시도 중...`);
          // 2초 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 2000));
          saveSuccess = await saveToSupabase(review);
          
          if (!saveSuccess) {
            console.error(`❌ ID ${review.id} Supabase 저장 최종 실패!`);
            console.error(`   캠페인: ${review.cname}`);
            console.error(`   URL: ${review.review}`);
            // Supabase 저장 실패 시 처리된 목록에 추가하지 않음 (다음에 재시도 가능)
          } else {
            console.log(`✅ ID ${review.id} 재시도 성공`);
          }
        }
        
        // Supabase 저장이 성공한 경우에만 Slack 알림 전송
        if (saveSuccess) {
          // Slack 알림 전송
          await sendSlackNotification(webhookUrl, review);
          
          successCount++;
          newProcessedIds.push({
            id: review.id,
            time: new Date().toISOString(),
            registeredAt: review.reviewRegisteredAt,
            supabaseSaved: true
          });
        } else {
          console.log(`⚠️  ID ${review.id}는 Supabase 저장 실패로 Slack 알림을 보내지 않습니다.`);
          // 실패한 경우에도 Gist에 기록하되, supabaseSaved를 false로
          newProcessedIds.push({
            id: review.id,
            time: new Date().toISOString(),
            registeredAt: review.reviewRegisteredAt,
            supabaseSaved: false
          });
        }
        
        // API rate limit 방지
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
    console.error('❌ 스택 트레이스:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  monitorNewReviews()
    .then(() => {
      console.log('✅ 모니터링 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 치명적 오류:', error.message);
      process.exit(1);
    });
}

module.exports = { monitorNewReviews };