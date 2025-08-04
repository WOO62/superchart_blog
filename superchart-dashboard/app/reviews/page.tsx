import { ExposureTable } from '@/components/reviews/ExposureTable'
import { ExposureStats } from '@/components/reviews/ExposureStats'

export default function ReviewsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">상위노출 대시보드</h1>
        <p className="text-gray-600 mt-2">네이버 블로그 상위노출 성과를 추적하고 관리합니다</p>
      </div>

      {/* Stats Cards */}
      <ExposureStats />

      {/* Exposure Table */}
      <ExposureTable />
    </div>
  )
}