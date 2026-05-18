export const EVENTS = [
  'OX 퀴즈',
  '축구 예선/결승',
  '여성 스테이지(슈팅 다트)',
  '신입 스테이지',
  '타임어택 챌린지(8종 단체전)',
  '리더 스테이지(호핑볼 경마)',
  '파이널 계주(에어바운스 릴레이)',
  '가온 놀이동산',
]

export const NEXT_EVENTS = [
  '발야구',
  '피구',
  '족구',
  '배드민턴',
  '줄다리기',
  '보드게임/실내 종목',
  '현재 종목 유지',
  '기타',
]

export const Q8_ITEMS = [
  { key: 'mc', label: 'MC 진행 (최성필 MC)' },
  { key: 'lunch', label: '점심 도시락 (훈제오리/제육/함박)' },
  { key: 'foodtruck', label: '푸드트럭 및 생맥주' },
  { key: 'team', label: '팀 배정 (인원 구성 균형)' },
  { key: 'layout', label: '행사장 레이아웃 및 동선' },
  { key: 'cheer', label: '응원 분위기' },
  { key: 'gaon', label: '가온 놀이동산 스티커 경품 이벤트' },
]

export const Q10_OPTIONS = [
  '특정 종목 대기 시간이 너무 길었다',
  '내가 직접 참여할 종목이 부족했다',
  '팀 인원 불균형이 신경 쓰였다',
  '음식/음료 관련 불만',
  '동선이 불편했다',
  '날씨/환경 문제',
  '특별히 없다',
  '기타',
]

export const Q13_OPTIONS = [
  '소규모 팀빌딩 워크샵',
  '문화 공연/스포츠 관람',
  '봉사활동',
  '소셜 다이닝/맛집 투어',
  '현재 방식 유지',
  '기타',
]

export const TEAMS = ['KING', 'ACE', 'ONE', 'NICE']
export const GENDERS = ['남성', '여성', '응답 안 함']

export const SCALE5 = ['매우 불만족', '불만족', '보통', '만족', '매우 만족']
export const SCALE5_AGREE = ['전혀 그렇지 않다', '그렇지 않다', '보통', '그렇다', '매우 그렇다']
export const SCALE3 = ['불만족', '보통', '만족']
export const SCALE4_WOMENSTAGE = [
  '불필요하다',
  '있어도 그만 없어도 그만',
  '좋았다, 유지했으면 한다',
  '더 확대했으면 한다',
]

export type SurveyResponse = {
  id?: string
  created_at?: string
  q1: number | null
  q2: number | null
  q3: string
  q4: string[]
  q5: string[]
  q6: string[]
  q7: string[]
  q8: Record<string, number>
  q9_used: boolean | null
  q9_satisfaction: number | null
  q9_zone: string[]
  q10: string[]
  q11: number | null
  q12: string
  q13: string[]
  q14: string
  q15: string
}

export const EMPTY_RESPONSE: SurveyResponse = {
  q1: null,
  q2: null,
  q3: '',
  q4: [],
  q5: [],
  q6: [],
  q7: [],
  q8: {},
  q9_used: null,
  q9_satisfaction: null,
  q9_zone: [],
  q10: [],
  q11: null,
  q12: '',
  q13: [],
  q14: '',
  q15: '',
}
