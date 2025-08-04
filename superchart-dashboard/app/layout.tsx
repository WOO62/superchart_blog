import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '슈퍼차트 대시보드',
  description: '슈퍼차트 비즈니스 대시보드',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Sidebar />
        <main className="ml-16 min-h-screen bg-gray-50 transition-all duration-300">
          <div className="p-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}