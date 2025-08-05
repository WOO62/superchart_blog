require('dotenv').config({ path: './dev.env' });

console.log('Environment variables check:');
console.log('MYSQL_HOST:', process.env.MYSQL_HOST);
console.log('MYSQL_PORT:', process.env.MYSQL_PORT);
console.log('MYSQL_USERNAME:', process.env.MYSQL_USERNAME);
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);
console.log('MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '***' : 'NOT SET');

const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: 10000
    });

    console.log('\n✅ Successfully connected to MySQL!');
    
    // 간단한 쿼리 테스트
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('Query test result:', result);

    await connection.end();
  } catch (error) {
    console.error('\n❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('SQL State:', error.sqlState);
  }
}

testConnection();