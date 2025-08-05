import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

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

    // Supabase 클라이언트
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 최근 12개월 데이터 조회
    const months = []
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: date.toLocaleDateString('ko-KR', { month: 'short' })
      })
    }

    // 1. 매출 차트 데이터
    const salesData = []
    
    for (const monthData of months) {
      const monthStart = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-01`
      const nextMonth = monthData.month === 12 
        ? { year: monthData.year + 1, month: 1 }
        : { year: monthData.year, month: monthData.month + 1 }
      const monthEnd = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`

      // 블로그 매출 (purpose IS NULL만)
      const [blogRows] = await connection.execute<any[]>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM Charges
        WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
          AND purpose IS NULL
          AND createdAt >= ?
          AND createdAt < ?
      `, [monthStart, monthEnd])

      // 슈퍼차트 매출 (전체 매출 - purpose에 관계없이 모든 matching)
      const [superchartRows] = await connection.execute<any[]>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM Charges
        WHERE (\`order\` LIKE '%matching%' OR \`order\` IS NULL)
          AND createdAt >= ?
          AND createdAt < ?
      `, [monthStart, monthEnd])

      const blogRevenue = parseFloat(blogRows[0].total) || 0
      const superchartRevenue = parseFloat(superchartRows[0].total) || 0

      salesData.push({
        date: monthData.label,
        블로그매출: Math.round(blogRevenue),
        슈퍼차트매출: Math.round(superchartRevenue)
      })
    }

    // 2. 발행량 차트 데이터
    const volumeData = []
    
    for (const monthData of months) {
      const monthStart = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-01`
      const nextMonth = monthData.month === 12 
        ? { year: monthData.year + 1, month: 1 }
        : { year: monthData.year, month: monthData.month + 1 }
      const monthEnd = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`

      // Supabase에서 발행량 조회
      const { count, error } = await supabase
        .from('exposure_tracking')
        .select('*', { count: 'exact', head: true })
        .gte('review_registered_at', monthStart)
        .lt('review_registered_at', monthEnd)

      volumeData.push({
        date: monthData.label,
        발행량: count || 0
      })
    }

    return NextResponse.json({
      salesData,
      volumeData
    })

  } catch (error: any) {
    console.error('차트 데이터 조회 오류:', error)
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