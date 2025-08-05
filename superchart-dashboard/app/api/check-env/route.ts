import { NextResponse } from 'next/server'

export async function GET() {
  // 보안을 위해 실제 값은 마스킹
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 없음',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 설정됨' : '❌ 없음',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ? '✅ Vercel 환경' : '❌ 로컬 환경',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
  }

  return NextResponse.json(envCheck)
}