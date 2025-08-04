"use client"

import { useEffect, useState } from 'react'
import { SalesCard } from '@/components/dashboard/SalesCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { VolumeChart } from '@/components/dashboard/VolumeChart'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState({
    thisMonth: 0,
    total: 0,
    superchartTotal: 0,
    thisMonthChange: 0,
    totalChange: 0,
    superchartChange: 0,
  })

  // 임시 데이터 (나중에 API에서 가져올 예정)
  const chartData = [
    { date: '1월', 매출: 12000000, 슈퍼차트매출: 3000000 },
    { date: '2월', 매출: 19000000, 슈퍼차트매출: 4500000 },
    { date: '3월', 매출: 15000000, 슈퍼차트매출: 3800000 },
    { date: '4월', 매출: 25000000, 슈퍼차트매출: 6200000 },
    { date: '5월', 매출: 22000000, 슈퍼차트매출: 5500000 },
    { date: '6월', 매출: 30000000, 슈퍼차트매출: 7500000 },
    { date: '7월', 매출: 28000000, 슈퍼차트매출: 7000000 },
    { date: '8월', 매출: 32000000, 슈퍼차트매출: 8000000 },
  ]

  const volumeData = [
    { date: '1월', 발행량: 120 },
    { date: '2월', 발행량: 190 },
    { date: '3월', 발행량: 150 },
    { date: '4월', 발행량: 250 },
    { date: '5월', 발행량: 220 },
    { date: '6월', 발행량: 300 },
    { date: '7월', 발행량: 280 },
    { date: '8월', 발행량: 320 },
  ]

  useEffect(() => {
    // 임시로 로딩 시뮬레이션
    setTimeout(() => {
      setSalesData({
        thisMonth: 32000000,
        total: 183000000,
        superchartTotal: 45000000,
        thisMonthChange: 14.3,
        totalChange: 23.5,
        superchartChange: 18.7,
      })
      setLoading(false)
    }, 1000)
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-2">비즈니스 현황을 한눈에 확인하세요</p>
      </div>

      {/* Sales Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SalesCard
          title="이번 달 매출"
          value={salesData.thisMonth}
          change={salesData.thisMonthChange}
          icon={<Calendar className="h-6 w-6 text-primary" />}
          loading={loading}
        />
        <SalesCard
          title="누적 매출"
          value={salesData.total}
          change={salesData.totalChange}
          changeLabel="전년 대비"
          icon={<TrendingUp className="h-6 w-6 text-primary" />}
          loading={loading}
        />
        <SalesCard
          title="슈퍼차트 매출"
          value={salesData.superchartTotal}
          change={salesData.superchartChange}
          changeLabel="전년 대비"
          icon={<DollarSign className="h-6 w-6 text-primary" />}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={chartData} loading={loading} />
        <VolumeChart data={volumeData} loading={loading} />
      </div>
    </div>
  )
}