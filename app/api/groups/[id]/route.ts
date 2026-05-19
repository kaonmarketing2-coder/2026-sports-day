import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const pwd = req.headers.get('x-admin-password')
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
  }

  const { id } = await ctx.params
  const { name } = await req.json()

  if (!name || !name.trim()) {
    return Response.json({ error: '조 이름을 입력해 주세요' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('groups')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
