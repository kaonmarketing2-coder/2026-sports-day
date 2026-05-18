import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const pwd = req.headers.get('x-admin-password')
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
