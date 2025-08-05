import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export async function GET() {
  let connection
  
  try {
    // MySQL 연결
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    })

    // 현재 날짜 정보
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // 이번 달 시작일과 종료일
    const thisMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
    const nextMonthStart = currentMonth === 12 
      ? `${currentYear + 1}-01-01`
      : `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    
    // 작년 같은 달
    const lastYearMonth = `${currentYear - 1}-${String(currentMonth).padStart(2, '0')}-01`
    const lastYearMonthEnd = currentMonth === 12
      ? `${currentYear}-01-01` 
      : `${currentYear - 1}-${String(currentMonth + 1).padStart(2, '0')}-01`

    // 1. 이번 달 블로그 매출
    const [thisMonthBlogRows] = await connection.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM Charges
      WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
        AND purpose IS NULL
        AND createdAt >= ?
        AND createdAt < ?
    `, [thisMonthStart, nextMonthStart])
    
    const thisMonthBlog = parseFloat(thisMonthBlogRows[0].total) || 0

    // 2. 작년 같은 달 블로그 매출 (전년 대비 계산)
    const [lastYearBlogRows] = await connection.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM Charges
      WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
        AND purpose IS NULL
        AND createdAt >= ?
        AND createdAt < ?
    `, [lastYearMonth, lastYearMonthEnd])
    
    const lastYearBlog = parseFloat(lastYearBlogRows[0].total) || 0
    const blogChange = lastYearBlog > 0 
      ? ((thisMonthBlog - lastYearBlog) / lastYearBlog * 100).toFixed(1)
      : 0

    // 3. 올해 블로그 매출
    const [totalBlogRows] = await connection.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM Charges
      WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
        AND purpose IS NULL
        AND YEAR(createdAt) = ?
    `, [currentYear])
    
    const totalBlog = parseFloat(totalBlogRows[0].total) || 0

    // 4. 이번 달 슈퍼차트 매출
    const [thisMonthSuperchartRows] = await connection.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM Charges
      WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
        AND createdAt >= ?
        AND createdAt < ?
    `, [thisMonthStart, nextMonthStart])
    
    const thisMonthSuperchart = parseFloat(thisMonthSuperchartRows[0].total) || 0

    // 5. 작년 같은 달 슈퍼차트 매출
    const [lastYearSuperchartRows] = await connection.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM Charges
      WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
        AND createdAt >= ?
        AND createdAt < ?
    `, [lastYearMonth, lastYearMonthEnd])
    
    const lastYearSuperchart = parseFloat(lastYearSuperchartRows[0].total) || 0
    const superchartChange = lastYearSuperchart > 0
      ? ((thisMonthSuperchart - lastYearSuperchart) / lastYearSuperchart * 100).toFixed(1)
      : 0

    // 6. 작년 전체 대비 계산을 위한 작년 누적
    const [lastYearTotalBlogRows] = await connection.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM Charges
      WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
        AND purpose IS NULL
        AND YEAR(createdAt) = ?
    `, [currentYear - 1])
    
    const lastYearTotalBlog = parseFloat(lastYearTotalBlogRows[0].total) || 0
    const totalBlogChange = lastYearTotalBlog > 0
      ? ((totalBlog - lastYearTotalBlog) / lastYearTotalBlog * 100).toFixed(1)
      : 0

    return NextResponse.json({
      thisMonthBlog,
      thisMonthBlogChange: parseFloat(blogChange),
      totalBlog,
      totalBlogChange: parseFloat(totalBlogChange),
      thisMonthSuperchart,
      thisMonthSuperchartChange: parseFloat(superchartChange),
    })

  } catch (error: any) {
    console.error('통계 조회 오류:', error)
    return NextResponse.json(
      { 
        error: '데이터 조회 중 오류가 발생했습니다.',
        details: error.message,
        code: error.code 
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}