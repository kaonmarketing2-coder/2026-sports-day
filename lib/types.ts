export type QuestionType =
  | 'scale'
  | 'text'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'matrix'
  | 'conditional'

export type MatrixItem = {
  key: string
  label: string
}

export type QuestionConfig = {
  size?: number
  labels?: string[]
  required?: boolean
  max?: number
  trigger_options?: string[]
  satisfaction_labels?: string[]
  zones?: string[]
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
  used: boolean | null
  satisfaction: number | null
  zones: string[]
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
