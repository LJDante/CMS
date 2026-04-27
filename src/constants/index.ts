export const DEFAULT_DISPLAY_VALUE = 'N/A'

export const PATIENT_EDIT_ROLES = ['clinic_staff', 'clinic_nurse', 'clinic_doctor', 'clinic_admin'] as const
export type PatientEditRole = (typeof PATIENT_EDIT_ROLES)[number]

export const EDUCATION_TYPE_OPTIONS = [
  { value: 'all', label: 'All Education Types' },
  { value: 'k12', label: 'K-12' },
  { value: 'college', label: 'College' },
  { value: 'personnel', label: 'School Personnel' }
] as const

export const GRADE_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Grade Levels' },
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
  { value: '4', label: 'Grade 4' },
  { value: '5', label: 'Grade 5' },
  { value: '6', label: 'Grade 6' },
  { value: '7', label: 'Grade 7' },
  { value: '8', label: 'Grade 8' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'Grade 12' }
] as const

export const K12_GRADE_LEVEL_FILTER_GROUPS = [
  {
    label: 'Kindergarten',
    options: [{ value: 'K', label: 'Kindergarten' }]
  },
  {
    label: 'Elementary',
    options: [
      { value: '1', label: 'Grade 1' },
      { value: '2', label: 'Grade 2' },
      { value: '3', label: 'Grade 3' },
      { value: '4', label: 'Grade 4' },
      { value: '5', label: 'Grade 5' },
      { value: '6', label: 'Grade 6' }
    ]
  },
  {
    label: 'Junior High School',
    options: [
      { value: '7', label: 'Grade 7' },
      { value: '8', label: 'Grade 8' },
      { value: '9', label: 'Grade 9' },
      { value: '10', label: 'Grade 10' }
    ]
  },
  {
    label: 'Senior High School',
    options: [
      { value: '11', label: 'Grade 11' },
      { value: '12', label: 'Grade 12' }
    ]
  }
] as const

export const COLLEGE_YEAR_LEVEL_OPTIONS = [
  { value: 'all', label: 'All Year Levels' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' }
] as const

export const SCHOOL_YEAR_OPTIONS = [
  { value: 'all', label: 'All School Years' },
  { value: '2024-2025', label: '2024-2025' },
  { value: '2025-2026', label: '2025-2026' },
  { value: '2026-2027', label: '2026-2027' }
] as const

export const GRADE_LEVEL_DB_MAP = {
  kindergarten: ['K', 'Kindergarten'],
  elementary: [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6'
  ],
  jhs: [
    '7',
    '8',
    '9',
    '10',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10'
  ],
  shs: ['11', '12', 'Grade 11', 'Grade 12']
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
