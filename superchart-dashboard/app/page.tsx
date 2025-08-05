"use client"

import { useEffect, useState } from 'react'
import { SalesCard } from '@/components/dashboard/SalesCard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { VolumeChart } from '@/components/dashboard/VolumeChart'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [statsData, setStatsData] = useState({
    thisMonthBlog: 0,
    thisMonthBlogChange: 0,
    totalBlog: 0,
    totalBlogChange: 0,
    thisMonthSuperchart: 0,
    thisMonthSuperchartChange: 0,
  })
  const [chartData, setChartData] = useState([])
  const [volumeData, setVolumeData] = useState([])

  // 통계 데이터 가져오기
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('통계 API 오류:', data)
        throw new Error(data.error || '통계 데이터 로드 실패')
      }
      
      setStatsData(data)
    } catch (error) {
      console.error('통계 데이터 로드 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 차트 데이터 가져오기
  const fetchCharts = async () => {
    try {
      const response = await fetch('/api/dashboard/charts')
      const data = await response.json()
      
      if (!response.ok) {
        console.error('차트 API 오류:', data)
        throw new Error(data.error || '차트 데이터 로드 실패')
      }
      
      setChartData(data.salesData || [])
      setVolumeData(data.volumeData || [])
    } catch (error) {
      console.error('차트 데이터 로드 오류:', error)
    } finally {
      setChartLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchCharts()
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
          title="이번 달 블로그 매출"
          value={statsData.thisMonthBlog}
          change={statsData.thisMonthBlogChange}
          icon={<Calendar className="h-6 w-6 text-primary" />}
          loading={loading}
        />
        <SalesCard
          title="올해 블로그 매출"
          value={statsData.totalBlog}
          change={statsData.totalBlogChange}
          changeLabel="전년 대비"
          icon={<TrendingUp className="h-6 w-6 text-primary" />}
          loading={loading}
        />
        <SalesCard
          title="이번 달 슈퍼차트 매출"
          value={statsData.thisMonthSuperchart}
          change={statsData.thisMonthSuperchartChange}
          icon={<DollarSign className="h-6 w-6 text-primary" />}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={chartData} loading={chartLoading} />
        <VolumeChart data={volumeData} loading={chartLoading} />
      </div>
    </div>
  )
}