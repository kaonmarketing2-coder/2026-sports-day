import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { error } = await supabase
    .from('survey_responses')
    .insert([{ answers: body.answers }])
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
