import { format } from 'date-fns'
import { DEFAULT_DISPLAY_VALUE, GRADE_LEVEL_DB_MAP, GRADE_LEVEL_OPTIONS, COLLEGE_YEAR_LEVEL_OPTIONS } from '../constants'

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

export function normalizeGradeValue(value: string | null | undefined) {
  if (!value) return ''
  const input = String(value).trim()
  const normalized = input.toLowerCase()

  if (normalized === 'k' || normalized === 'kindergarten') return 'K'

  const gradeMatch = normalized.match(/^grade\s*(\d+)$/)
  if (gradeMatch) return gradeMatch[1]

  const yearMatch = normalized.match(/^(\d+)(?:st|nd|rd|th)?(?:\s*year)?$/)
  if (yearMatch) return yearMatch[1]

  return input
}

export function getGradeLevelDatabaseValues(gradeLevel: GradeLevel) {
  return gradeLevel === 'all' ? [] : GRADE_LEVEL_DB_MAP[gradeLevel] ?? []
}

export function getGradeFilterOptions(educationType: string) {
  if (educationType === 'k12') {
    return GRADE_LEVEL_OPTIONS
  }

  if (educationType === 'college') {
    return COLLEGE_YEAR_LEVEL_OPTIONS
  }

  return [{ value: 'all', label: 'All Grade Levels' }] as const
}

export interface GradeLevelQueryParams {
  column: 'grade_level' | 'year_level'
  values: string[]
  educationLevels?: string[]
}

export function getGradeLevelQueryParams(educationType: string, selectedGrade: string): GradeLevelQueryParams | null {
  if (selectedGrade === 'all' || !selectedGrade) return null

  if (educationType === 'k12') {
    if (selectedGrade === 'K') {
      return {
        column: 'grade_level',
        values: ['K', 'Kindergarten'],
        educationLevels: ['kindergarten']
      }
    }

    const numericGrade = Number(selectedGrade)
    if (numericGrade >= 1 && numericGrade <= 10) {
      return {
        column: 'grade_level',
        values: [selectedGrade, `Grade ${selectedGrade}`],
        educationLevels: ['k-12']
      }
    }

    if (numericGrade === 11 || numericGrade === 12) {
      return {
        column: 'year_level',
        values: [selectedGrade],
        educationLevels: ['shs']
      }
    }
  }

  if (educationType === 'college') {
    return {
      column: 'year_level',
      values: [selectedGrade],
      educationLevels: ['college']
    }
  }

  return null
}

export function isK12EducationLevel(level?: string | null) {
  return ['k-12', 'kindergarten', 'shs'].includes(level ?? '')
}

export function matchesGradeFilter(student: { grade_level?: string | null; year_level?: string | null; education_level?: string | null }, educationType: string, selectedGrade: string) {
  if (selectedGrade === 'all' || !selectedGrade) {
    return true
  }

  const normalizedGrade = normalizeGradeValue(student.grade_level)
  const normalizedYear = normalizeGradeValue(student.year_level)

  if (educationType === 'k12') {
    if (selectedGrade === 'K') {
      return normalizedGrade === 'K'
    }

    if (selectedGrade === '11' || selectedGrade === '12') {
      return normalizedGrade === selectedGrade || normalizedYear === selectedGrade
    }

    return normalizedGrade === selectedGrade
  }

  if (educationType === 'college') {
    return student.education_level === 'college' && normalizedYear === selectedGrade
  }

  return true
}

export function getFullName(firstName?: string, middleName?: string, lastName?: string) {
  const name = `${firstName ?? ''} ${middleName ? `${middleName} ` : ''}${lastName ?? ''}`.trim()
  return name || DEFAULT_DISPLAY_VALUE
}
