const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });

    console.log('Connected to MySQL database\n');

    // ChannelCampaigns 테이블 구조 확인
    console.log('=== ChannelCampaigns 테이블 구조 ===');
    const [channelColumns] = await connection.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ChannelCampaigns'
       ORDER BY ORDINAL_POSITION`,
      [process.env.MYSQL_DATABASE]
    );
    
    channelColumns.forEach(col => {
      console.log(`${col.COLUMN_NAME} - ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
    });

    // Propositions 테이블 구조 확인
    console.log('\n=== Propositions 테이블 구조 ===');
    const [propColumns] = await connection.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Propositions'
       ORDER BY ORDINAL_POSITION`,
      [process.env.MYSQL_DATABASE]
    );
    
    propColumns.forEach(col => {
      console.log(`${col.COLUMN_NAME} - ${col.COLUMN_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 샘플 데이터 확인
    console.log('\n=== ChannelCampaigns 샘플 데이터 (purchaseLink가 있는 경우) ===');
    const [channelSample] = await connection.execute(
      `SELECT id, campaignId, purchaseLink 
       FROM ChannelCampaigns 
       WHERE purchaseLink IS NOT NULL 
       LIMIT 3`
    );
    console.log(channelSample);

    console.log('\n=== Propositions 샘플 데이터 ===');
    const [propSample] = await connection.execute(
      `SELECT id, campaignId, cname, purchaseLink 
       FROM Propositions 
       LIMIT 3`
    );
    console.log(propSample);

    // 누락된 purchaseLink 검증 쿼리
    console.log('\n=== 구매링크 누락 검증 ===');
    const [violations] = await connection.execute(`
      SELECT 
        p.id,
        p.cname,
        p.campaignId,
        cc.purchaseLink as channelPurchaseLink,
        p.purchaseLink as propositionPurchaseLink
      FROM Propositions p
      INNER JOIN ChannelCampaigns cc ON p.campaignId = cc.campaignId
      WHERE cc.purchaseLink IS NOT NULL 
        AND (p.purchaseLink IS NULL OR p.purchaseLink = '')
      LIMIT 10
    `);

    if (violations.length > 0) {
      console.log(`발견된 누락 건수: ${violations.length}개`);
      console.log(violations);
    } else {
      console.log('구매링크 누락 없음');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables();