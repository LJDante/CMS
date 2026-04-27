import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Student } from '../types'
import type { StudentFormData, EducationLevel } from '../types/students'
import toast from 'react-hot-toast'

export function useStudentForm() {
  const [form, setForm] = useState<StudentFormData>({
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
    shs_track: '',
    shs_grade: '',
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
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [missingColumns, setMissingColumns] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  // helpers for sanitization
  const lettersOnly = (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'. -]/g, '')
  const digitsOnly = (v: string) => v.replace(/\D/g, '')
  const alphanumericStreet = (v: string) => v.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -\d]/g, '')

  const normalizePhone = (val: string | null | undefined) => {
    if (!val) return null
    let digits = String(val).trim().replace(/\D/g, '')

    if (digits.startsWith('63') && digits.length === 12) {
      digits = '0' + digits.slice(2)
    }

    if (digits.length === 10 && digits.startsWith('9')) {
      digits = '0' + digits
    }

    if (digits.length === 11 && digits.startsWith('0')) {
      return digits
    }

    console.log(`Unparseable phone number: ${val} → digits: ${digits}`)
    return null
  }

  const handlePhoneBlur = (field: 'contact_number' | 'guardian_contact' | 'emergency_contact') => {
    const value = form[field]
    const normalized = normalizePhone(value)

    if (normalized) {
      setForm((f) => ({ ...f, [field]: normalized }))
      clearError(field)
      return
    }

    if (value && value.trim() !== '') {
      setError(field, 'Enter an 11-digit Philippine mobile number (e.g. 09171234567)')
    }
  }

  const formatPatientId = (value: string) => {
    const digits = digitsOnly(value).slice(0, 7)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}-${digits.slice(2)}`
  }

  // error helpers
  const setError = (field: string, message: string) => setErrors((e) => ({ ...e, [field]: message }))
  const clearError = (field: string) => setErrors((e) => {
    const { [field]: _removed, ...rest } = e
    return rest
  })

  // probe for missing columns once
  useEffect(() => {
    const probe = async () => {
      const colsToCheck = ['patient_id', 'age', 'date_of_birth', 'education_level', 'guardian_email', 'address_field', 'barangay', 'city', 'province', 'zip_code', 'middle_name', 'patient_type', 'program', 'year_level', 'shs_track', 'suffix', 'father_suffix', 'mother_first_name', 'mother_middle_name', 'mother_last_name', 'father_first_name', 'father_middle_name', 'father_last_name']
      const missing: Record<string, boolean> = {}
      for (const col of colsToCheck) {
        const { error } = await supabase.from('patients').select(col).limit(1)
        if (error && /column .* does not exist/i.test(error.message || '')) {
          missing[col] = true
        }
      }
      if (Object.keys(missing).length > 0) {
        setMissingColumns(missing)
        toast.error(`Missing DB columns: ${Object.keys(missing).join(', ')}. See README to add them.`)
      }
    }
    void probe()
  }, [])

  const mapEducationLevel = (value: string | undefined): string => {
    const map: Record<string, string> = {
      kto12: 'k-12',
      k12: 'k-12',
      'k-12': 'k-12',
      elementary: 'k-12',
      'junior-high-school': 'k-12',
      shs: 'shs',
      SHS: 'shs',
      college: 'college',
      College: 'college',
      kindergarten: 'kindergarten',
      Kindergarten: 'kindergarten',
      'n/a': 'n/a'
    }
    return map[value ?? ''] ?? value?.toLowerCase() ?? 'n/a'
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // ID validation - REQUIRED (format YY-XXXXX)
    const patientIdRegex = /^\d{2}-\d{5}$/
    if (!missingColumns.patient_id) {
      if (!form.student_id || !patientIdRegex.test(form.student_id)) {
        newErrors.student_id = 'ID Number must be in format XX-XXXXX (e.g. 22-10001)'
      }
    } else {
      if (form.student_id) {
        newErrors.student_id = 'Student ID will not be saved because the database column is missing'
      }
    }

    // First name - REQUIRED
    if (!form.first_name || !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(form.first_name)) {
      newErrors.first_name = 'First name is required and must be letters only'
    }

    // Middle name - optional, but if provided must be letters-only
    if (form.middle_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(form.middle_name)) {
      newErrors.middle_name = 'Middle name must be letters only'
    }

    // Last name - REQUIRED
    if (!form.last_name || !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(form.last_name)) {
      newErrors.last_name = 'Last name is required and must be letters only'
    }

    // Age - REQUIRED (1-3 digits only)
    if (!form.age || !/^\d{1,3}$/.test(form.age) || Number(form.age) < 1 || Number(form.age) > 100) {
      newErrors.age = 'Age is required and must be between 1 and 100'
    }

    // Date of birth - REQUIRED
    if (!form.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required'
    }

    // Contact number - REQUIRED (exactly 11 digits)
    if (!form.contact_number || !normalizePhone(form.contact_number)) {
      newErrors.contact_number = 'Contact number is required and must be exactly 11 digits'
    }

    // Address field is optional; barangay/city/province/zip are separate fields.

    // Grade level is required for Kindergarten, K-12, Elementary, and Junior High students
    if (form.patient_type === 'student' && ['kindergarten', 'k-12', 'elementary', 'junior-high-school'].includes(form.education_level) && !form.grade_level) {
      newErrors.grade_level = 'Grade level is required for K-12, Kindergarten, and Elementary education'
    }
    // Grade level validation
    if (form.patient_type === 'student' && form.education_level === 'kindergarten' && form.grade_level && !/^[Kk]?\d{0,2}$/.test(form.grade_level)) {
      newErrors.grade_level = 'Grade level must be K or a number for Kindergarten'
    }
    if (form.patient_type === 'student' && form.education_level === 'elementary' && form.grade_level && !/^[1-6]$/.test(form.grade_level)) {
      newErrors.grade_level = 'Grade level must be 1-6 for Elementary'
    }
    if (form.patient_type === 'student' && form.education_level === 'junior-high-school' && form.grade_level && !/^(7|8|9|10)$/.test(form.grade_level)) {
      newErrors.grade_level = 'Grade level must be 7-10 for Junior High School'
    }

    // Require additional fields for SHS and College students
    if (form.patient_type === 'student' && form.education_level === 'shs') {
      if (!form.shs_grade || !['11', '12'].includes(form.shs_grade)) {
        newErrors.shs_grade = 'SHS grade is required and must be 11 or 12'
      }
      if (['11', '12'].includes(form.shs_grade) && !form.shs_track) {
        newErrors.shs_track = 'SHS track is required'
      }
    }
    if (form.patient_type === 'student' && form.education_level === 'college') {
      if (!form.college_course) newErrors.college_course = 'College course is required'
      if (!form.college_year) newErrors.college_year = 'College year is required'
    }

    // Guardian fields - REQUIRED for students
    if (form.patient_type === 'student') {
      if (!form.guardian_name || !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(form.guardian_name)) {
        newErrors.guardian_name = 'Guardian name is required for students'
      }
      if (!form.guardian_contact || !normalizePhone(form.guardian_contact)) {
        newErrors.guardian_contact = 'Guardian contact is required and must be exactly 11 digits'
      }
      if (!form.guardian_email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(form.guardian_email)) {
        newErrors.guardian_email = 'Enter a valid email address (example@example.com)'
      }
    }

    if (form.mother_first_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(form.mother_first_name)) {
      newErrors.mother_first_name = 'Name must contain letters only'
    }
    if (form.mother_middle_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(form.mother_middle_name)) {
      newErrors.mother_middle_name = 'Name must contain letters only'
    }
    if (form.mother_last_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(form.mother_last_name)) {
      newErrors.mother_last_name = 'Name must contain letters only'
    }
    if (form.father_first_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(form.father_first_name)) {
      newErrors.father_first_name = 'Name must contain letters only'
    }
    if (form.father_middle_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(form.father_middle_name)) {
      newErrors.father_middle_name = 'Name must contain letters only'
    }
    if (form.father_last_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(form.father_last_name)) {
      newErrors.father_last_name = 'Name must contain letters only'
    }

    if (form.allergies && /\d/.test(form.allergies)) {
      newErrors.allergies = 'Allergies should not contain numbers'
    }

    if (form.emergency_contact && !normalizePhone(form.emergency_contact)) {
      newErrors.emergency_contact = 'Emergency contact must be exactly 11 digits'
    }

    if (form.emergency_contact && !form.person_to_notify) {
      newErrors.person_to_notify = 'Please provide the emergency contact name'
    }

    if (form.person_to_notify && !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(form.person_to_notify)) {
      newErrors.person_to_notify = 'Emergency contact name must contain letters only'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Numeric-only fields (enforce max lengths)
    if (
      name === 'student_id' ||
      name === 'age' ||
      name === 'grade_level' ||
      name === 'zip_code'
    ) {
      let digits = digitsOnly(value)
      if (name === 'student_id') {
        const formatted = formatPatientId(value)
        setForm((f) => ({ ...f, [name]: formatted }))
        clearError(name)
        return
      }
      if (name === 'age') digits = digits.slice(0, 3)
      if (name === 'grade_level') digits = digits.slice(0, 2)
      if (name === 'zip_code') digits = digits.slice(0, 4)
      setForm((f) => ({ ...f, [name]: digits }))
      clearError(name)
      return
    }

    if (name === 'sex') {
      setForm((f) => ({
        ...f,
        sex: value as 'M' | 'F',
        suffix: value === 'F' ? '' : f.suffix
      }))
      clearError(name)
      return
    }

    // Guardian name - letters only
    if (name === 'guardian_name') {
      const letters = lettersOnly(value)
      setForm((f) => ({ ...f, guardian_name: letters }))
      clearError(name)
      return
    }

    // Parents' names - letters only
    if ([
      'mother_name',
      'father_name',
      'mother_first_name',
      'mother_middle_name',
      'mother_last_name',
      'father_first_name',
      'father_middle_name',
      'father_last_name'
    ].includes(name)) {
      const letters = lettersOnly(value)
      setForm((f) => ({ ...f, [name]: letters }))
      clearError(name)
      return
    }

    // Letters-only fields
    if (name === 'first_name' || name === 'middle_name' || name === 'last_name') {
      const letters = lettersOnly(value)
      setForm((f) => ({ ...f, [name]: letters }))
      clearError(name)
      return
    }

    // Allergies: no numbers
    if (name === 'allergies') {
      const cleaned = value.replace(/\d/g, '')
      setForm((f) => ({ ...f, allergies: cleaned }))
      clearError('allergies')
      return
    }


    // Emergency contact name - letters only
    if (name === 'person_to_notify') {
      const letters = lettersOnly(value)
      setForm((f) => ({ ...f, person_to_notify: letters }))
      clearError('person_to_notify')
      return
    }

    // Email validation for guardian_email (allow any domain)
    if (name === 'guardian_email') {
      setForm((f) => ({ ...f, guardian_email: value }))
      if (value && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(value)) {
        setError('guardian_email', 'Enter a valid email address')
      } else {
        clearError('guardian_email')
      }
      return
    }

    // Education level changes — auto-fill kindergarten grade and clear dependent fields
    if (name === 'education_level') {
      setForm((f) => ({
        ...f,
        education_level: value as EducationLevel,
        grade_level: value === 'kindergarten' ? 'K' : '',
        section: '',
        shs_track: value === 'shs' ? f.shs_track : '',
        shs_grade: value === 'shs' ? f.shs_grade : '',
        college_course: value === 'college' ? f.college_course : '',
        college_year: value === 'college' ? f.college_year : ''
      }))
      clearError('grade_level')
      clearError('shs_track')
      clearError('shs_grade')
      clearError('college_course')
      clearError('college_year')
      return
    }

    if (name === 'shs_grade') {
      let grade = value.replace(/\D/g, '').slice(0, 2)
      if (grade && !['11', '12'].includes(grade)) {
        grade = ''
      }
      setForm((f) => ({
        ...f,
        shs_grade: grade,
        shs_track: ['11', '12'].includes(grade) ? f.shs_track : ''
      }))
      clearError('shs_grade')
      clearError('shs_track')
      return
    }

    // Dependent required fields: clear errors when edited
    if (name === 'grade_level' || name === 'shs_track' || name === 'shs_grade' || name === 'college_course' || name === 'college_year') {
      setForm((f) => ({ ...f, [name]: value }))
      clearError(name)
      return
    }

    // Date of birth
    if (name === 'date_of_birth') {
      setForm((f) => ({ ...f, [name]: value }))
      clearError(name)
      return
    }

    // default
    setForm((f) => ({ ...f, [name]: value }))
  }

  const submitForm = async (onSuccess: (student: Student) => void) => {
    if (!validateForm()) {
      toast.error('Please fix validation errors')
      return
    }

    setSubmitting(true)

    try {
      // Duplicate handling: prevent same patient_id
      if (!missingColumns.patient_id) {
        const { data: existing, error: dupErr } = await supabase
          .from('patients')
          .select('id')
          .eq('patient_id', form.student_id)
          .limit(1)
        if (dupErr) {
          console.error('Duplicate check failed', dupErr)
          toast.error(`Failed to check duplicates: ${dupErr.message}`)
          return
        }

        if (Array.isArray(existing) && existing.length > 0) {
          toast.error('A record with this ID already exists.')
          return
        }
      } else {
        console.warn('Skipping duplicate ID check: database does not have patient_id/student_id column')
      }

      const isStudent = form.patient_type === 'student'
      let education_level: string = isStudent ? form.education_level : 'n/a'
      let grade_level: string | null = null
      let program: string | null = null
      let year_level: string | null = null
      let shs_track: string | null = null

      education_level = mapEducationLevel(education_level)
      if (isStudent) {
        if (education_level === 'k-12' || education_level === 'kindergarten') {
          grade_level = form.grade_level || null
        } else if (education_level === 'shs') {
          grade_level = form.shs_grade || null
          shs_track = form.shs_track || null
        } else if (education_level === 'college') {
          program = form.college_course
          year_level = form.college_year
        }
      } else {
        education_level = 'n/a'
      }

      // build insert payload and omit columns that are missing in the DB schema
      const payload: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name,
        grade_level,
        section: isStudent && ['k-12', 'kindergarten', 'shs'].includes(education_level) ? form.section || null : null,
        sex: form.sex,
        contact_number: normalizePhone(form.contact_number),
        guardian_name: form.guardian_name || null,
        guardian_contact: normalizePhone(form.guardian_contact),
        person_to_notify: form.person_to_notify || null,
        emergency_contact: normalizePhone(form.emergency_contact),
        voucher_type: form.voucher_type || null
      }

      if (!missingColumns.mother_first_name) payload.mother_first_name = form.mother_first_name || null
      if (!missingColumns.mother_middle_name) payload.mother_middle_name = form.mother_middle_name || null
      if (!missingColumns.mother_last_name) payload.mother_last_name = form.mother_last_name || null
      if (!missingColumns.father_first_name) payload.father_first_name = form.father_first_name || null
      if (!missingColumns.father_middle_name) payload.father_middle_name = form.father_middle_name || null
      if (!missingColumns.father_last_name) payload.father_last_name = form.father_last_name || null

      if (!missingColumns.patient_id) payload.patient_id = form.student_id
      if (!missingColumns.age) payload.age = form.age ? Number(form.age) : null
      if (!missingColumns.date_of_birth) payload.date_of_birth = form.date_of_birth || null
      if (!missingColumns.education_level) payload.education_level = education_level
      if (!missingColumns.guardian_email && isStudent) payload.guardian_email = form.guardian_email || null
      if (!missingColumns.address_field) payload.address_field = form.address_field || null
      if (!missingColumns.barangay) payload.barangay = form.barangay || null
      if (!missingColumns.city) payload.city = form.city || null
      if (!missingColumns.province) payload.province = form.province || null
      if (!missingColumns.zip_code) payload.zip_code = form.zip_code || null
      if (!missingColumns.middle_name) payload.middle_name = form.middle_name || null
      if (!missingColumns.patient_type) payload.patient_type = form.patient_type
      if (!missingColumns.suffix) payload.suffix = form.sex === 'M' ? form.suffix || null : null
      if (!missingColumns.father_suffix) payload.father_suffix = form.father_suffix || null
      if (!missingColumns.program) payload.program = program
      if (!missingColumns.year_level) payload.year_level = year_level
      if (!missingColumns.shs_track) payload.shs_track = shs_track

      // Ensure grade_level is at least an empty string to avoid NOT NULL DB failures in some schemas
      if (payload.grade_level == null) payload.grade_level = ''

      const { data, error } = await supabase
        .from('patients')
        .insert(payload)
        .select()
        .single()

      if (error || !data) {
        const msg = error && (error.message as string)
        const detail = (error && (error.details as string)) || ''
        const hint = (error && (error.hint as string)) || ''
        const verbose = [msg, detail, hint].filter(Boolean).join(' — ')
        toast.error(verbose || 'Failed to save record')
        return
      }

      const saved = data as Student

      // Store basic medical history in medical_records table
      if (form.allergies || form.diagnosed_diseases) {
        const { error: mrErr } = await supabase.from('medical_records').insert({
          patient_id: saved.id,
          allergies: form.allergies || null,
          diagnosed_diseases: form.diagnosed_diseases || null
        })
        if (mrErr) {
          toast.error(mrErr.message || 'Failed to save medical history')
        }
      }

      onSuccess(saved)
      resetForm()
      toast.success('Record added')
    } catch (err) {
      console.error('Failed to submit form:', err)
      toast.error('Failed to save record')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm({
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
    })
    setErrors({})
  }

  return {
    form,
    errors,
    missingColumns,
    submitting,
    handleChange,
    handlePhoneBlur,
    submitForm,
    resetForm
  }
}