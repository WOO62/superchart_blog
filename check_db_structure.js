const mysql = require('mysql2/promise');
require('dotenv').config({ path: './dev.env' });

async function checkDatabaseStructure() {
  let connection;
  
  try {
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE
    });

    console.log('Connected to MySQL database\n');

    // 모든 테이블 목록 조회
    const [tables] = await connection.execute(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [process.env.MYSQL_DATABASE]
    );

    console.log('=== 테이블 목록 ===');
    for (const table of tables) {
      console.log(`- ${table.TABLE_NAME}`);
    }

    console.log('\n=== 테이블 구조 상세 ===\n');

    // 각 테이블의 구조 확인
    for (const table of tables) {
      console.log(`\n📋 Table: ${table.TABLE_NAME}`);
      console.log('─'.repeat(50));
      
      // 컬럼 정보 조회
      const [columns] = await connection.execute(
        `SELECT 
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          COLUMN_KEY,
          COLUMN_DEFAULT,
          EXTRA
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
        [process.env.MYSQL_DATABASE, table.TABLE_NAME]
      );

      // 컬럼 정보 출력
      for (const column of columns) {
        let columnInfo = `  ${column.COLUMN_NAME} - ${column.COLUMN_TYPE}`;
        if (column.COLUMN_KEY === 'PRI') columnInfo += ' [PRIMARY KEY]';
        if (column.COLUMN_KEY === 'UNI') columnInfo += ' [UNIQUE]';
        if (column.COLUMN_KEY === 'MUL') columnInfo += ' [INDEX]';
        if (column.IS_NULLABLE === 'NO') columnInfo += ' NOT NULL';
        if (column.COLUMN_DEFAULT !== null) columnInfo += ` DEFAULT ${column.COLUMN_DEFAULT}`;
        if (column.EXTRA) columnInfo += ` ${column.EXTRA}`;
        console.log(columnInfo);
      }

      // 샘플 데이터 조회 (최대 3개)
      const [sampleData] = await connection.execute(
        `SELECT * FROM ${table.TABLE_NAME} LIMIT 3`
      );
      
      if (sampleData.length > 0) {
        console.log(`\n  샘플 데이터 (${sampleData.length}개):`);
        console.log('  ' + JSON.stringify(sampleData[0], null, 2).split('\n').join('\n  '));
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseStructure();