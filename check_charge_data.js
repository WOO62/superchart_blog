const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkChargeData() {
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

    console.log('🔍 이번 달 충전 데이터 확인');
    console.log(`📅 기간: ${thisMonthStart.toISOString()} ~ ${nextMonthStart.toISOString()}\n`);

    // 1. 전체 매칭 충전금액 (order LIKE '%matching%')
    const [matchingOnly] = await connection.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM Charges
      WHERE \`order\` LIKE '%matching%'
        AND purpose IS NULL
        AND createdAt >= ?
        AND createdAt < ?
    `, [thisMonthStart, nextMonthStart]);

    console.log(`✅ matching 주문만: ${Number(matchingOnly[0].total).toLocaleString()}원 (${matchingOnly[0].count}건)`);

    // 2. order가 NULL인 충전
    const [nullOrders] = await connection.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM Charges
      WHERE \`order\` IS NULL
        AND purpose IS NULL
        AND createdAt >= ?
        AND createdAt < ?
    `, [thisMonthStart, nextMonthStart]);

    console.log(`✅ NULL 주문: ${Number(nullOrders[0].total).toLocaleString()}원 (${nullOrders[0].count}건)`);

    // 3. 전체 (matching OR NULL)
    const [total] = await connection.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM Charges
      WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
        AND purpose IS NULL
        AND createdAt >= ?
        AND createdAt < ?
    `, [thisMonthStart, nextMonthStart]);

    console.log(`✅ 전체 (matching + NULL): ${Number(total[0].total).toLocaleString()}원 (${total[0].count}건)\n`);

    // 4. 매니저별 분석
    console.log('📊 매니저별 충전금액 분석:');
    
    // matching만
    const [managerMatching] = await connection.execute(`
      SELECT 
        COALESCE(comp.manager, '미지정') as manager,
        SUM(ch.amount) as total,
        COUNT(*) as count
      FROM Charges ch
      JOIN Companies comp ON ch.companyId = comp.id
      WHERE ch.\`order\` LIKE '%matching%'
        AND ch.purpose IS NULL
        AND ch.createdAt >= ?
        AND ch.createdAt < ?
      GROUP BY comp.manager
      ORDER BY total DESC
    `, [thisMonthStart, nextMonthStart]);

    console.log('\n[matching 주문만]');
    managerMatching.forEach(row => {
      console.log(`   ${row.manager}: ${Number(row.total).toLocaleString()}원 (${row.count}건)`);
    });

    // matching + NULL
    const [managerAll] = await connection.execute(`
      SELECT 
        COALESCE(comp.manager, '미지정') as manager,
        SUM(ch.amount) as total,
        COUNT(*) as count
      FROM Charges ch
      JOIN Companies comp ON ch.companyId = comp.id
      WHERE (ch.\`order\` LIKE '%matching%' OR ch.\`order\` IS NULL)
        AND ch.purpose IS NULL
        AND ch.createdAt >= ?
        AND ch.createdAt < ?
      GROUP BY comp.manager
      ORDER BY total DESC
    `, [thisMonthStart, nextMonthStart]);

    console.log('\n[matching + NULL 주문]');
    managerAll.forEach(row => {
      console.log(`   ${row.manager}: ${Number(row.total).toLocaleString()}원 (${row.count}건)`);
    });

    // 5. NULL 주문 상세 확인
    console.log('\n📋 NULL 주문 상세 (상위 10건):');
    const [nullDetails] = await connection.execute(`
      SELECT 
        ch.id,
        ch.amount,
        ch.createdAt,
        comp.name as companyName,
        comp.manager
      FROM Charges ch
      JOIN Companies comp ON ch.companyId = comp.id
      WHERE ch.\`order\` IS NULL
        AND ch.purpose IS NULL
        AND ch.createdAt >= ?
        AND ch.createdAt < ?
      ORDER BY ch.amount DESC
      LIMIT 10
    `, [thisMonthStart, nextMonthStart]);

    nullDetails.forEach(row => {
      console.log(`   ID: ${row.id}, Amount: ${Number(row.amount).toLocaleString()}, Company: ${row.companyName}, Manager: ${row.manager || '미지정'}`);
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkChargeData();