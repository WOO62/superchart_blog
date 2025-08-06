'use client'

import { useEffect, useState } from 'react'

interface ManagerStat {
  manager: string
  acceptanceAmount: number
  chargeAmount: number
}

export default function ManagerStatsCard() {
  const [managers, setManagers] = useState<ManagerStat[]>([])
  const [loading, setLoading] = useState(true)

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
      <h3 className="text-lg font-semibold mb-4">매니저별 금액 현황 (이번 달)</h3>
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
    </div>
  )
}