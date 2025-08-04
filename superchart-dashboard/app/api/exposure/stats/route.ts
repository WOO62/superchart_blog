import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    
    // 현재 날짜 정보 (한국 시간 기준)
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
    const kstNow = new Date(now.getTime() + kstOffset)
    
    // 오늘 시작 시간 (KST 00:00:00)
    const todayKST = new Date(kstNow)
    todayKST.setHours(0, 0, 0, 0)
    const todayUTC = new Date(todayKST.getTime() - kstOffset)
    
    // 이번 달 시작 시간 (KST 기준)
    const thisMonthKST = new Date(kstNow.getFullYear(), kstNow.getMonth(), 1)
    const thisMonthUTC = new Date(thisMonthKST.getTime() - kstOffset)
    
    console.log('Today UTC:', todayUTC.toISOString())
    console.log('This Month UTC:', thisMonthUTC.toISOString())
    
    // 오늘 등록된 리뷰 수
    const { count: todayCount, error: todayError } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true })
      .gte('review_registered_at', todayUTC.toISOString())
    
    if (todayError) console.error('Today count error:', todayError)
    
    // 이번 달 총 발행 수
    const { count: monthCount, error: monthError } = await supabase
      .from('exposure_tracking')
      .select('*', { count: 'exact', head: true })
      .gte('review_registered_at', thisMonthUTC.toISOString())
    
    if (monthError) console.error('Month count error:', monthError)
    
    // 매니저별 이번 달 통계
    const { data: monthlyManagerStats, error: monthlyError } = await supabase
      .from('exposure_tracking')
      .select('manager, success_status')
      .gte('review_registered_at', thisMonthUTC.toISOString())
    
    if (monthlyError) console.error('Monthly stats error:', monthlyError)
    
    // 매니저별 전체 통계
    const { data: totalManagerStats, error: totalError } = await supabase
      .from('exposure_tracking')
      .select('manager, success_status')
    
    if (totalError) console.error('Total stats error:', totalError)
    
    // 매니저별 통계 계산
    const calculateManagerStats = (data: any[]) => {
      const stats: any = {}
      
      data?.forEach(item => {
        const manager = item.manager || '미지정'
        if (!stats[manager]) {
          stats[manager] = {
            total: 0,
            success: 0,
            failure: 0,
            pending: 0
          }
        }
        
        stats[manager].total++
        if (item.success_status === 'success') {
          stats[manager].success++
        } else if (item.success_status === 'failure') {
          stats[manager].failure++
        } else {
          stats[manager].pending++
        }
      })
      
      // 성공률 계산
      Object.keys(stats).forEach(manager => {
        const successRate = stats[manager].total > 0 
          ? ((stats[manager].success / stats[manager].total) * 100).toFixed(1)
          : '0.0'
        stats[manager].successRate = successRate
      })
      
      return stats
    }
    
    const monthlyStats = calculateManagerStats(monthlyManagerStats || [])
    const totalStats = calculateManagerStats(totalManagerStats || [])
    
    // 최근 6개월 월별 통계 가져오기
    const monthlyBreakdown: any = {}
    
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(kstNow)
      monthDate.setMonth(monthDate.getMonth() - i)
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999)
      
      const monthStartUTC = new Date(monthStart.getTime() - kstOffset)
      const monthEndUTC = new Date(monthEnd.getTime() - kstOffset)
      
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`
      
      const { data: monthData } = await supabase
        .from('exposure_tracking')
        .select('manager, success_status')
        .gte('review_registered_at', monthStartUTC.toISOString())
        .lte('review_registered_at', monthEndUTC.toISOString())
      
      const monthStats = calculateManagerStats(monthData || [])
      
      monthlyBreakdown[monthKey] = {
        label: monthLabel,
        stats: monthStats
      }
    }
    
    console.log('Stats calculated:', {
      today: todayCount || 0,
      thisMonth: monthCount || 0,
      monthlyManagers: Object.keys(monthlyStats).length,
      totalManagers: Object.keys(totalStats).length,
      monthlyBreakdown: Object.keys(monthlyBreakdown).length
    })
    
    return NextResponse.json({
      today: todayCount || 0,
      thisMonth: monthCount || 0,
      monthlyManagerStats: monthlyStats,
      totalManagerStats: totalStats,
      monthlyBreakdown: monthlyBreakdown
    })
  } catch (error) {
    console.error('통계 조회 실패:', error)
    return NextResponse.json(
      { error: '통계 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}