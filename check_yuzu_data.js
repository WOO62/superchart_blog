const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkYuzuData() {
  let connection;
  
  try {
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

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    console.log('🔍 yuzu 매니저 데이터 확인');
    console.log(`📅 기간: ${thisMonthStart.toISOString()} ~ ${nextMonthStart.toISOString()}\n`);

    // 1. yuzu의 수락금액 확인
    const [acceptanceRows] = await connection.execute(`
      SELECT 
        p.id,
        p.point,
        p.status,
        p.createdAt,
        c.name as campaignName,
        comp.name as companyName
      FROM Propositions p
      JOIN Campaigns c ON p.campaignId = c.id
      JOIN Companies comp ON c.companyId = comp.id
      WHERE comp.manager = 'yuzu'
        AND p.status IN (2, 10, 12, 20, 22, 24, 30, 32, 40)
        AND p.createdAt >= ?
        AND p.createdAt < ?
      ORDER BY p.point DESC
      LIMIT 10
    `, [thisMonthStart, nextMonthStart]);

    console.log('📊 yuzu 수락금액 상위 10건:');
    let totalAcceptance = 0;
    acceptanceRows.forEach(row => {
      console.log(`   ID: ${row.id}, Point: ${row.point.toLocaleString()}, Status: ${row.status}, Company: ${row.companyName}`);
      totalAcceptance += row.point;
    });

    // 전체 수락금액 합계
    const [acceptanceSum] = await connection.execute(`
      SELECT 
        SUM(p.point) as total,
        COUNT(*) as count
      FROM Propositions p
      JOIN Campaigns c ON p.campaignId = c.id
      JOIN Companies comp ON c.companyId = comp.id
      WHERE comp.manager = 'yuzu'
        AND p.status IN (2, 10, 12, 20, 22, 24, 30, 32, 40)
        AND p.createdAt >= ?
        AND p.createdAt < ?
    `, [thisMonthStart, nextMonthStart]);

    console.log(`\n✅ yuzu 수락금액 총합: ${acceptanceSum[0].total?.toLocaleString() || 0}원 (${acceptanceSum[0].count}건)`);

    // 2. yuzu의 충전금액 확인
    const [chargeRows] = await connection.execute(`
      SELECT 
        ch.id,
        ch.amount,
        ch.purpose,
        ch.\`order\`,
        ch.createdAt,
        comp.name as companyName
      FROM Charges ch
      JOIN Companies comp ON ch.companyId = comp.id
      WHERE comp.manager = 'yuzu'
        AND (ch.\`order\` LIKE '%matching%' OR ch.\`order\` IS NULL)
        AND ch.purpose IS NULL
        AND ch.createdAt >= ?
        AND ch.createdAt < ?
      ORDER BY ch.amount DESC
      LIMIT 10
    `, [thisMonthStart, nextMonthStart]);

    console.log('\n💰 yuzu 충전금액 상위 10건:');
    let totalCharge = 0;
    chargeRows.forEach(row => {
      console.log(`   ID: ${row.id}, Amount: ${row.amount.toLocaleString()}, Order: ${row.order || 'NULL'}, Company: ${row.companyName}`);
      totalCharge += row.amount;
    });

    // 전체 충전금액 합계
    const [chargeSum] = await connection.execute(`
      SELECT 
        SUM(ch.amount) as total,
        COUNT(*) as count
      FROM Charges ch
      JOIN Companies comp ON ch.companyId = comp.id
      WHERE comp.manager = 'yuzu'
        AND (ch.\`order\` LIKE '%matching%' OR ch.\`order\` IS NULL)
        AND ch.purpose IS NULL
        AND ch.createdAt >= ?
        AND ch.createdAt < ?
    `, [thisMonthStart, nextMonthStart]);

    console.log(`\n✅ yuzu 충전금액 총합: ${chargeSum[0].total?.toLocaleString() || 0}원 (${chargeSum[0].count}건)`);

    // 3. 모든 매니저 비교
    const [allManagers] = await connection.execute(`
      SELECT 
        comp.manager,
        SUM(p.point) as acceptanceAmount
      FROM Propositions p
      JOIN Campaigns c ON p.campaignId = c.id
      JOIN Companies comp ON c.companyId = comp.id
      WHERE p.status IN (2, 10, 12, 20, 22, 24, 30, 32, 40)
        AND p.createdAt >= ?
        AND p.createdAt < ?
      GROUP BY comp.manager
      ORDER BY acceptanceAmount DESC
    `, [thisMonthStart, nextMonthStart]);

    console.log('\n📈 모든 매니저 수락금액 비교:');
    allManagers.forEach(row => {
      console.log(`   ${row.manager}: ${row.acceptanceAmount?.toLocaleString() || 0}원`);
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkYuzuData();