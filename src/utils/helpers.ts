import { format } from 'date-fns'
import { DEFAULT_DISPLAY_VALUE, GRADE_LEVEL_DB_MAP } from '../constants'

export type GradeLevel = keyof typeof GRADE_LEVEL_DB_MAP | 'all'

export function displayValue(value: string | number | null | undefined, fallback = DEFAULT_DISPLAY_VALUE) {
  return value === undefined || value === null || value === '' ? fallback : String(value)
}

export function formatDate(value: string | Date | null | undefined, pattern = 'MMMM d, yyyy h:mm a', fallback = DEFAULT_DISPLAY_VALUE) {
  if (!value) return fallback
  return format(new Date(value), pattern)
}

export function formatDateIfPresent(value: string | null | undefined, pattern = 'PPP', fallback = DEFAULT_DISPLAY_VALUE) {
  if (!value) return fallback
  return format(new Date(value), pattern)
}

export function normalizeLabel(value: string | null | undefined, fallback = DEFAULT_DISPLAY_VALUE) {
  if (!value) return fallback
  return String(value).replace(/_/g, ' ')
}

export function getGradeLevelDatabaseValues(gradeLevel: GradeLevel) {
  return gradeLevel === 'all' ? [] : GRADE_LEVEL_DB_MAP[gradeLevel] ?? []
}

export function isK12EducationLevel(level?: string | null) {
  return ['k-12', 'kindergarten', 'shs'].includes(level ?? '')
}

export function getFullName(firstName?: string, middleName?: string, lastName?: string) {
  const name = `${firstName ?? ''} ${middleName ? `${middleName} ` : ''}${lastName ?? ''}`.trim()
  return name || DEFAULT_DISPLAY_VALUE
}
