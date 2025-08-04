const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkColumns() {
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

    // ChannelCampaigns 테이블 구조 확인
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM ChannelCampaigns
    `);

    console.log('ChannelCampaigns 테이블 컬럼:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('오류:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkColumns();