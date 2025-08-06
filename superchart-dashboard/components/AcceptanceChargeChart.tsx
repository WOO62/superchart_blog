'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// 색상 팔레트 정의
const COLORS: { [key: string]: string } = {
  'salt': '#EF4444', // 빨간색
  'yuzu': '#3B82F6', // 파란색
  'kelly': '#10B981', // 초록색
  'mj': '#F59E0B', // 주황색
  'ruby': '#8B5CF6', // 보라색
  '미지정': '#9CA3AF', // 연한 회색
  'default': '#6B7280' // 회색
}

export default function AcceptanceChargeChart() {
  const [data, setData] = useState<any[]>([])
  const [managers, setManagers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/charts')
        const result = await response.json()
        setData(result.managerChargeData || [])
        
        // 0원이 아닌 데이터가 있는 매니저만 필터링
        const activeManagers = result.managers?.filter((manager: string) => {
          return result.managerChargeData?.some((month: any) => month[manager] > 0)
        }) || []
        
        setManagers(activeManagers)
      } catch (error) {
        console.error('차트 데이터 조회 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">월별 매니저 충전 금액</h3>
        <div className="animate-pulse bg-gray-200 h-80 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">월별 매니저 충전 금액</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            tickFormatter={(value) => {
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(0)}M`
              }
              return `${(value / 1000).toFixed(0)}K`
            }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                // 0원이 아닌 데이터만 필터링
                const nonZeroPayload = payload.filter((p: any) => p.value > 0)
                
                if (nonZeroPayload.length === 0) return null
                
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded shadow">
                    <p className="text-sm font-medium">{label}</p>
                    {nonZeroPayload.map((entry: any) => (
                      <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
                        {entry.dataKey}: ₩{new Intl.NumberFormat('ko-KR').format(entry.value)}
                      </p>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          <Legend />
          {managers.map((manager) => (
            <Line 
              key={manager}
              type="monotone" 
              dataKey={manager} 
              stroke={COLORS[manager] || COLORS.default} 
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}