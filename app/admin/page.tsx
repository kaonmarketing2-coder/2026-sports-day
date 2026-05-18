'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  EVENTS, NEXT_EVENTS, Q8_ITEMS, Q10_OPTIONS, Q13_OPTIONS, TEAMS, GENDERS,
  SCALE5, SCALE5_AGREE, SCALE4_WOMENSTAGE, SurveyResponse
} from '@/lib/survey-data'

type Response = SurveyResponse & { id: string; created_at: string }

// ── Helpers ──────────────────────────────────────────────────────────────────

function countBy<T>(arr: T[], key: keyof T) {
  const map: Record<string, number> = {}
  arr.forEach(item => {
    const v = String(item[key] ?? '미응답')
    map[v] = (map[v] || 0) + 1
  })
  return map
}

function avgScore(arr: Response[], key: keyof Response) {
  const vals = arr.map(r => r[key] as number).filter(v => v != null && v > 0)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function flatCount(arr: Response[], key: keyof Response, options: string[]) {
  const map: Record<string, number> = {}
  options.forEach(o => { map[o] = 0 })
  arr.forEach(r => {
    const v = r[key] as string[] | null
    if (Array.isArray(v)) v.forEach(item => { if (item in map) map[item]++ })
  })
  return map
}

function q8Avg(arr: Response[], key: string) {
  const vals = arr.map(r => (r.q8 as Record<string, number>)?.[key]).filter(v => v != null && v > 0)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

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

// ── Modal: 개별 응답 ──────────────────────────────────────────────────────────

function ResponseModal({ r, onClose }: { r: Response; onClose: () => void }) {
  const label = (arr: string[], idx: number | null) => (idx != null && idx > 0 ? arr[idx - 1] : '-')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <div className="font-bold text-gray-800">응답 상세</div>
            <div className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('ko-KR')}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="px-6 py-4 text-sm space-y-3">
          <Row label="팀" value={r.q14 || '-'} />
          <Row label="성별" value={r.q15 || '-'} />
          <Row label="Q1 전반적 만족도" value={`${r.q1 ?? '-'}점 — ${label(SCALE5, r.q1)}`} />
          <Row label="Q2 내년 참여 의향" value={`${r.q2 ?? '-'}점 — ${label(SCALE5_AGREE, r.q2)}`} />
          <Row label="Q3 한 마디" value={r.q3 || '-'} />
          <Row label="Q4 참여/관람 종목" value={(r.q4 ?? []).join(', ') || '-'} />
          <Row label="Q5 가장 재미있었던 종목" value={(r.q5 ?? []).join(', ') || '-'} />
          <Row label="Q6 없애거나 바꿀 종목" value={(r.q6 ?? []).join(', ') || '-'} />
          <Row label="Q7 추가 희망 종목" value={(r.q7 ?? []).join(', ') || '-'} />
          <div className="border-t pt-3">
            <div className="font-semibold text-gray-600 mb-2">Q8 항목별 평가</div>
            {Q8_ITEMS.map(item => (
              <Row key={item.key} label={item.label} value={`${(r.q8 as Record<string, number>)?.[item.key] ?? '-'}점`} />
            ))}
          </div>
          <Row label="Q9 가온 놀이동산 이용" value={r.q9_used === null ? '-' : r.q9_used ? `이용함 (만족도: ${r.q9_satisfaction ?? '-'}, ${(r.q9_zone ?? []).join('/')})` : '이용 안 함'} />
          <Row label="Q10 불편했던 점" value={(r.q10 ?? []).join(', ') || '-'} />
          <Row label="Q11 여성 스테이지" value={label(SCALE4_WOMENSTAGE, r.q11)} />
          <Row label="Q12 바꾸고 싶은 한 가지" value={r.q12 || '-'} />
          <Row label="Q13 화합 행사 희망" value={(r.q13 ?? []).join(', ') || '-'} />
        </div>
      </div>
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

// ── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Response | null>(null)
  const [filterTeam, setFilterTeam] = useState('전체')
  const [filterGender, setFilterGender] = useState('전체')
  const [activeTab, setActiveTab] = useState<'summary' | 'list'>('summary')
  const [storedPwd, setStoredPwd] = useState('')

  const fetchData = useCallback(async (pwd: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/responses', { headers: { 'x-admin-password': pwd } })
      if (!res.ok) throw new Error('인증 실패')
      const json = await res.json()
      setResponses(json.data ?? [])
    } catch {
      setAuthed(false)
    } finally {
      setLoading(false)
    }
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
      fetchData(password)
    } else {
      setLoginError('비밀번호가 틀렸습니다.')
    }
  }

  useEffect(() => {
    if (authed) {
      const id = setInterval(() => fetchData(storedPwd), 30000)
      return () => clearInterval(id)
    }
  }, [authed, storedPwd, fetchData])

  // ── Login Screen ─────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)' }}>
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

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = responses.filter(r =>
    (filterTeam === '전체' || r.q14 === filterTeam) &&
    (filterGender === '전체' || r.q15 === filterGender)
  )
  const n = filtered.length

  // ── Summary Data ──────────────────────────────────────────────────────────

  const q1Dist = countBy(filtered, 'q1')
  const q2Dist = countBy(filtered, 'q2')
  const teamDist = countBy(filtered, 'q14')
  const genderDist = countBy(filtered, 'q15')
  const q11Dist = countBy(filtered, 'q11')

  const eventCounts = flatCount(filtered, 'q4', EVENTS)
  const bestCounts = flatCount(filtered, 'q5', EVENTS)
  const removeCounts = flatCount(filtered, 'q6', EVENTS)
  const addCounts = flatCount(filtered, 'q7', NEXT_EVENTS)
  const q10Counts = flatCount(filtered, 'q10', Q10_OPTIONS)
  const q13Counts = flatCount(filtered, 'q13', Q13_OPTIONS)

  return (
    <div className="min-h-screen" style={{ background: '#f5f7fa' }}>
      {selected && <ResponseModal r={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-10 shadow-sm" style={{ background: '#1d4ed8' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <div className="text-white font-bold text-sm">관리자 대시보드</div>
              <div className="text-blue-200 text-xs">총 {responses.length}개 응답 · 30초마다 자동 갱신</div>
            </div>
          </div>
          <button
            onClick={() => fetchData(storedPwd)}
            className="text-white text-xs border border-white/30 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            🔄 새로고침
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-2 pb-3">
          {(['summary', 'list'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-blue-700' : 'text-white/70 hover:bg-white/10'}`}
            >
              {tab === 'summary' ? '📊 통계 요약' : '📋 응답 목록'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5">

        {/* Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-gray-600">필터:</span>
          <div className="flex gap-1">
            {['전체', ...TEAMS].map(t => (
              <button key={t} onClick={() => setFilterTeam(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${filterTeam === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}
              >{t}</button>
            ))}
          </div>
          <div className="flex gap-1">
            {['전체', ...GENDERS].map(g => (
              <button key={g} onClick={() => setFilterGender(g)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${filterGender === g ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
              >{g}</button>
            ))}
          </div>
          <span className="ml-auto text-sm text-gray-500">필터 결과: <strong>{n}개</strong></span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">데이터 불러오는 중...</div>
        ) : n === 0 ? (
          <div className="text-center py-20 text-gray-400">응답이 없습니다.</div>
        ) : activeTab === 'summary' ? (

          // ── Summary Tab ────────────────────────────────────────────────────

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 응답자 분포 */}
            <Card title="응답자 분포">
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-500 mb-2">소속 팀</div>
                {TEAMS.map(t => (
                  <CountBar key={t} label={t} count={teamDist[t] ?? 0} total={n} />
                ))}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">성별</div>
                {GENDERS.map(g => (
                  <CountBar key={g} label={g} count={genderDist[g] ?? 0} total={n} />
                ))}
              </div>
            </Card>

            {/* Q1/Q2 */}
            <Card title="전반적 만족도 & 내년 참여 의향">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-500">Q1 전반적 만족도</span>
                  <span className="text-blue-700 font-bold">{avgScore(filtered, 'q1').toFixed(2)} / 5</span>
                </div>
                <StarBar value={avgScore(filtered, 'q1')} />
                {[1, 2, 3, 4, 5].map(i => (
                  <CountBar key={i} label={`${i}점 - ${SCALE5[i - 1]}`} count={q1Dist[String(i)] ?? 0} total={n} />
                ))}
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-gray-500">Q2 내년 참여 의향</span>
                  <span className="text-blue-700 font-bold">{avgScore(filtered, 'q2').toFixed(2)} / 5</span>
                </div>
                <StarBar value={avgScore(filtered, 'q2')} />
                {[1, 2, 3, 4, 5].map(i => (
                  <CountBar key={i} label={`${i}점 - ${SCALE5_AGREE[i - 1]}`} count={q2Dist[String(i)] ?? 0} total={n} />
                ))}
              </div>
            </Card>

            {/* Q8 항목별 평가 */}
            <Card title="Q8 항목별 평균 평점">
              {Q8_ITEMS.map(item => (
                <div key={item.key} className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">{item.label}</div>
                  <StarBar value={q8Avg(filtered, item.key)} />
                </div>
              ))}
            </Card>

            {/* Q4/Q5/Q6 종목 */}
            <Card title="종목별 참여·선호·제거 현황">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-semibold">종목</th>
                      <th className="text-center py-2 text-gray-500 font-semibold">참여(Q4)</th>
                      <th className="text-center py-2 text-green-600 font-semibold">최고(Q5)</th>
                      <th className="text-center py-2 text-red-500 font-semibold">제거(Q6)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVENTS.map(e => (
                      <tr key={e} className="border-b border-gray-50">
                        <td className="py-1.5 text-gray-700 leading-tight">{e}</td>
                        <td className="text-center py-1.5 font-medium">{eventCounts[e] ?? 0}</td>
                        <td className="text-center py-1.5 font-medium text-green-600">{bestCounts[e] ?? 0}</td>
                        <td className="text-center py-1.5 font-medium text-red-500">{removeCounts[e] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Q7 추가 희망 종목 */}
            <Card title="Q7 내년 추가 희망 종목">
              {NEXT_EVENTS.map(e => (
                <CountBar key={e} label={e} count={addCounts[e] ?? 0} total={n} />
              ))}
            </Card>

            {/* Q10 불편사항 */}
            <Card title="Q10 불편하거나 아쉬웠던 점">
              {Q10_OPTIONS.map(o => (
                <CountBar key={o} label={o} count={q10Counts[o] ?? 0} total={n} />
              ))}
            </Card>

            {/* Q11 여성 스테이지 */}
            <Card title="Q11 여성 스테이지 의견">
              {SCALE4_WOMENSTAGE.map((s, i) => (
                <CountBar key={s} label={`${i + 1}. ${s}`} count={q11Dist[String(i + 1)] ?? 0} total={n} />
              ))}
            </Card>

            {/* Q13 화합 행사 */}
            <Card title="Q13 화합 행사 희망 형식">
              {Q13_OPTIONS.map(o => (
                <CountBar key={o} label={o} count={q13Counts[o] ?? 0} total={n} />
              ))}
            </Card>

            {/* Q3 주관식 */}
            <Card title="Q3 한 마디 (주관식)">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtered.filter(r => r.q3).map(r => (
                  <div key={r.id} className="flex gap-2 text-xs">
                    <span className="text-gray-400 flex-shrink-0">[{r.q14}·{r.q15}]</span>
                    <span className="text-gray-700">{r.q3}</span>
                  </div>
                ))}
                {filtered.filter(r => r.q3).length === 0 && <p className="text-gray-400 text-xs">주관식 응답 없음</p>}
              </div>
            </Card>

            {/* Q12 주관식 */}
            <Card title="Q12 바꾸고 싶은 한 가지 (주관식)">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtered.filter(r => r.q12).map(r => (
                  <div key={r.id} className="flex gap-2 text-xs">
                    <span className="text-gray-400 flex-shrink-0">[{r.q14}·{r.q15}]</span>
                    <span className="text-gray-700">{r.q12}</span>
                  </div>
                ))}
                {filtered.filter(r => r.q12).length === 0 && <p className="text-gray-400 text-xs">주관식 응답 없음</p>}
              </div>
            </Card>
          </div>

        ) : (

          // ── List Tab ───────────────────────────────────────────────────────

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold">제출 시간</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold">팀</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold">성별</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Q1</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">Q2</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-semibold">Q3 한 마디</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-semibold">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={r.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-3 text-gray-500">{new Date(r.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 font-bold text-gray-700">{r.q14 || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.q15 || '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{r.q1 ?? '-'}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{r.q2 ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{r.q3 || '-'}</td>
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
          </div>
        )}
      </div>
    </div>
  )
}
