export type PatientType = 'student' | 'personnel'
export type EducationLevel = 'kindergarten' | 'elementary' | 'junior-high-school' | 'k-12' | 'shs' | 'college' | 'n/a'

export const shsTracks = ['ABM', 'STEM', 'HUMSS'] as const
export const collegeCourses = ['BSCS', 'BSA', 'BSBA', 'BSHM', 'BSP', 'BSTM'] as const

export type StudentFormData = {
  patient_type: PatientType
  student_id: string
  first_name: string
  middle_name: string
  last_name: string
  age: string
  date_of_birth: string
  sex: 'M' | 'F'
  grade_level: string
  section: string
  education_level: EducationLevel
  shs_track: string
  shs_grade: string
  college_course: string
  college_year: string
  contact_number: string
  guardian_name: string
  guardian_contact: string
  guardian_email: string
  mother_name: string
  mother_first_name: string
  mother_middle_name: string
  mother_last_name: string
  father_name: string
  father_first_name: string
  father_middle_name: string
  father_last_name: string
  suffix: string
  father_suffix: string
  person_to_notify: string
  emergency_contact: string
  voucher_type: string
  address_field: string
  barangay: string
  city: string
  province: string
  zip_code: string
  allergies: string
  diagnosed_diseases: string
}

export const initialFormData: StudentFormData = {
  patient_type: 'student',
  student_id: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  age: '',
  date_of_birth: '',
  sex: 'M',
  grade_level: '',
  section: '',
  education_level: 'elementary',
  shs_track: 'ABM',
  shs_grade: '11',
  college_course: 'BSCS',
  college_year: '1',
  contact_number: '',
  guardian_name: '',
  guardian_contact: '',
  guardian_email: '',
  mother_name: '',
  mother_first_name: '',
  mother_middle_name: '',
  mother_last_name: '',
  father_name: '',
  father_first_name: '',
  father_middle_name: '',
  father_last_name: '',
  suffix: '',
  father_suffix: '',
  person_to_notify: '',
  emergency_contact: '',
  voucher_type: '',
  address_field: '',
  barangay: '',
  city: '',
  province: '',
  zip_code: '',
  allergies: '',
  diagnosed_diseases: ''
}