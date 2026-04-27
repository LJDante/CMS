import type { Patient } from './index'

// Types for consultation management
export interface ConsultationFormData {
  reason: string
  intervention: string
  actions_taken: string
  doctors_remarks: string
  diagnosis_result: string
  consultation_date: string
  follow_up_date: string | null
  attending_staff_name: string
  doctor_name: string
  blood_pressure: string
  heart_rate: string | number | null
  oxygen_saturation: string | number | null
  temperature: string | number | null
  height_cm: string | number | null
  weight_kg: string | number | null
  patient_id: string
  patient_external_id?: string
  patient_name: string
  patient_type: 'student' | 'personnel'
  grade_level?: string
  section?: string
  year_level?: string
  course?: string
  lmp: string | null
  medicines: string
  status: 'pending' | 'completed' | 'follow_up' | 'cancelled'
}

export interface AttendanceDateRange {
  startDate: string
  endDate: string
}

export interface ConsultationFilters {
  search: string
  selectedPatient: Patient | null
}