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

    // 3. 월별 매니저별 충전금액 차트 데이터
    const managerChargeData = []
    
    // 실제로 충전 금액이 있는 매니저만 가져오기
    const [activeManagers] = await connection.execute<any[]>(`
      SELECT DISTINCT 
        CASE 
          WHEN comp.manager IS NULL OR comp.manager = '' THEN '미지정'
          WHEN comp.manager LIKE '%salt%' THEN 'salt'
          ELSE comp.manager
        END as manager
      FROM Charges ch
      JOIN Companies comp ON ch.companyId = comp.id
      WHERE (ch.\`order\` LIKE '%matching%' OR ch.\`order\` IS NULL)
        AND ch.purpose IS NULL
        AND ch.createdAt >= ?
        AND ch.createdAt < ?
      ORDER BY 
        CASE 
          WHEN comp.manager LIKE '%salt%' THEN 0 
          WHEN comp.manager IS NULL OR comp.manager = '' THEN 999
          ELSE 1 
        END
    `, [
      `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`,
      `${months[months.length - 1].year + 1}-01-01`
    ])
    
    const managerList = [...new Set(activeManagers.map(m => m.manager))]
    
    for (const monthData of months) {
      const monthStart = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-01`
      const nextMonth = monthData.month === 12 
        ? { year: monthData.year + 1, month: 1 }
        : { year: monthData.year, month: monthData.month + 1 }
      const monthEnd = `${nextMonth.year}-${String(nextMonth.month).padStart(2, '0')}-01`

      // 매니저별 충전금액 (null 포함)
      const [chargeRows] = await connection.execute<any[]>(`
        SELECT 
          CASE 
            WHEN comp.manager IS NULL OR comp.manager = '' THEN '미지정'
            WHEN comp.manager LIKE '%salt%' THEN 'salt'
            ELSE comp.manager
          END as manager,
          COALESCE(SUM(ch.amount), 0) as total
        FROM Charges ch
        JOIN Companies comp ON ch.companyId = comp.id
        WHERE (ch.\`order\` LIKE '%matching%' OR ch.\`order\` IS NULL)
          AND ch.purpose IS NULL
          AND ch.createdAt >= ?
          AND ch.createdAt < ?
        GROUP BY 
          CASE 
            WHEN comp.manager IS NULL OR comp.manager = '' THEN '미지정'
            WHEN comp.manager LIKE '%salt%' THEN 'salt'
            ELSE comp.manager
          END
      `, [monthStart, monthEnd])

      const monthItem: any = {
        date: monthData.label
      }
      
      // 매니저별 데이터 초기화
      managerList.forEach(manager => {
        monthItem[manager] = 0
      })
      
      // 실제 데이터 채우기
      chargeRows.forEach(row => {
        monthItem[row.manager] = Math.round(parseFloat(row.total) || 0)
      })

      managerChargeData.push(monthItem)
    }

    return NextResponse.json({
      salesData,
      volumeData,
      managerChargeData,
      managers: managerList
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