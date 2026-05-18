import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { DEFAULT_QUESTIONS } from '@/lib/seed-questions'

async function seedIfEmpty() {
  const { count } = await supabase
    .from('survey_questions')
    .select('*', { count: 'exact', head: true })

  if (count === 0) {
    await supabase.from('survey_questions').insert(DEFAULT_QUESTIONS)
  }
}

export async function GET(req: NextRequest) {
  const isAdmin = req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD

  await seedIfEmpty()

  const query = supabase
    .from('survey_questions')
    .select('*')
    .order('sort_order', { ascending: true })

  if (!isAdmin) {
    query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}

export async function POST(req: NextRequest) {
  const pwd = req.headers.get('x-admin-password')
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
  }

  const body = await req.json()

  // Get max sort_order
  const { data: maxRow } = await supabase
    .from('survey_questions')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sort_order = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('survey_questions')
    .insert([{ ...body, sort_order }])
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
