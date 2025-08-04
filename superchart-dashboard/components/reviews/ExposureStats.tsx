"use client"

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Calendar, Award, Activity, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react'

interface ManagerStats {
  total: number
  success: number
  failure: number
  pending: number
  successRate: string
}

interface MonthlyData {
  label: string
  stats: Record<string, ManagerStats>
}

interface StatsData {
  today: number
  thisMonth: number
  monthlyManagerStats: Record<string, ManagerStats>
  totalManagerStats: Record<string, ManagerStats>
  monthlyBreakdown?: Record<string, MonthlyData>
}

export function ExposureStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/exposure/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('통계 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // 30초마다 자동 새로고침
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  // 매니저 목록 정렬 (발행 수 기준)
  const sortedMonthlyManagers = Object.entries(stats.monthlyManagerStats || {})
    .sort(([, a], [, b]) => b.total - a.total)
  
  const sortedTotalManagers = Object.entries(stats.totalManagerStats || {})
    .sort(([, a], [, b]) => b.total - a.total)

  return (
    <div className="space-y-6 mb-6">
      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">오늘 등록</p>
              <p className="text-3xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">이번 달 발행</p>
              <p className="text-3xl font-bold text-gray-900">{stats.thisMonth}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 매니저별 이번 달 통계 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <Users className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">매니저별 이번 달 실적</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">매니저</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">발행</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">성공</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">실패</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">대기</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">성공률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedMonthlyManagers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    이번 달 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedMonthlyManagers.map(([manager, data]) => (
                <tr key={manager} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{manager}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900">{data.total}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="text-green-600 font-medium">{data.success}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="text-red-600 font-medium">{data.failure}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="text-gray-600">{data.pending}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(data.successRate) >= 80 ? 'bg-green-100 text-green-800' :
                        parseFloat(data.successRate) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {data.successRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
        
        {/* 월별 실적 토글 버튼 */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {showMonthlyBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <CalendarDays className="h-4 w-4" />
            월별 실적 보기
          </button>
        </div>
      </div>

      {/* 월별 실적 (접을 수 있는 섹션) */}
      {showMonthlyBreakdown && stats.monthlyBreakdown && (
        <div className="bg-white rounded-lg shadow-sm p-6 transition-all duration-300">
          <div className="flex items-center mb-4">
            <CalendarDays className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">최근 6개월 월별 실적</h3>
          </div>
          
          <div className="space-y-4">
            {Object.entries(stats.monthlyBreakdown)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([monthKey, monthData]) => {
                const sortedManagers = Object.entries(monthData.stats || {})
                  .sort(([, a], [, b]) => b.total - a.total)
                
                return (
                  <div key={monthKey} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{monthData.label}</h4>
                    
                    {sortedManagers.length === 0 ? (
                      <p className="text-sm text-gray-500">해당 월 데이터가 없습니다.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">매니저</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">발행</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">성공</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">실패</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">대기</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">성공률</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {sortedManagers.map(([manager, data]) => (
                              <tr key={manager} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm font-medium text-gray-900">{manager}</td>
                                <td className="px-3 py-2 text-sm text-center">{data.total}</td>
                                <td className="px-3 py-2 text-sm text-center text-green-600">{data.success}</td>
                                <td className="px-3 py-2 text-sm text-center text-red-600">{data.failure}</td>
                                <td className="px-3 py-2 text-sm text-center text-gray-600">{data.pending}</td>
                                <td className="px-3 py-2 text-sm text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    parseFloat(data.successRate) >= 80 ? 'bg-green-100 text-green-800' :
                                    parseFloat(data.successRate) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {data.successRate}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* 매니저별 전체 통계 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <Award className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">매니저별 전체 누적 실적</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">매니저</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">총 발행</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">총 성공</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">총 실패</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">대기중</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">성공률</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedTotalManagers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedTotalManagers.map(([manager, data]) => (
                <tr key={manager} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{manager}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="font-semibold text-gray-900">{data.total}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="text-green-600 font-medium">{data.success}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="text-red-600 font-medium">{data.failure}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="text-gray-600">{data.pending}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(data.successRate) >= 80 ? 'bg-green-100 text-green-800' :
                        parseFloat(data.successRate) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {data.successRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <Activity className={`h-4 w-4 inline ${
                      data.total >= 100 ? 'text-green-500' :
                      data.total >= 50 ? 'text-yellow-500' :
                      'text-gray-400'
                    }`} />
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>

        {/* 범례 */}
        <div className="mt-4 flex items-center justify-end space-x-4 text-xs text-gray-500">
          <div className="flex items-center">
            <Activity className="h-3 w-3 text-green-500 mr-1" />
            <span>100+ 발행</span>
          </div>
          <div className="flex items-center">
            <Activity className="h-3 w-3 text-yellow-500 mr-1" />
            <span>50-99 발행</span>
          </div>
          <div className="flex items-center">
            <Activity className="h-3 w-3 text-gray-400 mr-1" />
            <span>50 미만</span>
          </div>
        </div>
      </div>
    </div>
  )
}