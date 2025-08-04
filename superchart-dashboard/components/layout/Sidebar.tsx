"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  TrendingUp,
  ChevronRight,
  BarChart3,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: '대시보드',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    title: '상위노출 대시보드',
    icon: TrendingUp,
    href: '/reviews',
  },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-200">
        {isExpanded ? (
          <h1 className="text-xl font-bold text-primary">슈퍼차트</h1>
        ) : (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-gray-100",
                isActive && "bg-primary/10 text-primary hover:bg-primary/20",
                !isExpanded && "justify-center"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {isExpanded && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {isExpanded ? (
          <div className="text-xs text-gray-500">
            <p className="font-semibold">슈퍼차트 대시보드</p>
            <p>v1.0.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
        )}
      </div>
    </aside>
  )
}