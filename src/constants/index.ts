export const DEFAULT_DISPLAY_VALUE = 'N/A'

export const PATIENT_EDIT_ROLES = ['clinic_staff', 'clinic_doctor', 'clinic_admin'] as const
export type PatientEditRole = (typeof PATIENT_EDIT_ROLES)[number]

export const EDUCATION_TYPE_OPTIONS = [
  { value: 'all', label: 'All Education Types' },
  { value: 'k12', label: 'K-12' },
  { value: 'college', label: 'College' },
  { value: 'personnel', label: 'School Personnel' }
] as const

export const GRADE_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Grade Levels' },
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: 'elementary', label: 'Elementary (Grades 1–6)' },
  { value: 'jhs', label: 'Junior High (Grades 7-10)' },
  { value: 'shs', label: 'Senior High (Grades 11-12)' }
] as const

export const SCHOOL_YEAR_OPTIONS = [
  { value: 'all', label: 'All School Years' },
  { value: '2024-2025', label: '2024-2025' },
  { value: '2025-2026', label: '2025-2026' },
  { value: '2026-2027', label: '2026-2027' }
] as const

export const GRADE_LEVEL_DB_MAP = {
  kindergarten: ['Kindergarten'],
  elementary: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  jhs: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  shs: ['Grade 11', 'Grade 12']
} as const

export const CONSULTATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'cancelled', label: 'Cancelled' }
] as const

export const SUPPLY_REQUEST_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'fulfilled', label: 'Fulfilled' }
] as const
