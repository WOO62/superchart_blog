import { NextRequest, NextResponse } from 'next/server'
import { getConnection } from '@/lib/mysql'

export async function GET(request: NextRequest) {
  try {
    const pool = await getConnection()
    
    // 최근 리뷰 조회
    const [reviews] = await pool.execute(`
      SELECT 
        p.id,
        p.cname,
        p.review,
        p.reviewRegisteredAt,
        p.uid,
        u.outerId,
        comp.manager
      FROM Propositions p
      LEFT JOIN Users u ON p.uid = u.uid
      LEFT JOIN Campaigns c ON p.campaignId = c.id
      LEFT JOIN Companies comp ON c.companyId = comp.id
      WHERE p.review IS NOT NULL 
        AND p.review != ''
        AND p.reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 24 HOUR)
        AND p.reviewRegisteredAt <= DATE_ADD(NOW(), INTERVAL 9 HOUR)
      ORDER BY p.reviewRegisteredAt DESC
      LIMIT 20
    `)

    // 통계 조회
    const [todayCount] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM Propositions
      WHERE review IS NOT NULL 
        AND review != ''
        AND DATE(reviewRegisteredAt) = DATE(DATE_ADD(NOW(), INTERVAL 9 HOUR))
    `)

    const [weekCount] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM Propositions
      WHERE review IS NOT NULL 
        AND review != ''
        AND reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 7 DAY)
    `)

    const [monthCount] = await pool.execute(`
      SELECT COUNT(*) as count
      FROM Propositions
      WHERE review IS NOT NULL 
        AND review != ''
        AND reviewRegisteredAt > DATE_SUB(DATE_ADD(NOW(), INTERVAL 9 HOUR), INTERVAL 30 DAY)
    `)

    return NextResponse.json({
      reviews,
      stats: {
        todayCount: (todayCount as any)[0].count,
        weekCount: (weekCount as any)[0].count,
        monthCount: (monthCount as any)[0].count,
      }
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}