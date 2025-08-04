"use client"

import { useEffect, useState } from 'react'
import { Clock, User, Link as LinkIcon, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Review {
  id: number
  cname: string
  review: string
  reviewRegisteredAt: string
  outerId: string
  manager: string
  status?: 'new' | 'processed'
}

export function ReviewMonitor() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // 임시 데이터
  useEffect(() => {
    const mockReviews: Review[] = [
      {
        id: 10003001,
        cname: '하기스 기저귀 캠페인',
        review: 'https://blog.naver.com/example1',
        reviewRegisteredAt: new Date().toISOString(),
        outerId: 'blogger123',
        manager: '김매니저',
        status: 'new'
      },
      {
        id: 10003002,
        cname: '바렌 풋샴푸',
        review: 'https://blog.naver.com/example2',
        reviewRegisteredAt: new Date(Date.now() - 3600000).toISOString(),
        outerId: 'blogger456',
        manager: '이매니저',
        status: 'processed'
      },
      {
        id: 10003003,
        cname: '미리캔버스 프로모션',
        review: 'https://blog.naver.com/example3',
        reviewRegisteredAt: new Date(Date.now() - 7200000).toISOString(),
        outerId: 'blogger789',
        manager: '박매니저',
        status: 'processed'
      },
    ]

    setTimeout(() => {
      setReviews(mockReviews)
      setLastUpdated(new Date())
      setLoading(false)
    }, 1000)

    // 실제로는 주기적으로 업데이트
    const interval = setInterval(() => {
      setLastUpdated(new Date())
      // 여기서 API 호출하여 새 리뷰 가져오기
    }, 120000) // 2분마다

    return () => clearInterval(interval)
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    return `${days}일 전`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">실시간 리뷰 모니터링</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {lastUpdated && (
            <span>마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>새로운 리뷰가 없습니다</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={cn(
                "border rounded-lg p-4 transition-all",
                review.status === 'new' 
                  ? "border-primary bg-primary/5 shadow-md" 
                  : "border-gray-200 hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {review.status === 'new' && (
                      <span className="px-2 py-1 bg-primary text-white text-xs rounded-full font-medium">
                        NEW
                      </span>
                    )}
                    <h3 className="font-semibold text-gray-900">{review.cname}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{review.outerId}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <span className="font-medium">매니저:</span>
                      <span>{review.manager}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(review.reviewRegisteredAt)}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <a
                      href={review.review}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      <LinkIcon className="h-4 w-4" />
                      리뷰 보기
                    </a>
                  </div>
                </div>

                <div className="ml-4">
                  {review.status === 'processed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="animate-pulse">
                      <div className="h-5 w-5 bg-primary rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}