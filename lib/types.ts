export type QuestionType =
  | 'scale'
  | 'text'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'matrix'
  | 'conditional'
  | 'photo'

export type MatrixItem = {
  key: string
  label: string
}

export type ConditionalNestedConfig = {
  text: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'scale'
  options?: string[]
  has_other?: boolean
  scale_size?: number
}

export type ConditionalSubConfig = {
  text: string
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'scale'
  options?: string[]
  has_other?: boolean
  scale_size?: number
  trigger_values?: string[]
  nested?: ConditionalNestedConfig
}

export type QuestionConfig = {
  size?: number
  labels?: string[]
  required?: boolean
  max?: number
  max_files?: number
  max_mb?: number
  // conditional – main options list (used in both legacy and new format)
  trigger_options?: string[]
  // conditional – legacy only
  satisfaction_labels?: string[]
  zones?: string[]
  // conditional – new format
  multi_select?: boolean
  has_other?: boolean
  trigger_values?: string[]
  sub?: ConditionalSubConfig
}

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

export type ConditionalAnswer = {
  // New format
  selected?: string | string[] | null
  other_text?: string
  sub_answer?: string | string[] | number | null
  sub_other_text?: string
  nested_answer?: string | string[] | number | null
  nested_other_text?: string
  // Legacy format (backward compat)
  used?: boolean | null
  satisfaction?: number | null
  zones?: string[]
}

export type AnswerValue =
  | number
  | string
  | string[]
  | Record<string, number>
  | ConditionalAnswer
  | null

export type SurveyAnswers = Record<string, AnswerValue>

export type SurveyResponseRow = {
  id: string
  created_at: string
  answers: SurveyAnswers
}
