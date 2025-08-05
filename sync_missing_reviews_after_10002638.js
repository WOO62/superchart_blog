const mysql = require('mysql2/promise');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './dev.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncMissingReviewsAfter10002638() {
  let connection;
  
  try {
    // 1. MySQL 연결
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
    
    console.log('📊 ID 10002638 이후의 누락된 리뷰 조회 중...\n');
    
    // 2. ID 10002638의 등록 시간 조회
    const [baseReview] = await connection.execute(`
      SELECT id, reviewRegisteredAt 
      FROM Propositions 
      WHERE id = 10002638
    `);
    
    if (baseReview.length === 0) {
      console.log('❌ ID 10002638을 찾을 수 없습니다.');
      return;
    }
    
    const baseTime = baseReview[0].reviewRegisteredAt;
    console.log(`📅 기준 시간 (ID 10002638): ${new Date(baseTime).toLocaleString('ko-KR')}\n`);
    
    // 3. 그 이후의 모든 리뷰 조회
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
        AND p.reviewRegisteredAt > ?
      ORDER BY p.reviewRegisteredAt ASC
    `, [baseTime]);
    
    console.log(`📝 MySQL에서 ${newReviews.length}개의 리뷰를 찾았습니다.\n`);
    
    if (newReviews.length === 0) {
      console.log('✅ 추가할 리뷰가 없습니다.');
      return;
    }
    
    // 4. 이미 저장된 것들 확인
    const reviewIds = newReviews.map(r => r.id);
    const { data: existingData } = await supabase
      .from('exposure_tracking')
      .select('proposition_id')
      .in('proposition_id', reviewIds);
    
    const existingIds = new Set(existingData?.map(item => item.proposition_id) || []);
    console.log(`📌 이미 Supabase에 있는 레코드: ${existingIds.size}개\n`);
    
    // 5. 누락된 리뷰만 필터링
    const missingReviews = newReviews.filter(review => !existingIds.has(review.id));
    
    if (missingReviews.length === 0) {
      console.log('✅ 모든 리뷰가 이미 저장되어 있습니다.');
      return;
    }
    
    console.log(`🆕 ${missingReviews.length}개의 누락된 리뷰를 처리합니다.\n`);
    
    // 처음 5개 리뷰 정보 출력
    console.log('📋 누락된 리뷰 목록 (상위 5개):');
    missingReviews.slice(0, 5).forEach(review => {
      console.log(`  ID ${review.id}: ${review.cname} - ${new Date(review.reviewRegisteredAt).toLocaleString('ko-KR')}`);
    });
    
    if (missingReviews.length > 5) {
      console.log(`  ... 그 외 ${missingReviews.length - 5}개 더\n`);
    } else {
      console.log('');
    }
    
    // 6. Supabase에 삽입
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (const review of missingReviews) {
      try {
        const { data, error } = await supabase
          .from('exposure_tracking')
          .insert({
            proposition_id: review.id,
            campaign_name: review.cname,
            manager: review.manager || null,
            company_name: review.companyName || null,
            keywords: review.keywords || null,
            post_link: review.review,
            blogger_id: review.outerId || null,
            review_registered_at: review.reviewRegisteredAt,
            success_status: 'pending'
          });
        
        if (error) {
          failCount++;
          errors.push({
            id: review.id,
            campaign: review.cname,
            error: error.message
          });
          if (failCount <= 5) {
            console.error(`❌ ID ${review.id} 저장 실패: ${error.message}`);
          }
        } else {
          successCount++;
          if (successCount <= 10 || successCount % 10 === 0) {
            const time = new Date(review.reviewRegisteredAt).toLocaleString('ko-KR');
            console.log(`✅ ID ${review.id}: ${review.cname} (${time})`);
          }
        }
      } catch (error) {
        failCount++;
        console.error(`❌ ID ${review.id} 예외 발생: ${error.message}`);
      }
      
      // Rate limiting 방지
      if (successCount % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 7. 결과 요약
    console.log('\n📊 === 최종 결과 ===');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n실패한 레코드:');
      errors.forEach(err => {
        console.log(`  ID ${err.id} (${err.campaign}): ${err.error}`);
      });
    }
    
    // 8. 전체 카운트 확인
    const { count } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n💾 Supabase 테이블 총 레코드 수: ${count}개`);
    
    // 9. 가장 최근 데이터 확인
    const { data: newestData } = await supabase
      .from('exposure_tracking')
      .select('proposition_id, campaign_name, review_registered_at')
      .order('review_registered_at', { ascending: false })
      .limit(3);
    
    console.log('\n📅 가장 최근 등록된 3개:');
    newestData?.forEach(item => {
      const time = new Date(item.review_registered_at).toLocaleString('ko-KR');
      console.log(`  ID ${item.proposition_id}: ${item.campaign_name} (${time})`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 동기화 완료');
    }
  }
}

console.log('🚀 ID 10002638 이후 누락된 리뷰 동기화 시작\n');
syncMissingReviewsAfter10002638();