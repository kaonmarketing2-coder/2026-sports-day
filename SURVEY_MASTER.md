# 행사 만족도 설문 폼 — 마스터 가이드

> 이 문서를 Claude에게 제공하면, 새 주제(행사명, 섹션, 질문 목록)를 주는 것만으로  
> 동일한 구조의 설문 폼을 처음부터 만들 수 있습니다.

---

## 1. 기술 스택

| 역할 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router, TypeScript) |
| 스타일 | Tailwind CSS |
| 데이터베이스 | Supabase (PostgreSQL) |
| 파일 스토리지 | Supabase Storage |
| 배포 | Vercel |

---

## 2. 프로젝트 구조

```
app/
  survey/
    page.tsx          # 응답자용 설문 페이지
    done/page.tsx     # 제출 완료 페이지
  kaon-mgmt-2026/
    page.tsx          # 관리자 페이지 (비공개 URL)
  api/
    questions/
      route.ts        # GET(문항 목록), POST(문항 추가)
      [id]/route.ts   # PUT(수정), DELETE(삭제)
    submit/route.ts   # POST(응답 제출)
    responses/route.ts# GET(응답 목록)
    admin-login/route.ts # POST(비밀번호 검증)
lib/
  types.ts            # TypeScript 타입 정의
  supabase.ts         # Supabase 클라이언트
  seed-questions.ts   # 초기 문항 데이터
```

---

## 3. Supabase 설정

### 3-1. 환경 변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ADMIN_PASSWORD=관리자비밀번호
```

### 3-2. 테이블 생성 SQL

```sql
-- 설문 문항 테이블
create table survey_questions (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  section_label text not null default '',
  question_text text not null default '',
  question_type text not null default 'text',
  options jsonb not null default '[]',
  config jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- 응답 테이블
create table survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  answers jsonb not null default '{}'
);

-- RLS 설정
alter table survey_questions enable row level security;
alter table survey_responses enable row level security;

create policy "누구나 활성 문항 조회" on survey_questions
  for select using (is_active = true);

create policy "누구나 응답 제출" on survey_responses
  for insert with check (true);

create policy "누구나 응답 조회" on survey_responses
  for select using (true);

create policy "누구나 응답 삭제" on survey_responses
  for delete using (true);
```

### 3-3. 사진 업로드 사용 시 Storage 설정

```sql
-- Supabase 대시보드 > Storage > New bucket
-- 버킷 이름: survey-photos
-- Public bucket: ON

-- Storage Policy (SQL Editor에서 실행)
insert into storage.policies (name, bucket_id, operation, definition)
values
  ('Public read', 'survey-photos', 'SELECT', 'true'),
  ('Authenticated upload', 'survey-photos', 'INSERT', 'true');
```

---

## 4. 문항 유형 (QuestionType)

| 유형 | 설명 | config 예시 |
|------|------|-------------|
| `scale` | 점수 척도 (1~N점) | `{ size: 5, labels: ['매우 불만족', ..., '매우 만족'] }` |
| `text` | 단답형 주관식 | `{}` |
| `textarea` | 장문형 주관식 | `{}` |
| `radio` | 단일 선택 | `{ required: true }` |
| `checkbox` | 복수 선택 | `{ required: true, max: 2 }` |
| `matrix` | 항목별 척도 (표 형태) | `{ size: 5 }` |
| `conditional` | 선택지별 분기 질문 | 아래 별도 설명 |
| `photo` | 사진 업로드 | `{ max_files: 5, max_mb: 10 }` |

### conditional 유형 상세

```ts
// config 구조
{
  trigger_options: ['이용 안 함', '이용함', '모름'],  // 메인 선택지
  multi_select: false,           // true면 복수 선택 허용
  has_other: true,               // '기타' 선택지 추가 여부
  option_branches: {             // 선택지별 하위 질문
    '이용함': [
      {
        id: 'bq_unique_id',
        text: '만족도를 선택해 주세요.',
        type: 'scale',           // text | textarea | radio | checkbox | scale
        scale_size: 5,
      },
      {
        id: 'bq_unique_id2',
        text: '이용한 이유는 무엇인가요?',
        type: 'radio',
        options: ['재미있어서', '할 일이 없어서', '상품을 받고 싶어서'],
        has_other: true,
      }
    ],
    '이용 안 함': [
      {
        id: 'bq_unique_id3',
        text: '이용하지 않은 이유는 무엇인가요?',
        type: 'radio',
        options: ['재미가 없어 보여서', '대기시간이 너무 길어서'],
        has_other: true,
      }
    ]
  }
}

// options 필드는 빈 배열로 설정
options: []
```

---

## 5. TypeScript 타입 정의 (lib/types.ts 전체)

```ts
export type QuestionType =
  | 'scale' | 'text' | 'textarea' | 'radio' | 'checkbox'
  | 'matrix' | 'conditional' | 'photo'

export type MatrixItem = { key: string; label: string }

export type BranchQuestion = {
  id: string
  text: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'scale'
  options?: string[]
  has_other?: boolean
  scale_size?: number
}

export type QuestionConfig = {
  size?: number
  labels?: string[]
  required?: boolean
  max?: number
  max_files?: number
  max_mb?: number
  trigger_options?: string[]
  multi_select?: boolean
  has_other?: boolean
  option_branches?: Record<string, BranchQuestion[]>
  // 레거시 호환용 (건드리지 않아도 됨)
  satisfaction_labels?: string[]
  zones?: string[]
  trigger_values?: string[]
  sub?: object
}

export type ConditionalAnswer = {
  selected?: string | string[] | null
  other_text?: string
  branch_answers?: Record<string, Record<string, AnswerValue>>
  // 레거시
  used?: boolean | null
  satisfaction?: number | null
  zones?: string[]
}

export type AnswerValue =
  | number | string | string[]
  | Record<string, number>
  | ConditionalAnswer | null

export type SurveyAnswers = Record<string, AnswerValue>

export type Question = {
  id: string
  sort_order: number
  section_label: string
  question_text: string
  question_type: QuestionType
  options: string[] | MatrixItem[]
  config: QuestionConfig
  is_active: boolean
  created_at?: string
}

export type SurveyResponseRow = {
  id: string
  created_at: string
  answers: SurveyAnswers
}
```

---

## 6. 초기 문항 데이터 패턴 (lib/seed-questions.ts)

새 행사에 맞게 아래 구조를 복사 후 문항 내용만 교체하면 됩니다.

```ts
import type { Question, MatrixItem } from './types'

export const DEFAULT_QUESTIONS: Omit<Question, 'id' | 'created_at'>[] = [

  // ── 섹션 1: 전반적 만족도 ──────────────────────────────────────────
  {
    sort_order: 1,
    section_label: '섹션 1. 전반적 만족도',
    question_text: '행사 전체에 얼마나 만족하셨나요?',
    question_type: 'scale',
    options: [],
    config: { size: 5, labels: ['매우 불만족', '불만족', '보통', '만족', '매우 만족'], required: true },
    is_active: true,
  },

  // ── 섹션 2: 프로그램별 평가 ────────────────────────────────────────
  {
    sort_order: 2,
    section_label: '섹션 2. 프로그램 평가',
    question_text: '어떤 프로그램에 참여하셨나요? (복수 선택 가능)',
    question_type: 'checkbox',
    options: ['프로그램A', '프로그램B', '프로그램C'],
    config: { required: true },
    is_active: true,
  },
  {
    sort_order: 3,
    section_label: '섹션 2. 프로그램 평가',
    question_text: '각 프로그램의 만족도를 선택해 주세요.',
    question_type: 'matrix',
    options: [
      { key: 'a', label: '프로그램A' },
      { key: 'b', label: '프로그램B' },
    ] as MatrixItem[],
    config: { size: 5 },
    is_active: true,
  },

  // ── 섹션 3: 운영 관련 ──────────────────────────────────────────────
  {
    sort_order: 4,
    section_label: '섹션 3. 운영 및 진행',
    question_text: '가장 좋았던 점을 자유롭게 적어 주세요.',
    question_type: 'textarea',
    options: [],
    config: {},
    is_active: true,
  },

  // ── conditional 예시 ───────────────────────────────────────────────
  {
    sort_order: 5,
    section_label: '섹션 4. 부스 이용',
    question_text: '부스를 이용하셨나요?',
    question_type: 'conditional',
    options: [],
    config: {
      trigger_options: ['이용 안 함', '이용함'],
      multi_select: false,
      has_other: false,
      option_branches: {
        '이용함': [
          {
            id: 'bq_booth_reason',
            text: '이용한 이유는 무엇인가요?',
            type: 'radio',
            options: ['재미있어서', '이벤트 때문에', '친구 권유로'],
            has_other: true,
          },
        ],
        '이용 안 함': [
          {
            id: 'bq_no_booth_reason',
            text: '이용하지 않은 이유는 무엇인가요?',
            type: 'radio',
            options: ['몰랐어서', '줄이 너무 길어서', '관심 없어서'],
            has_other: true,
          },
        ],
      },
    },
    is_active: true,
  },
]
```

---

## 7. 관리자 기능 요약

- **URL**: `/kaon-mgmt-2026` (행사마다 비공개 URL로 변경 권장)
- **비밀번호**: `ADMIN_PASSWORD` 환경 변수
- **기능**:
  - 문항 추가 / 수정 / 삭제 / 순서 변경 (드래그)
  - 문항 활성/비활성 토글
  - 응답 목록 조회 및 개별 응답 상세 보기
  - 응답 삭제
  - 전체 응답 Excel 내보내기
  - 사진 일괄 ZIP 다운로드
  - 통계 탭 (척도 평균, 선택지 분포, 매트릭스 평균)

---

## 8. 새 행사 폼 생성 절차

다음 정보를 Claude에게 주면 처음부터 만들어 줍니다:

```
1. 행사명: (예: 2027 KAON 워크숍)
2. 관리자 페이지 URL 경로: (예: /kaon-workshop-admin)
3. 섹션 목록과 각 문항:
   - 섹션 이름
   - 문항 내용
   - 문항 유형 (scale / radio / checkbox / matrix / text / textarea / conditional / photo)
   - 선택지 (해당하는 경우)
   - 필수 여부
4. 조건부 문항이 있다면 선택지별 하위 질문 내용
```

### Claude에게 전달할 프롬프트 예시

```
이 SURVEY_MASTER.md를 참고해서 아래 행사의 만족도 설문 폼을 만들어 주세요.

행사명: 2027 KAON 연간 워크숍
관리자 URL: /kaon-ws-2027-admin

섹션 1. 전반적 만족도
- Q1. 이번 워크숍에 전반적으로 만족하셨나요? (scale 5점, 필수)
- Q2. 내년에도 참여하고 싶으신가요? (scale 5점)

섹션 2. 세션 평가
- Q3. 참여한 세션을 모두 선택해 주세요. (checkbox: 리더십, 팀빌딩, 커뮤니케이션, 전략기획)
- Q4. 각 세션 만족도 (matrix: 리더십/팀빌딩/커뮤니케이션/전략기획, 5점 척도)

섹션 3. 자유 의견
- Q5. 가장 기억에 남는 점 (textarea)
- Q6. 개선 바라는 점 (textarea)
```

---

## 9. 핵심 설계 원칙

1. **문항은 DB에서 관리** — 코드 수정 없이 관리자 페이지에서 문항 추가/수정/삭제 가능
2. **섹션 레이블로 그룹화** — 같은 `section_label`을 가진 문항은 한 카드에 묶임 (공백 차이 자동 정규화)
3. **응답은 JSON으로 저장** — `answers: { [questionId]: value }` 구조로 문항이 바뀌어도 과거 응답 보존
4. **조건부 문항은 선택지별 독립 분기** — `option_branches[optionValue][branchQuestionIndex]` 구조
5. **관리자 인증은 헤더 기반** — `x-admin-password` 헤더로 API 보호 (Supabase RLS는 공개 읽기 허용)
6. **드래그로 순서 변경** — 문항 목록과 선택지 순서 모두 HTML5 native DnD로 변경 가능
