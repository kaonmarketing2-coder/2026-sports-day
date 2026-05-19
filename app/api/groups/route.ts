import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, created_at')
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
