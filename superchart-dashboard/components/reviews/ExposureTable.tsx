"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExternalLink, Search, Filter, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface ExposureData {
  id: number
  proposition_id: number
  campaign_name: string
  manager: string | null
  company_name: string | null
  keywords: string | null
  post_link: string
  blogger_id: string | null
  review_registered_at: string
  success_status: 'pending' | 'success' | 'failure'
  first_check_rank: string | null
  second_check_rank: string | null
  feedback: string | null
  created_at: string
  updated_at: string
}

type EditField = 'success_status' | 'first_check_rank' | 'second_check_rank' | 'feedback'

export function ExposureTable() {
  const [data, setData] = useState<ExposureData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [filterManager, setFilterManager] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [managers, setManagers] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  const supabase = createClient()

  // 키워드 포맷팅 함수
  const formatKeywords = (keywords: string | null) => {
    if (!keywords) return '-'
    try {
      const parsed = JSON.parse(keywords)
      if (Array.isArray(parsed)) {
        return parsed.join(', ')
      }
    } catch {
      // JSON이 아닌 경우 특수문자 제거
    }
    return keywords.replace(/[\[\]"]/g, '').trim()
  }

  // 매니저 목록 가져오기
  const fetchManagers = async () => {
    const { data: managerData } = await supabase
      .from('exposure_tracking')
      .select('manager')
      .not('manager', 'is', null)

    if (managerData) {
      const uniqueManagers = [...new Set(managerData.map(item => item.manager).filter(Boolean))]
      setManagers(uniqueManagers as string[])
    }
  }

  // 데이터 가져오기 (검색 및 필터 포함)
  const fetchData = async () => {
    try {
      let query = supabase
        .from('exposure_tracking')
        .select('*', { count: 'exact' })

      // 검색 조건 적용
      if (searchTerm) {
        query = query.or(`campaign_name.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%,blogger_id.ilike.%${searchTerm}%,keywords.ilike.%${searchTerm}%`)
      }

      // 매니저 필터
      if (filterManager !== 'all') {
        query = query.eq('manager', filterManager)
      }

      // 상태 필터
      if (filterStatus !== 'all') {
        query = query.eq('success_status', filterStatus)
      }

      // 날짜 필터
      if (filterDateFrom) {
        query = query.gte('review_registered_at', filterDateFrom)
      }
      if (filterDateTo) {
        const endDate = new Date(filterDateTo)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('review_registered_at', endDate.toISOString())
      }

      // 정렬 및 페이지네이션
      query = query.order('review_registered_at', { ascending: false })

      // 전체 카운트 가져오기
      const { count } = await query

      setTotalCount(count || 0)

      // 페이지네이션된 데이터 가져오기
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data: exposureData, error } = await query.range(from, to)

      if (error) throw error
      setData(exposureData || [])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 데이터 업데이트
  const updateData = async (id: number, field: EditField, value: string) => {
    try {
      const updateObj: any = {}
      updateObj[field] = value || null

      const { error } = await supabase
        .from('exposure_tracking')
        .update(updateObj)
        .eq('id', id)

      if (error) throw error

      // 성공 시 UI 업데이트는 이미 onChange에서 처리되므로 생략
      console.log(`✅ ${field} 업데이트 성공`)
    } catch (error) {
      console.error('업데이트 실패:', error)
      alert('업데이트에 실패했습니다.')
      // 실패 시 원래 데이터로 복구
      fetchData()
    }
  }


  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchData()
  }

  // 필터 리셋
  const resetFilters = () => {
    setSearchTerm('')
    setFilterManager('all')
    setFilterStatus('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setCurrentPage(1)
  }

  // 페이지 변경
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setLoading(true)
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalCount)

  // 페이지 번호 생성
  const pageNumbers = useMemo(() => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }, [currentPage, totalPages])

  useEffect(() => {
    fetchManagers()
  }, [])

  useEffect(() => {
    fetchData()
  }, [currentPage, filterManager, filterStatus, filterDateFrom, filterDateTo])

  // 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel('exposure_tracking_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'exposure_tracking' },
        () => {
          if (currentPage === 1) {
            fetchData()
          } else {
            setCurrentPage(1)
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'exposure_tracking' },
        () => {
          // 다른 사용자의 업데이트를 반영
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentPage])

  if (loading && data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">데이터 로딩 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* 헤더 및 검색 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">상위노출 추적 목록</h2>
            <p className="text-sm text-gray-600 mt-1">
              전체 {totalCount}개 중 {startItem}-{endItem}번째 표시
            </p>
          </div>
        </div>

        {/* 검색바 */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="업체명, 캠페인명, 블로거 ID, 키워드 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            필터
          </button>
        </form>

        {/* 필터 영역 */}
        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* 매니저 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">매니저</label>
                <select
                  value={filterManager}
                  onChange={(e) => setFilterManager(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                >
                  <option value="all">전체</option>
                  {managers.map(manager => (
                    <option key={manager} value={manager}>{manager}</option>
                  ))}
                </select>
              </div>

              {/* 상태 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성공 여부</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                >
                  <option value="all">전체</option>
                  <option value="pending">대기</option>
                  <option value="success">성공</option>
                  <option value="failure">실패</option>
                </select>
              </div>

              {/* 시작 날짜 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작 날짜</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>

              {/* 종료 날짜 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료 날짜</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                필터 초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록 날짜
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매니저
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                업체명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                캠페인명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                블로거 ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                키워드
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                성공 여부
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                포스트 링크
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                1차 순위
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                2차 순위
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                피드백
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className={`hover:bg-gray-50`}>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {new Date(new Date(item.review_registered_at).getTime() + 9 * 60 * 60 * 1000).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {item.manager || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={item.company_name || ''}>
                    {item.company_name || '-'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={item.campaign_name}>
                    {item.campaign_name}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {item.blogger_id || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={formatKeywords(item.keywords)}>
                    {formatKeywords(item.keywords)}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <select
                    value={item.success_status}
                    onChange={(e) => {
                      const newValue = e.target.value as 'pending' | 'success' | 'failure'
                      // 즉시 UI 업데이트
                      setData(prev => prev.map(row => 
                        row.id === item.id 
                          ? { ...row, success_status: newValue }
                          : row
                      ))
                      // DB 업데이트
                      updateData(item.id, 'success_status', newValue)
                    }}
                    className={`block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary cursor-pointer ${
                      item.success_status === 'success' 
                        ? 'bg-green-50 text-green-800 border-green-300'
                        : item.success_status === 'failure'
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    <option value="pending">대기</option>
                    <option value="success">성공</option>
                    <option value="failure">실패</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <a
                    href={item.post_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    <span>보기</span>
                  </a>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <input
                    type="text"
                    value={item.first_check_rank || ''}
                    onChange={(e) => {
                      setData(prev => prev.map(row => 
                        row.id === item.id 
                          ? { ...row, first_check_rank: e.target.value }
                          : row
                      ))
                    }}
                    onBlur={(e) => updateData(item.id, 'first_check_rank', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        updateData(item.id, 'first_check_rank', e.currentTarget.value)
                      }
                    }}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary hover:bg-gray-50"
                    placeholder="-"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <input
                    type="text"
                    value={item.second_check_rank || ''}
                    onChange={(e) => {
                      setData(prev => prev.map(row => 
                        row.id === item.id 
                          ? { ...row, second_check_rank: e.target.value }
                          : row
                      ))
                    }}
                    onBlur={(e) => updateData(item.id, 'second_check_rank', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        updateData(item.id, 'second_check_rank', e.currentTarget.value)
                      }
                    }}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary hover:bg-gray-50"
                    placeholder="-"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <input
                    type="text"
                    value={item.feedback || ''}
                    onChange={(e) => {
                      setData(prev => prev.map(row => 
                        row.id === item.id 
                          ? { ...row, feedback: e.target.value }
                          : row
                      ))
                    }}
                    onBlur={(e) => updateData(item.id, 'feedback', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        updateData(item.id, 'feedback', e.currentTarget.value)
                      }
                    }}
                    className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-primary focus:border-primary hover:bg-gray-50"
                    placeholder="메모 입력"
                    title={item.feedback || ''}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          전체 {totalCount}개 항목
        </div>
        <div className="flex items-center space-x-1">
          {/* 이전 버튼 */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* 첫 페이지 */}
          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-1 text-sm rounded-md hover:bg-gray-100"
              >
                1
              </button>
              {pageNumbers[0] > 2 && <span className="px-2">...</span>}
            </>
          )}

          {/* 페이지 번호들 */}
          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 text-sm rounded-md ${
                page === currentPage 
                  ? 'bg-primary text-white' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}

          {/* 마지막 페이지 */}
          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-2">...</span>}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1 text-sm rounded-md hover:bg-gray-100"
              >
                {totalPages}
              </button>
            </>
          )}

          {/* 다음 버튼 */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}