import type { EducationLevel } from './types/students'

export type Role = 'clinic_staff' | 'clinic_nurse' | 'clinic_admin' | 'clinic_doctor'

export interface Profile {
  id: string
  full_name: string
  role: Role
  created_at: string
}

export interface Patient {
  id: string
  patient_id: string
  patient_type: 'student' | 'personnel'
  first_name: string
  middle_name?: string
  last_name: string
  age?: number
  grade_level?: string
  section?: string
  education_level?: EducationLevel
  program?: string
  year_level?: string
  shs_track?: string
  date_of_birth?: string
  sex: 'M' | 'F'
  contact_number?: string
  guardian_name?: string
  guardian_contact?: string
  guardian_email?: string
  mother_name?: string
  mother_first_name?: string
  mother_middle_name?: string
  mother_last_name?: string
  father_name?: string
  father_first_name?: string
  father_middle_name?: string
  father_last_name?: string
  person_to_notify?: string
  emergency_contact?: string
  voucher_type?: string
  suffix?: 'Jr.' | 'Sr.' | 'II' | 'III' | 'IV'
  father_suffix?: 'Jr.' | 'Sr.' | 'II' | 'III' | 'IV'
  allergies?: string
  diagnosed_diseases?: string
  address_field?: string | null
  barangay?: string
  city?: string
  province?: string
  zip_code?: string
  enrollment_status?: 'active' | 'inactive'
  created_at: string
}

export interface ClinicVisit {
  id: string
  patient_id: string
  visit_date: string
  complaint: string
  assessment?: string
  treatment?: string
  disposition: 'returned_to_class' | 'sent_home' | 'referred' | 'other'
  referred_to?: string
  notes?: string
  entrance_time?: string
  exit_time?: string
  entry_type?: 'entrance' | 'exit'
  temperature?: number
  commuter_status?: 'commuter' | 'non-commuter'
  place_name?: string
  assigned_doctor?: string
  assigned_staff?: string
  created_by: string
  created_at: string
}

export interface MedicalRecord {
  id: string
  patient_id: string
  diagnosed_diseases?: string
  allergies?: string
  immunization_history?: string
  last_updated_at: string
  last_updated_by: string
}

export type InventoryCategory = 'medicine' | 'supply' | 'equipment'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  unit: string
  quantity_on_hand: number
  reorder_level?: number
  expiration_date?: string
  remarks?: string
  created_at: string
}

export interface SupplyRequest {
  id: string
  requested_by: string
  requested_at: string
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  needed_by?: string
  notes?: string
  fulfilled_at?: string
}

export interface SupplyRequestItem {
  id: string
  request_id: string
  inventory_id: string
  quantity: number
}

export interface Consultation {
  id: string
  patient_id: string
  patient_external_id: string
  patient_type: 'student' | 'personnel'
  patient_name: string
  grade_level?: string
  section?: string
  reason: string
  intervention?: string
  actions_taken?: string
  doctors_remarks?: string
  diagnosis_result?: string
  consultation_date: string
  follow_up_date?: string
  prescription_images?: string[]
  attending_staff_name?: string
  doctor_name?: string
  course?: string
  year_level?: string
  shs_track?: string
  blood_pressure?: string
  heart_rate?: number
  oxygen_saturation?: number
  temperature?: number
  height_cm?: number
  weight_kg?: number
  lmp?: string
  medicines?: string
  status?: 'pending' | 'completed' | 'follow_up' | 'cancelled'
  created_by: string
  created_at: string
}

export interface ConsultationNote {
  id: string
  consultation_id: string
  note_text: string
  created_by: string
  created_at: string
}

export interface StudentAccidentReport {
  id: string
  patient_id: string
  accident_date: string
  time_of_accident?: string
  place_of_accident?: string
  description: string
  type_of_injury?: string
  body_parts_affected?: string
  severity?: 'minor' | 'moderate' | 'severe'
  how_accident_occurred?: string
  witness_name?: string
  witness_address?: string
  immediate_cause?: string
  action_by_nurse?: boolean
  sent_home?: boolean
  referred_to_physician?: boolean
  referred_to_hospital?: boolean
  other_action?: string
  parent_notified?: boolean
  parent_notification_date?: string
  follow_up_notes?: string
  notes?: string
  reported_by?: string
  created_at: string
  updated_at: string
}

export interface AccidentReport {
  id: string
  patient_id: string
  file_url: string
  file_name: string
  file_size: number
  uploaded_at: string
  uploaded_by?: string
  created_at: string
}

export interface StaffSchedule {
  id: string
  staff_id: string
  schedule_date: string
  start_time: string
  end_time: string
  is_available: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface StaffScheduleWithProfile extends StaffSchedule {
  staff: Profile
}

export interface PhysicalExamination {
  id: string
  patient_id: string
  exam_date: string
  weight_kg?: number
  height_cm?: number
  bmi?: number
  blood_pressure?: string
  past_illness?: string
  present_illness?: string
  vaccination_status?: 'complete' | 'incomplete'
  remarks?: string
  examined_by?: string
  created_at: string
  updated_at: string
}

export type Student = Patient

export type DentalFormType = 'dental_health_record' | 'dental_health_referral'

export interface DentalRecord {
  id: string
  patient_id: string
  form_type: DentalFormType
  file_url: string
  file_name: string
  file_size?: number
  uploaded_at: string
  uploaded_by: string
  created_at: string
}