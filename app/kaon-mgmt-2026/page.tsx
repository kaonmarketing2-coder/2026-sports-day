'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Question, SurveyResponseRow, SurveyAnswers, AnswerValue, MatrixItem, ConditionalAnswer, QuestionType } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function avgOfScores(responses: SurveyResponseRow[], qid: string): number {
  const vals = responses
    .map(r => r.answers[qid])
    .filter((v): v is number => typeof v === 'number' && v > 0)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function countOptions(
  responses: SurveyResponseRow[],
  qid: string,
  options: string[]
): Record<string, number> {
  const map: Record<string, number> = {}
  options.forEach(o => { map[o] = 0 })
  responses.forEach(r => {
    const v = r.answers[qid]
    if (Array.isArray(v)) {
      v.forEach(item => {
        if (typeof item === 'string' && item in map) map[item]++
      })
    } else if (typeof v === 'string' && v in map) {
      map[v]++
    }
  })
  return map
}

function matrixAvg(responses: SurveyResponseRow[], qid: string, key: string): number {
  const vals = responses
    .map(r => {
      const v = r.answers[qid]
      if (v && typeof v === 'object' && !Array.isArray(v) && 'used' in (v as object) === false) {
        return (v as Record<string, number>)[key]
      }
      return undefined
    })
    .filter((v): v is number => typeof v === 'number' && v > 0)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function StarBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#1d4ed8' }} />
      </div>
      <span className="text-sm font-bold text-blue-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function CountBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? (count / total) * 100 : 0
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium truncate max-w-[60%]">{label}</span>
        <span>{count}명 ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3b82f6' }} />
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
      <h3 className="font-bold text-gray-700 text-sm mb-4 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 w-44 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium break-words">{value}</span>
    </div>
  )
}

// ── Response modal ────────────────────────────────────────────────────────────

function ResponseModal({
  r,
  questions,
  onClose,
}: {
  r: SurveyResponseRow
  questions: Question[]
  onClose: () => void
}) {
  const formatAnswer = (q: Question, val: AnswerValue): string => {
    if (val === null || val === undefined) return '-'
    if (q.question_type === 'scale') {
      const n = val as number
      const label = q.config.labels?.[n - 1] ?? ''
      return `${n}점${label ? ' — ' + label : ''}`
    }
    if (q.question_type === 'radio') {
      const selected = (val as string) || '-'
      if (selected === '기타') {
        const otherText = r.answers[q.id + '__other'] as string | undefined
        return otherText ? `기타: ${otherText}` : '기타'
      }
      return selected
    }
    if (q.question_type === 'text' || q.question_type === 'textarea')
      return (val as string) || '-'
    if (q.question_type === 'checkbox') {
      if (!Array.isArray(val)) return '-'
      const selected = val as string[]
      const otherText = r.answers[q.id + '__other'] as string | undefined
      const display = selected.map(s => (s === '기타' && otherText) ? `기타: ${otherText}` : s)
      return display.join(', ') || '-'
    }
    if (q.question_type === 'matrix') {
      const items = q.options as MatrixItem[]
      const map = val as Record<string, number>
      return items.map(it => `${it.label}: ${map[it.key] ?? '-'}점`).join(', ')
    }
    if (q.question_type === 'conditional') {
      const cv = val as ConditionalAnswer
      if (cv.used === null) return '-'
      if (!cv.used) return '이용 안 함'
      const zones = cv.zones?.join('/') ?? ''
      return `이용함 (만족도: ${cv.satisfaction ?? '-'}, ${zones})`
    }
    return String(val)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <div className="font-bold text-gray-800">응답 상세</div>
            <div className="text-xs text-gray-400">
              {new Date(r.created_at).toLocaleString('ko-KR')}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>
        <div className="px-6 py-4 text-sm space-y-3">
          {questions.map((q, i) => (
            <Row
              key={q.id}
              label={`Q${i + 1} ${q.question_text.slice(0, 30)}${q.question_text.length > 30 ? '…' : ''}`}
              value={formatAnswer(q, r.answers[q.id] ?? null)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Question edit modal ───────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  scale: '척도 (Scale)',
  text: '단답형 (Text)',
  textarea: '장문형 (Textarea)',
  radio: '단일선택 (Radio)',
  checkbox: '복수선택 (Checkbox)',
  matrix: '매트릭스 (Matrix)',
  conditional: '조건부 (Conditional)',
}

type QuestionDraft = {
  section_label: string
  question_text: string
  question_type: QuestionType
  options: string[] | MatrixItem[]
  config: {
    size?: number
    labels?: string[]
    required?: boolean
    max?: number
    trigger_options?: string[]
    satisfaction_labels?: string[]
    zones?: string[]
  }
  is_active: boolean
}

function emptyDraft(): QuestionDraft {
  return {
    section_label: '',
    question_text: '',
    question_type: 'scale',
    options: [],
    config: { size: 5, labels: ['', '', '', '', ''] },
    is_active: true,
  }
}

function draftFromQuestion(q: Question): QuestionDraft {
  return {
    section_label: q.section_label,
    question_text: q.question_text,
    question_type: q.question_type,
    options: JSON.parse(JSON.stringify(q.options)),
    config: JSON.parse(JSON.stringify(q.config)),
    is_active: q.is_active,
  }
}

function QuestionEditModal({
  initial,
  onSave,
  onClose,
}: {
  initial: QuestionDraft
  onSave: (draft: QuestionDraft) => Promise<void>
  onClose: () => void
}) {
  const [draft, setDraft] = useState<QuestionDraft>(() => JSON.parse(JSON.stringify(initial)))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = <K extends keyof QuestionDraft>(k: K, v: QuestionDraft[K]) =>
    setDraft(prev => ({ ...prev, [k]: v }))

  const setConfig = (k: string, v: unknown) =>
    setDraft(prev => ({ ...prev, config: { ...prev.config, [k]: v } }))

  const handleTypeChange = (t: QuestionType) => {
    const defaults: Partial<QuestionDraft> = { question_type: t, options: [] }
    if (t === 'scale') defaults.config = { size: 5, labels: ['', '', '', '', ''] }
    else if (t === 'radio') defaults.config = { required: false }
    else if (t === 'checkbox') defaults.config = { required: false }
    else if (t === 'matrix') defaults.config = { size: 5 }
    else if (t === 'conditional')
      defaults.config = {
        trigger_options: ['이용 안 함', '이용함'],
        satisfaction_labels: ['불만족', '보통', '만족'],
        zones: [],
      }
    else defaults.config = {}
    setDraft(prev => ({ ...prev, ...defaults }))
  }

  const handleSave = async () => {
    if (!draft.question_text.trim()) {
      setErr('문항 텍스트를 입력해 주세요.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      await onSave(draft)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const strOptions = draft.options as string[]
  const matrixOptions = draft.options as MatrixItem[]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div className="font-bold text-gray-800">문항 편집</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* section_label */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">섹션 레이블</label>
            <input
              value={draft.section_label}
              onChange={e => set('section_label', e.target.value)}
              placeholder="섹션 1. 전반적 만족도"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* question_text */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">문항 텍스트 *</label>
            <textarea
              value={draft.question_text}
              onChange={e => set('question_text', e.target.value)}
              rows={2}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* question_type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">문항 유형</label>
            <select
              value={draft.question_type}
              onChange={e => handleTypeChange(e.target.value as QuestionType)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(t => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* required toggle */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600">필수 항목</label>
            <button
              type="button"
              onClick={() => setConfig('required', !draft.config.required)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                draft.config.required ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  draft.config.required ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* is_active toggle */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-600">활성화</label>
            <button
              type="button"
              onClick={() => set('is_active', !draft.is_active)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                draft.is_active ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  draft.is_active ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* scale-specific */}
          {draft.question_type === 'scale' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">척도 크기</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={draft.config.size ?? 5}
                  onChange={e => {
                    const size = Number(e.target.value)
                    const labels = Array.from({ length: size }, (_, i) => draft.config.labels?.[i] ?? '')
                    setDraft(prev => ({ ...prev, config: { ...prev.config, size, labels } }))
                  }}
                  className="w-24 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">레이블 (각 단계)</label>
                <div className="space-y-2">
                  {(draft.config.labels ?? []).map((lbl, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                      <input
                        value={lbl}
                        onChange={e => {
                          const labels = [...(draft.config.labels ?? [])]
                          labels[i] = e.target.value
                          setConfig('labels', labels)
                        }}
                        className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* radio/checkbox options */}
          {(draft.question_type === 'radio' || draft.question_type === 'checkbox') && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-600">선택지</label>
              {strOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt}
                    onChange={e => {
                      const opts = [...strOptions]
                      opts[i] = e.target.value
                      set('options', opts)
                    }}
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => set('options', strOptions.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('options', [...strOptions, ''])}
                className="text-blue-600 text-xs font-semibold hover:underline"
              >
                + 선택지 추가
              </button>
              {draft.question_type === 'checkbox' && (
                <div className="flex items-center gap-2 mt-1">
                  <label className="text-xs font-semibold text-gray-600">최대 선택 수</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.config.max ?? ''}
                    onChange={e =>
                      setConfig('max', e.target.value ? Number(e.target.value) : undefined)
                    }
                    placeholder="제한 없음"
                    className="w-24 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* matrix */}
          {draft.question_type === 'matrix' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600">척도 크기</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={draft.config.size ?? 5}
                  onChange={e => setConfig('size', Number(e.target.value))}
                  className="w-24 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <label className="block text-xs font-semibold text-gray-600">항목 (key + 레이블)</label>
              {matrixOptions.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.key}
                    onChange={e => {
                      const opts = matrixOptions.map((o, j) => j === i ? { ...o, key: e.target.value } : o)
                      set('options', opts)
                    }}
                    placeholder="key"
                    className="w-24 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    value={item.label}
                    onChange={e => {
                      const opts = matrixOptions.map((o, j) => j === i ? { ...o, label: e.target.value } : o)
                      set('options', opts)
                    }}
                    placeholder="레이블"
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => set('options', matrixOptions.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('options', [...matrixOptions, { key: '', label: '' }])}
                className="text-blue-600 text-xs font-semibold hover:underline"
              >
                + 항목 추가
              </button>
            </div>
          )}

          {/* conditional */}
          {draft.question_type === 'conditional' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">트리거 선택지</label>
                {(draft.config.trigger_options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <input
                      value={opt}
                      onChange={e => {
                        const arr = [...(draft.config.trigger_options ?? [])]
                        arr[i] = e.target.value
                        setConfig('trigger_options', arr)
                      }}
                      className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConfig(
                          'trigger_options',
                          (draft.config.trigger_options ?? []).filter((_, j) => j !== i)
                        )
                      }
                      className="text-red-400 hover:text-red-600 text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setConfig('trigger_options', [...(draft.config.trigger_options ?? []), ''])
                  }
                  className="text-blue-600 text-xs font-semibold hover:underline"
                >
                  + 추가
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  만족도 레이블
                </label>
                {(draft.config.satisfaction_labels ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <input
                      value={opt}
                      onChange={e => {
                        const arr = [...(draft.config.satisfaction_labels ?? [])]
                        arr[i] = e.target.value
                        setConfig('satisfaction_labels', arr)
                      }}
                      className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConfig(
                          'satisfaction_labels',
                          (draft.config.satisfaction_labels ?? []).filter((_, j) => j !== i)
                        )
                      }
                      className="text-red-400 hover:text-red-600 text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setConfig('satisfaction_labels', [
                      ...(draft.config.satisfaction_labels ?? []),
                      '',
                    ])
                  }
                  className="text-blue-600 text-xs font-semibold hover:underline"
                >
                  + 추가
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">존 목록</label>
                {(draft.config.zones ?? []).map((zone, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <input
                      value={zone}
                      onChange={e => {
                        const arr = [...(draft.config.zones ?? [])]
                        arr[i] = e.target.value
                        setConfig('zones', arr)
                      }}
                      className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setConfig(
                          'zones',
                          (draft.config.zones ?? []).filter((_, j) => j !== i)
                        )
                      }
                      className="text-red-400 hover:text-red-600 text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setConfig('zones', [...(draft.config.zones ?? []), ''])}
                  className="text-blue-600 text-xs font-semibold hover:underline"
                >
                  + 추가
                </button>
              </div>
            </div>
          )}

          {err && <p className="text-red-500 text-xs">{err}</p>}
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Statistics tab ────────────────────────────────────────────────────────────

function StatsTab({
  responses,
  questions,
}: {
  responses: SurveyResponseRow[]
  questions: Question[]
}) {
  const n = responses.length
  if (n === 0) return <div className="text-center py-20 text-gray-400">응답이 없습니다.</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {questions.map((q, idx) => {
        const qLabel = `Q${idx + 1} ${q.question_text.slice(0, 40)}${q.question_text.length > 40 ? '…' : ''}`

        if (q.question_type === 'scale') {
          const avg = avgOfScores(responses, q.id)
          const size = q.config.size ?? 5
          const labels = q.config.labels ?? []
          return (
            <Card key={q.id} title={qLabel}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-500">평균</span>
                <span className="text-blue-700 font-bold">{avg.toFixed(2)} / {size}</span>
              </div>
              <StarBar value={avg} max={size} />
              <div className="mt-3 space-y-1">
                {Array.from({ length: size }, (_, i) => i + 1).map(i => {
                  const count = responses.filter(r => r.answers[q.id] === i).length
                  return (
                    <CountBar
                      key={i}
                      label={`${i}점${labels[i - 1] ? ' - ' + labels[i - 1] : ''}`}
                      count={count}
                      total={n}
                    />
                  )
                })}
              </div>
            </Card>
          )
        }

        if (q.question_type === 'radio') {
          const options = q.options as string[]
          const counts = countOptions(responses, q.id, options)
          const otherTexts = options.includes('기타')
            ? responses
                .filter(r => r.answers[q.id] === '기타')
                .map(r => r.answers[q.id + '__other'] as string)
                .filter(Boolean)
            : []
          return (
            <Card key={q.id} title={qLabel}>
              {options.map(opt => (
                <CountBar key={opt} label={opt} count={counts[opt] ?? 0} total={n} />
              ))}
              {otherTexts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 mb-2">기타 응답 내용</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {otherTexts.map((t, i) => (
                      <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">{t}</div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        }

        if (q.question_type === 'checkbox') {
          const options = q.options as string[]
          const counts = countOptions(responses, q.id, options)
          const otherTexts = options.includes('기타')
            ? responses
                .filter(r => Array.isArray(r.answers[q.id]) && (r.answers[q.id] as string[]).includes('기타'))
                .map(r => r.answers[q.id + '__other'] as string)
                .filter(Boolean)
            : []
          return (
            <Card key={q.id} title={qLabel}>
              {options.map(opt => (
                <CountBar key={opt} label={opt} count={counts[opt] ?? 0} total={n} />
              ))}
              {otherTexts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 mb-2">기타 응답 내용</div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {otherTexts.map((t, i) => (
                      <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">{t}</div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        }

        if (q.question_type === 'matrix') {
          const items = q.options as MatrixItem[]
          return (
            <Card key={q.id} title={qLabel}>
              {items.map(item => (
                <div key={item.key} className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">{item.label}</div>
                  <StarBar value={matrixAvg(responses, q.id, item.key)} max={q.config.size ?? 5} />
                </div>
              ))}
            </Card>
          )
        }

        if (q.question_type === 'conditional') {
          const triggerOptions = q.config.trigger_options ?? ['이용 안 함', '이용함']
          const zones = q.config.zones ?? []
          const satisfactionLabels = q.config.satisfaction_labels ?? []
          const usedCount = responses.filter(r => {
            const v = r.answers[q.id] as ConditionalAnswer | null | undefined
            return v?.used === true
          }).length
          const notUsedCount = responses.filter(r => {
            const v = r.answers[q.id] as ConditionalAnswer | null | undefined
            return v?.used === false
          }).length
          return (
            <Card key={q.id} title={qLabel}>
              <CountBar label={triggerOptions[0] ?? '이용 안 함'} count={notUsedCount} total={n} />
              <CountBar label={triggerOptions[1] ?? '이용함'} count={usedCount} total={n} />
              {satisfactionLabels.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-500 mb-1">만족도 분포</div>
                  {satisfactionLabels.map((lbl, i) => {
                    const cnt = responses.filter(r => {
                      const v = r.answers[q.id] as ConditionalAnswer | null | undefined
                      return v?.used === true && v.satisfaction === i + 1
                    }).length
                    return <CountBar key={lbl} label={`${i + 1}. ${lbl}`} count={cnt} total={usedCount || 1} />
                  })}
                </div>
              )}
              {zones.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-500 mb-1">존별 인기</div>
                  {zones.map(zone => {
                    const cnt = responses.filter(r => {
                      const v = r.answers[q.id] as ConditionalAnswer | null | undefined
                      return v?.used === true && v.zones?.includes(zone)
                    }).length
                    return <CountBar key={zone} label={zone} count={cnt} total={usedCount || 1} />
                  })}
                </div>
              )}
            </Card>
          )
        }

        // text / textarea
        const texts = responses
          .map(r => r.answers[q.id])
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        return (
          <Card key={q.id} title={qLabel}>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {texts.length === 0 ? (
                <p className="text-gray-400 text-xs">주관식 응답 없음</p>
              ) : (
                texts.map((t, i) => (
                  <div key={i} className="text-xs text-gray-700 border-b border-gray-50 pb-1">
                    {t}
                  </div>
                ))
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Question management tab ───────────────────────────────────────────────────

function QuestionsTab({
  questions,
  storedPwd,
  onRefresh,
}: {
  questions: Question[]
  storedPwd: string
  onRefresh: () => void
}) {
  const [editTarget, setEditTarget] = useState<{ q: Question | null; isNew: boolean } | null>(null)
  const [actionError, setActionError] = useState('')

  const authHeaders = {
    'Content-Type': 'application/json',
    'x-admin-password': storedPwd,
  }

  const reorder = async (q: Question, dir: 'up' | 'down') => {
    const idx = questions.findIndex(x => x.id === q.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= questions.length) return
    const swap = questions[swapIdx]

    await Promise.all([
      fetch(`/api/questions/${q.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ sort_order: swap.sort_order }),
      }),
      fetch(`/api/questions/${swap.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ sort_order: q.sort_order }),
      }),
    ])
    onRefresh()
  }

  const toggleActive = async (q: Question) => {
    await fetch(`/api/questions/${q.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ is_active: !q.is_active }),
    })
    onRefresh()
  }

  const deleteQuestion = async (q: Question) => {
    if (!confirm(`"${q.question_text.slice(0, 30)}" 문항을 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/questions/${q.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (!res.ok) {
      setActionError('삭제 실패')
      return
    }
    onRefresh()
  }

  const saveQuestion = async (draft: QuestionDraft, id?: string) => {
    const url = id ? `/api/questions/${id}` : '/api/questions'
    const method = id ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: authHeaders,
      body: JSON.stringify(draft),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? '저장 실패')
    }
    setEditTarget(null)
    onRefresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-600">총 {questions.length}개 문항</span>
        <button
          onClick={() => setEditTarget({ q: null, isNew: true })}
          className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          + 문항 추가
        </button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">문항이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {questions.map((q, idx) => (
              <div key={q.id} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50">
                {/* reorder buttons */}
                <div className="flex flex-col gap-1 mt-0.5 flex-shrink-0">
                  <button
                    onClick={() => reorder(q, 'up')}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-xs leading-none"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => reorder(q, 'down')}
                    disabled={idx === questions.length - 1}
                    className="text-gray-400 hover:text-blue-600 disabled:opacity-20 text-xs leading-none"
                  >
                    ▼
                  </button>
                </div>

                {/* number */}
                <span className="text-xs text-gray-400 font-bold w-6 flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                {/* content */}
                <div className="flex-1 min-w-0">
                  {q.section_label && (
                    <div className="text-xs text-blue-500 font-semibold mb-0.5">{q.section_label}</div>
                  )}
                  <div className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">
                    {q.question_text}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {QUESTION_TYPE_LABELS[q.question_type]}
                    </span>
                    {q.config.required && (
                      <span className="text-xs text-red-500 font-semibold">필수</span>
                    )}
                  </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(q)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border-2 transition-all ${
                      q.is_active
                        ? 'border-green-400 text-green-600 bg-green-50'
                        : 'border-gray-200 text-gray-400 bg-white'
                    }`}
                  >
                    {q.is_active ? '활성' : '비활성'}
                  </button>
                  <button
                    onClick={() => setEditTarget({ q, isNew: false })}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg border-2 border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteQuestion(q)}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg border-2 border-red-200 text-red-500 bg-red-50 hover:bg-red-100"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editTarget && (
        <QuestionEditModal
          initial={editTarget.isNew ? emptyDraft() : draftFromQuestion(editTarget.q!)}
          onSave={draft => saveQuestion(draft, editTarget.isNew ? undefined : editTarget.q?.id)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}

// ── Main admin page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [storedPwd, setStoredPwd] = useState('')

  const [responses, setResponses] = useState<SurveyResponseRow[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)

  const [selected, setSelected] = useState<SurveyResponseRow | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'list' | 'questions'>('summary')

  const fetchAll = useCallback(async (pwd: string) => {
    setLoading(true)
    try {
      const [rRes, qRes] = await Promise.all([
        fetch('/api/responses', { headers: { 'x-admin-password': pwd } }),
        fetch('/api/questions', { headers: { 'x-admin-password': pwd } }),
      ])
      if (!rRes.ok) throw new Error('인증 실패')
      const [rJson, qJson] = await Promise.all([rRes.json(), qRes.json()])
      setResponses(rJson.data ?? [])
      setQuestions(qJson.data ?? [])
    } catch {
      setAuthed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchQuestions = useCallback(async (pwd: string) => {
    const res = await fetch('/api/questions', { headers: { 'x-admin-password': pwd } })
    const json = await res.json()
    setQuestions(json.data ?? [])
  }, [])

  const handleLogin = async () => {
    setLoginError('')
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setStoredPwd(password)
      setAuthed(true)
      fetchAll(password)
    } else {
      setLoginError('비밀번호가 틀렸습니다.')
    }
  }

  useEffect(() => {
    if (authed) {
      const id = setInterval(() => fetchAll(storedPwd), 30000)
      return () => clearInterval(id)
    }
  }, [authed, storedPwd, fetchAll])

  // ── Login ─────────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }}
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-4xl text-center mb-2">🔐</div>
          <h1 className="text-xl font-bold text-center text-gray-800 mb-1">관리자 로그인</h1>
          <p className="text-center text-gray-400 text-sm mb-6">KAON 체육대회 설문 관리</p>
          <input
            type="password"
            placeholder="관리자 비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-3 text-sm focus:outline-none focus:border-blue-500"
          />
          {loginError && <p className="text-red-500 text-xs mb-3">{loginError}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-colors"
          >
            로그인
          </button>
        </div>
      </div>
    )
  }

  // ── Authed layout ─────────────────────────────────────────────────────────

  const tabs = [
    { key: 'summary', label: '📊 통계 요약' },
    { key: 'list', label: '📋 응답 목록' },
    { key: 'questions', label: '📝 문항 관리' },
  ] as const

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fa' }}>
      {selected && (
        <ResponseModal
          r={selected}
          questions={questions}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: '#1d4ed8' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <div className="text-white font-bold text-sm">관리자 대시보드</div>
              <div className="text-blue-200 text-xs">
                총 {responses.length}개 응답 · 30초마다 자동 갱신
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchAll(storedPwd)}
            className="text-white text-xs border border-white/30 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            🔄 새로고침
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-2 pb-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-blue-700'
                  : 'text-white/70 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">
        {loading ? (
          <div className="text-center py-20 text-gray-400">데이터 불러오는 중...</div>
        ) : activeTab === 'summary' ? (
          <StatsTab responses={responses} questions={questions} />
        ) : activeTab === 'list' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {responses.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">응답이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-500 font-semibold">제출 시간</th>
                      {questions.slice(0, 3).map((q, i) => (
                        <th key={q.id} className="text-left px-4 py-3 text-gray-500 font-semibold">
                          Q{i + 1}
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 text-gray-500 font-semibold">상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, idx) => (
                      <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(r.created_at).toLocaleString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        {questions.slice(0, 3).map(q => {
                          const v = r.answers[q.id]
                          const display =
                            v === null || v === undefined
                              ? '-'
                              : Array.isArray(v)
                              ? (v as string[]).join(', ').slice(0, 30)
                              : String(v).slice(0, 30)
                          return (
                            <td key={q.id} className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                              {display}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelected(r)}
                            className="bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-lg hover:bg-blue-100 transition"
                          >
                            보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <QuestionsTab
            questions={questions}
            storedPwd={storedPwd}
            onRefresh={() => fetchQuestions(storedPwd)}
          />
        )}
      </div>
    </div>
  )
}
