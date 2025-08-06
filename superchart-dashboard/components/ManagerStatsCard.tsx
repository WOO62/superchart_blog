'use client'

import { useEffect, useState } from 'react'

interface ManagerStat {
  manager: string
  acceptanceAmount: number
  chargeAmount: number
}

interface MonthlyStats {
  year: number
  month: number
  stats: ManagerStat[]
}

export default function ManagerStatsCard() {
  const [managers, setManagers] = useState<ManagerStat[]>([])
  const [pastStats, setPastStats] = useState<MonthlyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [loadingPast, setLoadingPast] = useState(false)

  useEffect(() => {
    const fetchManagerStats = async () => {
      try {
        const response = await fetch('/api/dashboard/manager-stats')
        const data = await response.json()
        setManagers(data.managerStats || [])
      } catch (error) {
        console.error('매니저 통계 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchManagerStats()
  }, [])

  // 과거 데이터 가져오기
  const fetchPastStats = async () => {
    setLoadingPast(true)
    try {
      const stats: MonthlyStats[] = []
      const now = new Date()
      
      // 최근 6개월 데이터 가져오기
      for (let i = 1; i <= 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const response = await fetch(`/api/dashboard/manager-stats?year=${date.getFullYear()}&month=${date.getMonth() + 1}`)
        const data = await response.json()
        
        if (data.managerStats && data.managerStats.length > 0) {
          stats.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            stats: data.managerStats
          })
        }
      }
      
      setPastStats(stats)
    } catch (error) {
      console.error('과거 통계 조회 오류:', error)
    } finally {
      setLoadingPast(false)
    }
  }

  // 지난 금액 현황 토글
  const togglePastStats = () => {
    if (!showPast && pastStats.length === 0 && !loadingPast) {
      fetchPastStats()
    }
    setShowPast(!showPast)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value)
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">매니저별 금액 현황</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">매니저별 금액 현황 (이번 달)</h3>
        <button
          onClick={togglePastStats}
          className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          {showPast ? '접기 ▲' : '지난 금액 현황 ▼'}
        </button>
      </div>
      <div className="space-y-4">
        {managers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">데이터가 없습니다</p>
        ) : (
          managers.map((manager) => {
            const total = Number(manager.acceptanceAmount) + Number(manager.chargeAmount)
            const acceptanceRatio = total > 0 ? (Number(manager.acceptanceAmount) / total) * 100 : 0
            
            return (
              <div key={manager.manager} className="border rounded-lg p-4">
                <div className="mb-2">
                  <h4 className="font-medium text-gray-900 text-lg">{manager.manager}</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">수락금액</span>
                      <span className="font-medium">₩{formatCurrency(manager.acceptanceAmount)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">충전금액</span>
                      <span className="font-medium">₩{formatCurrency(manager.chargeAmount)}</span>
                    </div>
                  </div>
                </div>
                
                {/* 비율 바 */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-blue-500"
                        style={{ width: `${acceptanceRatio}%` }}
                      />
                      <div 
                        className="bg-green-500"
                        style={{ width: `${100 - acceptanceRatio}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>수락 {acceptanceRatio.toFixed(1)}%</span>
                    <span>충전 {(100 - acceptanceRatio).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 과거 데이터 표시 */}
      {showPast && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-md font-semibold mb-4 text-gray-700">지난 금액 현황</h4>
          {loadingPast ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : pastStats.length === 0 ? (
            <p className="text-gray-500 text-center py-4">과거 데이터가 없습니다</p>
          ) : (
            <div className="space-y-6">
              {pastStats.map((monthData) => (
                <div key={`${monthData.year}-${monthData.month}`} className="border rounded-lg p-4 bg-gray-50">
                  <h5 className="font-medium text-gray-700 mb-3">
                    {monthData.year}년 {monthData.month}월
                  </h5>
                  <div className="space-y-3">
                    {monthData.stats.map((manager) => {
                      const total = Number(manager.acceptanceAmount) + Number(manager.chargeAmount)
                      const acceptanceRatio = total > 0 ? (Number(manager.acceptanceAmount) / total) * 100 : 0
                      
                      return (
                        <div key={manager.manager} className="bg-white rounded p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-800">{manager.manager}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">수락: </span>
                              <span className="font-medium">₩{formatCurrency(manager.acceptanceAmount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">충전: </span>
                              <span className="font-medium">₩{formatCurrency(manager.chargeAmount)}</span>
                            </div>
                          </div>
                          
                          {/* 간단한 비율 바 */}
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full flex">
                                <div 
                                  className="bg-blue-400"
                                  style={{ width: `${acceptanceRatio}%` }}
                                />
                                <div 
                                  className="bg-green-400"
                                  style={{ width: `${100 - acceptanceRatio}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}