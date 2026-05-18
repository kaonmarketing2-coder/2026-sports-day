'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Question, AnswerValue, SurveyAnswers, MatrixItem, ConditionalAnswer } from '@/lib/types'
import { supabase } from '@/lib/supabase'

// ── Question renderers ────────────────────────────────────────────────────────

function ScaleInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: AnswerValue
  onChange: (v: number) => void
}) {
  const size = question.config.size ?? 5
  const labels = question.config.labels ?? []
  const numVal = typeof value === 'number' ? value : null
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {Array.from({ length: size }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
            numVal === n
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400'
          }`}
        >
          <div className="text-lg font-bold">{n}</div>
          {labels[n - 1] && <div className="text-xs mt-0.5 leading-tight">{labels[n - 1]}</div>}
        </button>
      ))}
    </div>
  )
}

function TextInput({
  value,
  onChange,
}: {
  value: AnswerValue
  onChange: (v: string) => void
}) {
  return (
    <input
      type="text"
      placeholder="자유롭게 입력해 주세요"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
    />
  )
}

function TextareaInput({
  value,
  onChange,
}: {
  value: AnswerValue
  onChange: (v: string) => void
}) {
  return (
    <textarea
      placeholder="자유롭게 입력해 주세요"
      value={typeof value === 'string' ? value : ''}
      onChange={e => onChange(e.target.value)}
      rows={3}
      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
    />
  )
}

function RadioInput({
  question,
  value,
  otherValue,
  onChange,
  onOtherChange,
}: {
  question: Question
  value: AnswerValue
  otherValue: string
  onChange: (v: string) => void
  onOtherChange: (v: string) => void
}) {
  const options = (question.options as string[]) ?? []
  const strVal = typeof value === 'string' ? value : ''
  const hasOther = options.includes('기타')

  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150 ${
            strVal === opt
              ? 'border-blue-600 bg-blue-50 text-blue-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              strVal === opt ? 'border-blue-600' : 'border-gray-300'
            }`}
          >
            {strVal === opt && <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block" />}
          </span>
          {opt}
        </button>
      ))}
      {hasOther && strVal === '기타' && (
        <input
          type="text"
          placeholder="직접 입력해 주세요"
          value={otherValue}
          onChange={e => onOtherChange(e.target.value)}
          autoFocus
          className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 bg-blue-50"
        />
      )}
    </div>
  )
}

function CheckboxInput({
  question,
  value,
  otherValue,
  onChange,
  onOtherChange,
}: {
  question: Question
  value: AnswerValue
  otherValue: string
  onChange: (v: string[]) => void
  onOtherChange: (v: string) => void
}) {
  const options = (question.options as string[]) ?? []
  const max = question.config.max
  const arrVal = Array.isArray(value) ? (value as string[]) : []
  const hasOther = options.includes('기타')

  const toggle = (opt: string) => {
    if (arrVal.includes(opt)) {
      onChange(arrVal.filter(v => v !== opt))
    } else {
      if (max && arrVal.length >= max) return
      onChange([...arrVal, opt])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {max && (
        <div className="text-xs text-blue-600 font-semibold mb-1">최대 {max}개 선택 가능</div>
      )}
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150 ${
            arrVal.includes(opt)
              ? 'border-blue-600 bg-blue-50 text-blue-800'
              : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
          }`}
        >
          <span
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              arrVal.includes(opt) ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
            }`}
          >
            {arrVal.includes(opt) && <span className="text-white text-xs">✓</span>}
          </span>
          {opt}
        </button>
      ))}
      {hasOther && arrVal.includes('기타') && (
        <input
          type="text"
          placeholder="직접 입력해 주세요"
          value={otherValue}
          onChange={e => onOtherChange(e.target.value)}
          autoFocus
          className="w-full border-2 border-blue-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 bg-blue-50"
        />
      )}
    </div>
  )
}

function MatrixInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: AnswerValue
  onChange: (v: Record<string, number>) => void
}) {
  const items = (question.options as MatrixItem[]) ?? []
  const size = question.config.size ?? 5
  const mapVal = (value && typeof value === 'object' && !Array.isArray(value) && !(value as ConditionalAnswer).used !== undefined)
    ? (value as Record<string, number>)
    : {}

  const setItem = (key: string, n: number) => {
    onChange({ ...mapVal, [key]: n })
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 mb-2 ml-[140px] sm:ml-[180px]">
        {Array.from({ length: size }, (_, i) => i + 1).map(n => (
          <div key={n} className="flex-1 text-center text-xs font-bold text-gray-500">
            {n}
          </div>
        ))}
      </div>
      {items.map(item => (
        <div key={item.key} className="flex items-center gap-2 mb-2">
          <div className="w-[140px] sm:w-[180px] text-xs text-gray-700 font-medium flex-shrink-0 leading-tight">
            {item.label}
          </div>
          <div className="flex gap-1 flex-1">
            {Array.from({ length: size }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setItem(item.key, n)}
                className={`flex-1 h-9 rounded-lg border-2 text-xs font-bold transition-all ${
                  mapVal[item.key] === n
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ConditionalInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: AnswerValue
  onChange: (v: ConditionalAnswer) => void
}) {
  const triggerOptions = question.config.trigger_options ?? ['이용 안 함', '이용함']
  const satisfactionLabels = question.config.satisfaction_labels ?? ['불만족', '보통', '만족']
  const zones = question.config.zones ?? []

  const condVal: ConditionalAnswer =
    value && typeof value === 'object' && !Array.isArray(value) && 'used' in (value as object)
      ? (value as ConditionalAnswer)
      : { used: null, satisfaction: null, zones: [] }

  const setUsed = (used: boolean) => onChange({ ...condVal, used })
  const setSatisfaction = (satisfaction: number) => onChange({ ...condVal, satisfaction })
  const toggleZone = (zone: string) => {
    const z = condVal.zones ?? []
    const next = z.includes(zone) ? z.filter(x => x !== zone) : [...z, zone]
    onChange({ ...condVal, zones: next })
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {triggerOptions.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => setUsed(i !== 0)}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
              condVal.used === (i !== 0) && condVal.used !== null
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {condVal.used === true && (
        <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="text-sm font-semibold text-blue-800 mb-3">이용하셨다면 만족도를 선택해 주세요.</p>
          <div className="flex gap-2 mb-4">
            {satisfactionLabels.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSatisfaction(i + 1)}
                className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                  condVal.satisfaction === i + 1
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                {i + 1}. {opt}
              </button>
            ))}
          </div>
          {zones.length > 0 && (
            <>
              <p className="text-sm font-semibold text-blue-800 mb-2">어떤 존이 가장 좋았나요?</p>
              <div className="flex flex-col gap-2">
                {zones.map(zone => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => toggleZone(zone)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150 ${
                      (condVal.zones ?? []).includes(zone)
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        (condVal.zones ?? []).includes(zone)
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {(condVal.zones ?? []).includes(zone) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </span>
                    {zone}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function PhotoInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: AnswerValue
  onChange: (v: string[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const urls = Array.isArray(value) ? (value as string[]) : []
  const maxFiles = question.config.max_files ?? 5
  const maxMb = question.config.max_mb ?? 10

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    if (urls.length + files.length > maxFiles) {
      setUploadError(`최대 ${maxFiles}장까지 업로드할 수 있습니다.`)
      return
    }
    setUploading(true)
    setUploadError('')
    try {
      const newUrls: string[] = []
      for (const file of files) {
        if (file.size > maxMb * 1024 * 1024) {
          setUploadError(`${maxMb}MB 이하 파일만 업로드 가능합니다.`)
          continue
        }
        const ext = file.name.split('.').pop() ?? 'jpg'
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data, error } = await supabase.storage
          .from('survey-photos')
          .upload(filename, file, { upsert: false })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage
          .from('survey-photos')
          .getPublicUrl(data.path)
        newUrls.push(publicUrl)
      }
      onChange([...urls, ...newUrls])
    } catch {
      setUploadError('업로드 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {urls.map((url, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`사진 ${i + 1}`}
                className="w-24 h-24 object-cover rounded-xl border-2 border-blue-200"
              />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {urls.length < maxFiles && (
        <label
          className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            uploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => handleFiles(Array.from(e.target.files ?? []))}
            disabled={uploading}
            className="hidden"
          />
          <span className="text-3xl">{uploading ? '⏳' : '📷'}</span>
          <div>
            <div className="text-sm font-semibold text-gray-700">
              {uploading ? '업로드 중...' : '사진 선택하기'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              최대 {maxFiles}장 · 장당 {maxMb}MB 이하 · JPG, PNG, WEBP
            </div>
          </div>
        </label>
      )}

      {uploadError && <p className="text-red-500 text-xs font-medium">{uploadError}</p>}
    </div>
  )
}

// ── Layout components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  // Extract section number and name from label like "섹션 1. 전반적 만족도"
  const match = title.match(/^(섹션\s*\d+)[.。]?\s*(.*)$/)
  const num = match ? match[1] : ''
  const name = match ? match[2] : title
  return (
    <div className="flex items-center gap-3 py-4 border-b-2 border-blue-100 mb-6">
      {num && (
        <span className="bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-full">
          {num}
        </span>
      )}
      <h2 className="text-blue-900 font-bold text-lg">{name}</h2>
    </div>
  )
}

function QBlock({
  number,
  text,
  children,
  required,
}: {
  number: string
  text: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="mb-8">
      <div className="text-blue-600 font-bold text-xs mb-1">{number}</div>
      <p className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed">
        {text}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {children}
    </div>
  )
}

// ── Main survey page ──────────────────────────────────────────────────────────

export default function SurveyPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/questions')
      .then(r => r.json())
      .then(json => {
        setQuestions(json.data ?? [])
      })
      .catch(() => setError('문항을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  const setAnswer = (id: string, value: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  const validate = (): string => {
    for (const q of questions) {
      if (!q.config.required) continue
      const val = answers[q.id]
      if (q.question_type === 'scale' || q.question_type === 'radio') {
        if (!val) return `${q.question_text} 항목을 입력해 주세요.`
      } else if (q.question_type === 'checkbox') {
        if (!Array.isArray(val) || val.length === 0)
          return `${q.question_text} 항목을 하나 이상 선택해 주세요.`
      } else if (q.question_type === 'conditional') {
        const condVal = val as ConditionalAnswer | null | undefined
        if (!condVal || condVal.used === null)
          return `${q.question_text} 항목을 선택해 주세요.`
      }
    }
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) {
      setError(err)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error('제출 실패')
      router.push('/survey/done')
    } catch {
      setError('제출 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // Group questions by section_label preserving order
  const sections: { label: string; questions: Question[] }[] = []
  for (const q of questions) {
    const last = sections[sections.length - 1]
    if (last && last.label === q.section_label) {
      last.questions.push(q)
    } else {
      sections.push({ label: q.section_label, questions: [q] })
    }
  }

  // Global question index for Q numbering
  let globalIndex = 0

  const renderQuestion = (q: Question) => {
    globalIndex++
    const num = `Q${globalIndex}`
    const val = answers[q.id] ?? null

    let input: React.ReactNode = null

    if (q.question_type === 'scale') {
      input = (
        <ScaleInput
          question={q}
          value={val}
          onChange={v => setAnswer(q.id, v)}
        />
      )
    } else if (q.question_type === 'text') {
      input = (
        <TextInput
          value={val}
          onChange={v => setAnswer(q.id, v)}
        />
      )
    } else if (q.question_type === 'textarea') {
      input = (
        <TextareaInput
          value={val}
          onChange={v => setAnswer(q.id, v)}
        />
      )
    } else if (q.question_type === 'radio') {
      input = (
        <RadioInput
          question={q}
          value={val}
          otherValue={(answers[q.id + '__other'] as string) ?? ''}
          onChange={v => setAnswer(q.id, v)}
          onOtherChange={v => setAnswer(q.id + '__other', v)}
        />
      )
    } else if (q.question_type === 'checkbox') {
      input = (
        <CheckboxInput
          question={q}
          value={val}
          otherValue={(answers[q.id + '__other'] as string) ?? ''}
          onChange={v => setAnswer(q.id, v)}
          onOtherChange={v => setAnswer(q.id + '__other', v)}
        />
      )
    } else if (q.question_type === 'matrix') {
      input = (
        <MatrixInput
          question={q}
          value={val}
          onChange={v => setAnswer(q.id, v)}
        />
      )
    } else if (q.question_type === 'conditional') {
      input = (
        <ConditionalInput
          question={q}
          value={val}
          onChange={v => setAnswer(q.id, v)}
        />
      )
    } else if (q.question_type === 'photo') {
      input = (
        <PhotoInput
          question={q}
          value={val}
          onChange={v => setAnswer(q.id, v)}
        />
      )
    }

    return (
      <QBlock
        key={q.id}
        number={num}
        text={q.question_text}
        required={q.config.required}
      >
        {input}
      </QBlock>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fa' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: '#1d4ed8' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="text-white font-bold text-base">2026 KAON 체육대회</div>
            <div className="text-blue-200 text-xs">만족도 조사</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">문항을 불러오는 중...</p>
            </div>
          </div>
        ) : error && questions.length === 0 ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium mt-8">
            ⚠️ {error}
          </div>
        ) : (
          <>
            {sections.map(section => {
              const sectionNodes = section.questions.map(q => renderQuestion(q))
              return (
                <div
                  key={section.label}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4"
                >
                  {section.label && <SectionHeader title={section.label} />}
                  {sectionNodes}
                </div>
              )
            })}

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all duration-200"
              style={{ background: submitting ? '#93c5fd' : '#1d4ed8' }}
            >
              {submitting ? '제출 중...' : '설문 제출하기 →'}
            </button>
            <p className="text-center text-gray-400 text-xs mt-3">* 표시 항목은 필수입니다</p>
          </>
        )}
      </div>
    </div>
  )
}
