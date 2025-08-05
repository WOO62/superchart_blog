import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { id, field, value } = await request.json()

    if (!id || !field) {
      return NextResponse.json(
        { error: 'ID와 필드명이 필요합니다.' },
        { status: 400 }
      )
    }

    // 서버 측에서는 Service Role Key 사용
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updateObj: any = {}
    updateObj[field] = value || null

    const { data, error } = await supabase
      .from('exposure_tracking')
      .update(updateObj)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase 업데이트 에러:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API 에러:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}