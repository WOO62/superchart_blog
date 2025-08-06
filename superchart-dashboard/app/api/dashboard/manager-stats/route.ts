import { NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

export async function GET(request: Request) {
  let connection
  
  // URL 파라미터에서 월 정보 가져오기
  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')

  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    })

    // 요청된 년월 또는 이번 달 시작일
    const now = new Date()
    const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear()
    const targetMonth = monthParam ? parseInt(monthParam) - 1 : now.getMonth()
    
    const thisMonthStart = new Date(targetYear, targetMonth, 1)
    const nextMonthStart = new Date(targetYear, targetMonth + 1, 1)

    // 매니저별 수락금액 (이번 달)
    const [acceptanceRows] = await connection.execute<any[]>(`
      SELECT 
        CASE 
          WHEN comp.manager IS NULL OR comp.manager = '' THEN '미지정'
          WHEN comp.manager LIKE '%salt%' THEN 'salt'
          ELSE comp.manager
        END as manager,
        SUM(p.point) as acceptanceAmount
      FROM Propositions p
      JOIN Campaigns c ON p.campaignId = c.id
      JOIN Companies comp ON c.companyId = comp.id
      WHERE p.status IN (2, 10, 12, 20, 22, 24, 30, 32, 40)
        AND p.createdAt >= ?
        AND p.createdAt < ?
      GROUP BY 
        CASE 
          WHEN comp.manager IS NULL OR comp.manager = '' THEN '미지정'
          WHEN comp.manager LIKE '%salt%' THEN 'salt'
          ELSE comp.manager
        END
    `, [thisMonthStart, nextMonthStart])

    // 매니저별 충전금액 (이번 달)
    const [chargeRows] = await connection.execute<any[]>(`
      SELECT 
        CASE 
          WHEN comp.manager IS NULL OR comp.manager = '' THEN '미지정'
          WHEN comp.manager LIKE '%salt%' THEN 'salt'
          ELSE comp.manager
        END as manager,
        SUM(ch.amount) as chargeAmount
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
    `, [thisMonthStart, nextMonthStart])

    // 매니저별 데이터 병합
    const managerMap = new Map()
    
    acceptanceRows.forEach(row => {
      managerMap.set(row.manager, {
        manager: row.manager,
        acceptanceAmount: row.acceptanceAmount || 0,
        chargeAmount: 0
      })
    })

    chargeRows.forEach(row => {
      if (managerMap.has(row.manager)) {
        managerMap.get(row.manager).chargeAmount = row.chargeAmount || 0
      } else {
        managerMap.set(row.manager, {
          manager: row.manager,
          acceptanceAmount: 0,
          chargeAmount: row.chargeAmount || 0
        })
      }
    })

    const managerStats = Array.from(managerMap.values())
      .sort((a, b) => {
        // salt를 최우선으로
        if (a.manager === 'salt') return -1
        if (b.manager === 'salt') return 1
        // 미지정은 마지막으로
        if (a.manager === '미지정') return 1
        if (b.manager === '미지정') return -1
        // 그 다음은 총 금액순
        return (b.acceptanceAmount + b.chargeAmount) - (a.acceptanceAmount + a.chargeAmount)
      })

    return NextResponse.json({ managerStats })

  } catch (error) {
    console.error('Manager stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch manager stats' }, { status: 500 })
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}