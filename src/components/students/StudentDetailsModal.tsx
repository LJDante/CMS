import { X, Edit2, Check, X as XIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Role, Student } from '../../types'

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'N/A'
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return 'N/A'
  }
}

const formatParentFullName = (first?: string | null, middle?: string | null, last?: string | null, suffix?: string | null) => {
  const parts = [first, middle, last]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
  if (parts.length === 0) return 'N/A'
  const name = parts.join(' ')
  return suffix ? `${name} ${suffix}` : name
}
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import philippinesData from '../../constants/philippines.json'
import type { EducationLevel } from '../../types/students'

interface StudentDetailsModalProps {
  student: Student | null
  isOpen: boolean
  onClose: () => void
  role?: Role
  onStudentUpdated?: (student: Student) => void
}

export function StudentDetailsModal({ student, isOpen, onClose, role, onStudentUpdated }: StudentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Student> | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  const isNurseOrDoctor = role === 'clinic_staff' || role === 'clinic_nurse' || role === 'clinic_doctor' || role === 'clinic_admin'
  const canEdit = isNurseOrDoctor

  const startEdit = () => {
    setFormData({ ...student })
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setFormData(null)
    setIsEditing(false)
  }

  const normalizePhone = (val: any) => {
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

  const handleFieldChange = (field: keyof Student, value: any) => {
    if (field === 'sex' && value === 'F') {
      setFormData(prev => prev ? { ...prev, sex: value, suffix: undefined } : null)
    } else {
      setFormData(prev => prev ? { ...prev, [field]: value } : null)
    }

    if (field === 'contact_number' || field === 'guardian_contact' || field === 'emergency_contact') {
      setFieldErrors((prev) => {
        const { [field]: _removed, ...rest } = prev
        return rest
      })
    }
  }

  const handlePhoneBlur = (field: keyof Student) => {
    if (!formData) return
    const value = String(formData[field] || '')
    const normalized = normalizePhone(value)

    if (normalized) {
      setFormData((prev) => prev ? { ...prev, [field]: normalized } : prev)
      setFieldErrors((prev) => {
        const { [field]: _removed, ...rest } = prev
        return rest
      })
      return
    }

    if (value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [field]: 'Enter an 11-digit Philippine mobile number (e.g. 09171234567)' }))
    }
  }

  useEffect(() => {
    if (formData?.province) {
      setSelectedProvince(formData.province)
    } else {
      setSelectedProvince('')
    }
  }, [formData?.province])

  useEffect(() => {
    if (formData?.city) {
      setSelectedCity(formData.city)
    } else {
      setSelectedCity('')
    }
  }, [formData?.city])

  if (!isOpen || !student) {
    return null
  }

  const isGradeLevelEducation = (level?: EducationLevel | null): level is 'elementary' | 'junior-high-school' | 'kindergarten' =>
    level === 'elementary' || level === 'junior-high-school' || level === 'kindergarten'

  const saveChanges = async () => {
    if (!formData) return

    setIsSaving(true)
    try {
      const contactNumber = normalizePhone(formData.contact_number)
      const guardianContact = normalizePhone(formData.guardian_contact)
      const emergencyContact = normalizePhone(formData.emergency_contact)

      if (formData.contact_number && !contactNumber) {
        setFieldErrors((prev) => ({ ...prev, contact_number: 'Enter an 11-digit Philippine mobile number (e.g. 09171234567)' }))
        toast.error('Please fix invalid phone numbers before saving')
        return
      }

      if (formData.guardian_contact && !guardianContact) {
        setFieldErrors((prev) => ({ ...prev, guardian_contact: 'Enter an 11-digit Philippine mobile number (e.g. 09171234567)' }))
        toast.error('Please fix invalid phone numbers before saving')
        return
      }

      if (formData.emergency_contact && !emergencyContact) {
        setFieldErrors((prev) => ({ ...prev, emergency_contact: 'Enter an 11-digit Philippine mobile number (e.g. 09171234567)' }))
        toast.error('Please fix invalid phone numbers before saving')
        return
      }

      const updateData = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        suffix: formData.sex === 'M' ? formData.suffix || null : null,
        age: formData.age,
        date_of_birth: formData.date_of_birth,
        contact_number: contactNumber,
        guardian_name: formData.guardian_name,
        guardian_contact: guardianContact,
        guardian_email: formData.guardian_email,
        mother_first_name: formData.mother_first_name || null,
        mother_middle_name: formData.mother_middle_name || null,
        mother_last_name: formData.mother_last_name || null,
        father_first_name: formData.father_first_name || null,
        father_middle_name: formData.father_middle_name || null,
        father_last_name: formData.father_last_name || null,
        father_suffix: formData.father_suffix || null,
        person_to_notify: formData.person_to_notify,
        emergency_contact: emergencyContact,
        voucher_type: formData.voucher_type,
        allergies: formData.allergies,
        diagnosed_diseases: formData.diagnosed_diseases,
        address_field: formData.address_field,
        barangay: formData.barangay,
        city: formData.city,
        province: formData.province,
        zip_code: formData.zip_code,
        education_level: formData.education_level || null,
        grade_level: ['k-12', 'kindergarten', 'shs'].includes(formData.education_level || '') ? formData.grade_level || null : null,
        section: ['k-12', 'kindergarten'].includes(formData.education_level || '') ? formData.section || null : null,
        shs_track: formData.education_level === 'shs' ? formData.shs_track || null : null,
        program: formData.education_level === 'college' ? formData.program || null : null,
        year_level: formData.education_level === 'college' ? formData.year_level || null : null,
      }

      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', student.id)

      if (error) {
        console.error('Failed to update patient:', error)
        toast.error('Failed to save changes')
        return
      }

      toast.success('Patient information updated successfully')
      setIsEditing(false)

      if (onStudentUpdated) {
        onStudentUpdated({ ...student, ...updateData } as Student)
      }
    } catch (err) {
      console.error('Error saving patient:', err)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const displayData = isEditing ? formData : student

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-800">{isEditing ? 'Edit Patient Information' : 'Patient Details'}</h2>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-2 rounded px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                title="Edit patient information"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">ID Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.patient_id || ''}
                    disabled
                    className="input-field mt-1 bg-gray-200"
                  />
                ) : (
                  <p className="text-sm font-mono mt-1">{displayData?.patient_id}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Patient Type</label>
                {isEditing ? (
                  <select
                    value={displayData?.patient_type || 'student'}
                    onChange={(e) => handleFieldChange('patient_type', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="student">Student</option>
                    <option value="personnel">Personnel</option>
                  </select>
                ) : (
                  <p className="text-sm mt-1 capitalize">{displayData?.patient_type}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.first_name || ''}
                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.first_name}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Middle Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.middle_name || ''}
                    onChange={(e) => handleFieldChange('middle_name', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.middle_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.last_name || ''}
                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">
                    {displayData?.last_name}
                    {displayData?.suffix ? ` ${displayData.suffix}` : ''}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Suffix</label>
                {isEditing ? (
                  displayData?.sex === 'M' ? (
                    <select
                      value={displayData?.suffix || ''}
                      onChange={(e) => handleFieldChange('suffix', e.target.value)}
                      className="input-field mt-1"
                    >
                      <option value="">None</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                  ) : (
                    <p className="text-sm mt-1">N/A</p>
                  )
                ) : (
                  <p className="text-sm mt-1">{displayData?.suffix || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sex</label>
                {isEditing ? (
                  <select
                    value={displayData?.sex || 'M'}
                    onChange={(e) => handleFieldChange('sex', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                ) : (
                  <p className="text-sm mt-1">{displayData?.sex === 'M' ? 'Male' : 'Female'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Age</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={displayData?.age || ''}
                    onChange={(e) => handleFieldChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.age || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={displayData?.date_of_birth || ''}
                    onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{formatDate(displayData?.date_of_birth || null)}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact Number</label>
                {isEditing ? (
                  <>
                    <input
                      type="tel"
                      value={displayData?.contact_number || ''}
                      onChange={(e) => handleFieldChange('contact_number', e.target.value)}
                      onBlur={() => handlePhoneBlur('contact_number')}
                      className="input-field mt-1"
                    />
                    {fieldErrors.contact_number && <p className="text-xs text-red-600 mt-1">{fieldErrors.contact_number}</p>}
                  </>
                ) : (
                  <p className="text-sm mt-1">{displayData?.contact_number || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Education Information (for students) */}
          {student.patient_type === 'student' && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Education Information</h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Education Level</label>
                      <select
                        value={displayData?.education_level || 'elementary'}
                        onChange={(e) => handleFieldChange('education_level', e.target.value)}
                        className="input-field mt-1"
                      >
                        <option value="kindergarten">Kindergarten</option>
                        <option value="elementary">Elementary (Grades 1–6)</option>
                        <option value="junior-high-school">Junior High School (Grades 7–10)</option>
                        <option value="shs">Senior High School</option>
                        <option value="college">College</option>
                      </select>
                    </div>
                    {isGradeLevelEducation(displayData?.education_level) && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grade Level</label>
                          {displayData?.education_level === 'kindergarten' ? (
                            <input
                              type="text"
                              value={displayData?.grade_level || 'K'}
                              readOnly
                              aria-readonly="true"
                              className="input-field mt-1"
                            />
                          ) : (
                            <select
                              name="grade_level"
                              value={displayData?.grade_level || ''}
                              onChange={(e) => handleFieldChange('grade_level', e.target.value)}
                              className="input-field mt-1"
                            >
                              <option value="">Select Grade Level</option>
                              <optgroup label="Elementary">
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="6">6</option>
                              </optgroup>
                              <optgroup label="Junior High School">
                                <option value="7">7</option>
                                <option value="8">8</option>
                                <option value="9">9</option>
                                <option value="10">10</option>
                              </optgroup>
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Section</label>
                          <input
                            type="text"
                            value={displayData?.section || ''}
                            onChange={(e) => handleFieldChange('section', e.target.value)}
                            className="input-field mt-1"
                            placeholder="e.g. Rizal"
                          />
                        </div>
                      </>
                    )}
                    {displayData?.education_level === 'shs' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grade Level</label>
                          <select
                            name="grade_level"
                            value={displayData?.grade_level || ''}
                            onChange={(e) => handleFieldChange('grade_level', e.target.value)}
                            className="input-field mt-1"
                          >
                            <option value="">Select SHS Grade</option>
                            <option value="11">11</option>
                            <option value="12">12</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">SHS Track</label>
                          <select
                            name="shs_track"
                            value={displayData?.shs_track || ''}
                            onChange={(e) => handleFieldChange('shs_track', e.target.value)}
                            className="input-field mt-1"
                          >
                            <option value="">Select SHS Track</option>
                            <option value="ABM">ABM</option>
                            <option value="HUMSS">HUMSS</option>
                            <option value="STEM">STEM</option>
                          </select>
                        </div>
                      </>
                    )}
                    {displayData?.education_level === 'college' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Course</label>
                          <input
                            type="text"
                            value={displayData?.program || ''}
                            onChange={(e) => handleFieldChange('program', e.target.value)}
                            className="input-field mt-1"
                            placeholder="e.g. BSCS"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Year Level</label>
                          <select
                            name="year_level"
                            value={displayData?.year_level || ''}
                            onChange={(e) => handleFieldChange('year_level', e.target.value)}
                            className="input-field mt-1"
                          >
                            <option value="">Select Year Level</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Education Level</label>
                      <p className="text-sm mt-1 capitalize">{student.education_level?.replace('-', ' ') || 'N/A'}</p>
                    </div>
                    {(student.education_level === 'k-12' || student.education_level === 'kindergarten') && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grade Level</label>
                          <p className="text-sm mt-1">{student.grade_level || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Section</label>
                          <p className="text-sm mt-1">{student.section || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    {(student.education_level === 'shs' || student.shs_track) && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">SHS Track</label>
                          <p className="text-sm mt-1">{student.shs_track || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grade</label>
                          <p className="text-sm mt-1">{student.grade_level || student.year_level || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    {student.education_level === 'college' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Course</label>
                          <p className="text-sm mt-1">{student.program || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Year Level</label>
                          <p className="text-sm mt-1">{student.year_level || 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Guardian Information (for students) */}
          {displayData?.patient_type === 'student' && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Guardian / Parent Information</h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Guardian Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={displayData?.guardian_name || ''}
                      onChange={(e) => handleFieldChange('guardian_name', e.target.value)}
                      className="input-field mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{displayData?.guardian_name || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Guardian Contact</label>
                  {isEditing ? (
                    <>
                      <input
                        type="tel"
                        value={displayData?.guardian_contact || ''}
                        onChange={(e) => handleFieldChange('guardian_contact', e.target.value)}
                        onBlur={() => handlePhoneBlur('guardian_contact')}
                        className="input-field mt-1"
                      />
                      {fieldErrors.guardian_contact && <p className="text-xs text-red-600 mt-1">{fieldErrors.guardian_contact}</p>}
                    </>
                  ) : (
                    <p className="text-sm mt-1">{displayData?.guardian_contact || 'N/A'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Guardian Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={displayData?.guardian_email || ''}
                      onChange={(e) => handleFieldChange('guardian_email', e.target.value)}
                      className="input-field mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{displayData?.guardian_email || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parents & Emergency Contact (for students) */}
          {displayData?.patient_type === 'student' && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Parents & Emergency Contact</h3>
            <div className="grid grid-cols-3 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mother's First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.mother_first_name || ''}
                    onChange={(e) => handleFieldChange('mother_first_name', e.target.value)}
                    className="input-field mt-1"
                    placeholder="First name"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.mother_first_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mother's Middle Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.mother_middle_name || ''}
                    onChange={(e) => handleFieldChange('mother_middle_name', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Middle name"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.mother_middle_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mother's Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.mother_last_name || ''}
                    onChange={(e) => handleFieldChange('mother_last_name', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Last name"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.mother_last_name || 'N/A'}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 rounded-lg bg-gray-50 p-4 mt-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Father's First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.father_first_name || ''}
                    onChange={(e) => handleFieldChange('father_first_name', e.target.value)}
                    className="input-field mt-1"
                    placeholder="First name"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.father_first_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Father's Middle Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.father_middle_name || ''}
                    onChange={(e) => handleFieldChange('father_middle_name', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Middle name"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.father_middle_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Father's Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.father_last_name || ''}
                    onChange={(e) => handleFieldChange('father_last_name', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Last name"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.father_last_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Father's Suffix</label>
                {isEditing ? (
                  <select
                    value={displayData?.father_suffix || ''}
                    onChange={(e) => handleFieldChange('father_suffix', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                ) : (
                  <p className="text-sm mt-1">{displayData?.father_suffix || 'None'}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 mt-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Person to Notify</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.person_to_notify || ''}
                    onChange={(e) => handleFieldChange('person_to_notify', e.target.value)}
                    className="input-field mt-1"
                    placeholder="Name of emergency contact person"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.person_to_notify || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Emergency Contact</label>
                {isEditing ? (
                  <>
                    <input
                      type="tel"
                      value={displayData?.emergency_contact || ''}
                      onChange={(e) => handleFieldChange('emergency_contact', e.target.value)}
                      onBlur={() => handlePhoneBlur('emergency_contact')}
                      className="input-field mt-1"
                      placeholder="e.g. 0919 123 4567"
                    />
                    {fieldErrors.emergency_contact && <p className="text-xs text-red-600 mt-1">{fieldErrors.emergency_contact}</p>}
                  </>
                ) : (
                  <p className="text-sm mt-1">{displayData?.emergency_contact || 'N/A'}</p>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 mt-4">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Voucher Type</label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayData?.voucher_type || ''}
                  onChange={(e) => handleFieldChange('voucher_type', e.target.value)}
                  className="input-field mt-1"
                  placeholder="e.g., ESC, Private, Public"
                />
              ) : (
                <p className="text-sm mt-1">{displayData?.voucher_type || 'N/A'}</p>
              )}
            </div>
          </div>
          )}

          {/* Address Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Address</h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.address_field || ''}
                    onChange={(e) => handleFieldChange('address_field', e.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g. Blk 4 Lot 12, Purok 3, Greenville Subd."
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.address_field || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Barangay</label>
                {isEditing ? (
                  selectedProvince && selectedCity && (philippinesData.barangays as any)?.[selectedProvince]?.[selectedCity]?.length > 0 ? (
                    <select
                      value={displayData?.barangay || ''}
                      onChange={(e) => handleFieldChange('barangay', e.target.value)}
                      className="input-field mt-1"
                    >
                      <option value="">Select Barangay</option>
                      {((philippinesData.barangays as any)[selectedProvince][selectedCity] || []).map((barangay: string) => (
                        <option key={barangay} value={barangay}>
                          {barangay}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={displayData?.barangay || ''}
                      onChange={(e) => handleFieldChange('barangay', e.target.value)}
                      className="input-field mt-1"
                      placeholder="e.g., Barangay San Isidro"
                    />
                  )
                ) : (
                  <p className="text-sm mt-1">{displayData?.barangay || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">City</label>
                {isEditing ? (
                  <select
                    value={displayData?.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="">Select City</option>
                    {selectedProvince && (philippinesData.cities as any)[selectedProvince]?.map((city: string) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm mt-1">{displayData?.city || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Province</label>
                {isEditing ? (
                  <select
                    value={displayData?.province || ''}
                    onChange={(e) => {
                      handleFieldChange('province', e.target.value)
                      setSelectedProvince(e.target.value)
                      // Clear city when province changes
                      handleFieldChange('city', '')
                    }}
                    className="input-field mt-1"
                  >
                    <option value="">Select Province</option>
                    {philippinesData.provinces.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm mt-1">{displayData?.province || 'N/A'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">ZIP Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.zip_code || ''}
                    onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                    className="input-field mt-1"
                    placeholder="4 digits"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.zip_code || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Medical Information</h3>
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Allergies</label>
                {isEditing ? (
                  <textarea
                    value={displayData?.allergies || ''}
                    onChange={(e) => handleFieldChange('allergies', e.target.value)}
                    className="input-field mt-2"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.allergies || 'None reported'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Diagnosed Diseases</label>
                {isEditing ? (
                  <textarea
                    value={displayData?.diagnosed_diseases || ''}
                    onChange={(e) => handleFieldChange('diagnosed_diseases', e.target.value)}
                    className="input-field mt-2"
                    rows={2}
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.diagnosed_diseases || 'None reported'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Registration Date */}
          <div className="rounded-lg bg-blue-50 p-4">
            <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">Registration Date</label>
            <p className="text-sm mt-1 text-blue-900">
              {new Date(student.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-slate-200 sticky bottom-0 bg-white">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <XIcon className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={saveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
