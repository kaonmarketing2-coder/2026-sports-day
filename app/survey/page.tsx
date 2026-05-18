'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  EVENTS, NEXT_EVENTS, Q8_ITEMS, Q10_OPTIONS, Q13_OPTIONS, TEAMS, GENDERS,
  SCALE5, SCALE5_AGREE, SCALE3, SCALE4_WOMENSTAGE, EMPTY_RESPONSE, SurveyResponse
} from '@/lib/survey-data'

function ScaleRadio({ options, value, onChange }: { options: string[], value: number | null, onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {options.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${value === i + 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400'}`}
        >
          <div className="text-lg font-bold">{i + 1}</div>
          <div className="text-xs mt-0.5 leading-tight">{label}</div>
        </button>
      ))}
    </div>
  )
}

function MultiCheck({ options, value, onChange, max }: { options: string[], value: string[], onChange: (v: string[]) => void, max?: number }) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt))
    } else {
      if (max && value.length >= max) return
      onChange([...value, opt])
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150 ${value.includes(opt) ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
        >
          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${value.includes(opt) ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
            {value.includes(opt) && <span className="text-white text-xs">✓</span>}
          </span>
          {opt}
        </button>
      ))}
    </div>
  )
}

function SingleRadio({ options, value, onChange }: { options: string[], value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150 ${value === opt ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
        >
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${value === opt ? 'border-blue-600' : 'border-gray-300'}`}>
            {value === opt && <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block" />}
          </span>
          {opt}
        </button>
      ))}
    </div>
  )
}

function SectionHeader({ num, title }: { num: string, title: string }) {
  return (
    <div className="flex items-center gap-3 py-4 border-b-2 border-blue-100 mb-6">
      <span className="bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-full">{num}</span>
      <h2 className="text-blue-900 font-bold text-lg">{title}</h2>
    </div>
  )
}

function QBlock({ number, text, children, required }: { number: string, text: string, children: React.ReactNode, required?: boolean }) {
  return (
    <div className="mb-8">
      <div className="text-blue-600 font-bold text-xs mb-1">{number}</div>
      <p className="text-gray-800 font-semibold text-sm mb-4 leading-relaxed">
        {text}{required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {children}
    </div>
  )
}

export default function SurveyPage() {
  const router = useRouter()
  const [form, setForm] = useState<SurveyResponse>({ ...EMPTY_RESPONSE })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof SurveyResponse, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const setQ8 = (key: string, value: number) =>
    setForm(prev => ({ ...prev, q8: { ...prev.q8, [key]: value } }))

  const validate = () => {
    if (!form.q1) return 'Q1: 전반적 만족도를 선택해 주세요.'
    if (!form.q2) return 'Q2: 내년 참여 의향을 선택해 주세요.'
    if (form.q4.length === 0) return 'Q4: 참여/관람한 종목을 하나 이상 선택해 주세요.'
    if (form.q9_used === null) return 'Q9: 가온 놀이동산 이용 여부를 선택해 주세요.'
    if (!form.q11) return 'Q11: 여성 스테이지에 대한 의견을 선택해 주세요.'
    if (!form.q14) return 'Q14: 소속 팀을 선택해 주세요.'
    if (!form.q15) return 'Q15: 성별을 선택해 주세요.'
    return ''
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('제출 실패')
      router.push('/survey/done')
    } catch {
      setError('제출 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
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

        {/* 섹션 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <SectionHeader num="섹션 1" title="전반적 만족도" />

          <QBlock number="Q1" text="오늘 체육대회에 전반적으로 얼마나 만족하셨나요?" required>
            <ScaleRadio options={SCALE5} value={form.q1} onChange={v => set('q1', v)} />
          </QBlock>

          <QBlock number="Q2" text="내년에도 참여하고 싶으신가요?" required>
            <ScaleRadio options={SCALE5_AGREE} value={form.q2} onChange={v => set('q2', v)} />
          </QBlock>

          <QBlock number="Q3" text="올해 체육대회, 한 마디로 표현한다면?">
            <input
              type="text"
              placeholder="단어 또는 짧은 문장으로 자유롭게 입력해 주세요"
              value={form.q3}
              onChange={e => set('q3', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </QBlock>
        </div>

        {/* 섹션 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <SectionHeader num="섹션 2" title="종목별 평가" />

          <QBlock number="Q4" text="참여하거나 관람한 종목을 모두 체크해 주세요. (복수선택)" required>
            <MultiCheck options={EVENTS} value={form.q4} onChange={v => set('q4', v)} />
          </QBlock>

          <QBlock number="Q5" text="위 종목 중 가장 재미있었던 것 최대 2개를 골라 주세요.">
            <div className="text-xs text-blue-600 font-semibold mb-2">최대 2개 선택 가능</div>
            <MultiCheck options={EVENTS} value={form.q5} onChange={v => set('q5', v)} max={2} />
          </QBlock>

          <QBlock number="Q6" text="위 종목 중 내년에는 없애거나 바꿔도 좋을 것 최대 2개를 골라 주세요.">
            <div className="text-xs text-orange-500 font-semibold mb-2">최대 2개 선택 가능</div>
            <MultiCheck options={EVENTS} value={form.q6} onChange={v => set('q6', v)} max={2} />
          </QBlock>

          <QBlock number="Q7" text="내년에 추가했으면 하는 종목을 골라 주세요. (복수선택)">
            <MultiCheck options={NEXT_EVENTS} value={form.q7} onChange={v => set('q7', v)} />
          </QBlock>
        </div>

        {/* 섹션 3 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <SectionHeader num="섹션 3" title="운영 세부 평가" />

          <QBlock number="Q8" text="다음 항목을 각각 5점 척도로 평가해 주세요.">
            <div className="overflow-x-auto">
              <div className="flex gap-1 mb-2 ml-[140px] sm:ml-[180px]">
                {['1', '2', '3', '4', '5'].map(n => (
                  <div key={n} className="flex-1 text-center text-xs font-bold text-gray-500">{n}</div>
                ))}
              </div>
              {Q8_ITEMS.map(item => (
                <div key={item.key} className="flex items-center gap-2 mb-2">
                  <div className="w-[140px] sm:w-[180px] text-xs text-gray-700 font-medium flex-shrink-0 leading-tight">{item.label}</div>
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQ8(item.key, n)}
                        className={`flex-1 h-9 rounded-lg border-2 text-xs font-bold transition-all ${form.q8[item.key] === n ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </QBlock>

          <QBlock number="Q9" text="가온 놀이동산(에어바운스존/플레이존/이벤트존)을 이용하셨나요?" required>
            <div className="flex gap-2 mb-4">
              {['이용 안 함', '이용함'].map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set('q9_used', i === 1)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${form.q9_used === (i === 1) && form.q9_used !== null ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {form.q9_used === true && (
              <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 mb-3">이용하셨다면 만족도를 선택해 주세요.</p>
                <div className="flex gap-2 mb-4">
                  {SCALE3.map((opt, i) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set('q9_satisfaction', i + 1)}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${form.q9_satisfaction === i + 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
                    >
                      {i + 1}. {opt}
                    </button>
                  ))}
                </div>
                <p className="text-sm font-semibold text-blue-800 mb-2">어떤 존이 가장 좋았나요?</p>
                <MultiCheck
                  options={['에어바운스존', '플레이존', '이벤트존']}
                  value={form.q9_zone}
                  onChange={v => set('q9_zone', v)}
                />
              </div>
            )}
          </QBlock>

          <QBlock number="Q10" text="행사 중 가장 불편하거나 아쉬웠던 점은? (복수선택)">
            <MultiCheck options={Q10_OPTIONS} value={form.q10} onChange={v => set('q10', v)} />
          </QBlock>

          <QBlock number="Q11" text="올해 새로 도입된 여성 스테이지에 대한 의견을 선택해 주세요." required>
            <SingleRadio options={SCALE4_WOMENSTAGE} value={SCALE4_WOMENSTAGE[form.q11 ? form.q11 - 1 : -1] ?? ''} onChange={v => set('q11', SCALE4_WOMENSTAGE.indexOf(v) + 1)} />
          </QBlock>
        </div>

        {/* 섹션 4 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <SectionHeader num="섹션 4" title="내년 기획 인풋" />

          <QBlock number="Q12" text="내년 체육대회에서 딱 한 가지만 바꿀 수 있다면 무엇을 바꾸고 싶으신가요?">
            <textarea
              placeholder="자유롭게 입력해 주세요"
              value={form.q12}
              onChange={e => set('q12', e.target.value)}
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </QBlock>

          <QBlock number="Q13" text="체육대회 외에 구성원 화합을 위해 해보고 싶은 행사 형식이 있다면? (복수선택)">
            <MultiCheck options={Q13_OPTIONS} value={form.q13} onChange={v => set('q13', v)} />
          </QBlock>
        </div>

        {/* 섹션 5 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <SectionHeader num="섹션 5" title="응답자 분류" />

          <QBlock number="Q14" text="소속 팀" required>
            <div className="flex gap-2 flex-wrap">
              {TEAMS.map(team => (
                <button
                  key={team}
                  type="button"
                  onClick={() => set('q14', team)}
                  className={`flex-1 min-w-[80px] py-3 rounded-xl border-2 text-sm font-bold transition-all ${form.q14 === team ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
                >
                  {team}
                </button>
              ))}
            </div>
          </QBlock>

          <QBlock number="Q15" text="성별" required>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('q15', g)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${form.q15 === g ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </QBlock>
        </div>

        {/* Error & Submit */}
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
      </div>
    </div>
  )
}
