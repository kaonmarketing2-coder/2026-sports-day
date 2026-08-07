import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { QuestionType } from '@/lib/types'

const VALID_TYPES: QuestionType[] = [
  'scale', 'text', 'textarea', 'radio', 'checkbox', 'matrix', 'conditional', 'photo',
]

type ImportRow = {
  section_label?: string
  question_text?: string
  question_type?: string
  options?: unknown
  config?: unknown
  is_active?: boolean
}

function validateRows(rows: unknown): string | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'JSON 파일은 문항 배열이어야 합니다.'
  }
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as ImportRow
    if (typeof row !== 'object' || row === null) {
      return `${i + 1}번째 항목이 올바른 객체가 아닙니다.`
    }
    if (!row.question_text || typeof row.question_text !== 'string') {
      return `${i + 1}번째 항목에 question_text가 없습니다.`
    }
    if (!row.question_type || !VALID_TYPES.includes(row.question_type as QuestionType)) {
      return `${i + 1}번째 항목의 question_type이 올바르지 않습니다. (${VALID_TYPES.join(', ')} 중 하나)`
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const pwd = req.headers.get('x-admin-password')
  if (pwd !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: '비밀번호가 틀렸습니다' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '올바른 JSON 형식이 아닙니다.' }, { status: 400 })
  }

  const rows = (body as { questions?: unknown })?.questions ?? body
  const validationError = validateRows(rows)
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 })
  }

  const { data: maxRow } = await supabase
    .from('survey_questions')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  let nextSortOrder = (maxRow?.sort_order ?? 0) + 1

  const toInsert = (rows as ImportRow[]).map(row => ({
    section_label: row.section_label ?? '',
    question_text: row.question_text,
    question_type: row.question_type,
    options: row.options ?? [],
    config: row.config ?? {},
    is_active: row.is_active ?? true,
    sort_order: nextSortOrder++,
  }))

  const { data, error } = await supabase
    .from('survey_questions')
    .insert(toInsert)
    .select()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ data })
}
