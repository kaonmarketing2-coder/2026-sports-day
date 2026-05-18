import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
}
