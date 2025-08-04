import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface SalesCardProps {
  title: string
  value: number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  loading?: boolean
}

export function SalesCard({ 
  title, 
  value, 
  change, 
  changeLabel = '전월 대비',
  icon,
  loading = false 
}: SalesCardProps) {
  const isPositive = change && change > 0

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(value)}
          </p>
          {change !== undefined && (
            <div className="flex items-center mt-2 text-sm">
              {isPositive ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={cn(
                "font-medium",
                isPositive ? "text-green-500" : "text-red-500"
              )}>
                {Math.abs(change)}%
              </span>
              <span className="text-gray-500 ml-1">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary/10 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}