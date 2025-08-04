import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/mysql'

export async function GET(request: NextRequest) {
  try {
    const pool = await getConnection()
    
    // 이번 달 매출 (예시 쿼리 - 실제 테이블 구조에 맞게 수정 필요)
    const [thisMonthSales] = await pool.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total
      FROM Ads_Payment
      WHERE payState = 1
        AND MONTH(createdAt) = MONTH(DATE_ADD(NOW(), INTERVAL 9 HOUR))
        AND YEAR(createdAt) = YEAR(DATE_ADD(NOW(), INTERVAL 9 HOUR))
    `)

    // 누적 매출
    const [totalSales] = await pool.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total
      FROM Ads_Payment
      WHERE payState = 1
    `)

    // 월별 매출 추이 (최근 6개월)
    const [monthlySales] = await pool.execute(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        SUM(amount) as total
      FROM Ads_Payment
      WHERE payState = 1
        AND createdAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month ASC
    `)

    return NextResponse.json({
      thisMonth: (thisMonthSales as any)[0].total,
      total: (totalSales as any)[0].total,
      monthly: monthlySales
    })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 }
    )
  }
}