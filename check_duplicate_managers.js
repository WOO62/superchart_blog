const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkDuplicateManagers() {
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

    console.log('🔍 매니저 목록 확인\n');

    // 전체 매니저 목록
    const [allManagers] = await connection.execute(`
      SELECT DISTINCT manager 
      FROM Companies 
      ORDER BY 
        CASE 
          WHEN manager = 'salt' THEN 0 
          WHEN manager IS NULL THEN 999
          ELSE 1 
        END, 
        manager
    `);

    console.log('📋 전체 매니저 목록:');
    allManagers.forEach((row, index) => {
      console.log(`   ${index}: ${row.manager === null ? 'NULL' : row.manager}`);
    });

    // API에서 사용하는 형태로 변환
    const managerList = allManagers.map(m => m.manager || '미지정');
    console.log('\n📋 변환된 매니저 목록:', managerList);

    // 중복 확인
    const duplicates = managerList.filter((item, index) => managerList.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.log('\n❌ 중복된 매니저:', duplicates);
    } else {
      console.log('\n✅ 중복 없음');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDuplicateManagers();