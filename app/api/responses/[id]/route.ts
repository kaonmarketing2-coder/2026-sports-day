import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const pwd = req.headers.get('x-admin-password')
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
  }
  const { id } = await ctx.params
  const { error } = await supabase.from('survey_responses').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
