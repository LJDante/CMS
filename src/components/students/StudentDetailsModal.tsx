import { X, Edit2, Check, X as XIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Student } from '../../types'
import type { Role } from '../../types'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import philippinesData from '../../constants/philippines.json'

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
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  const isNurseOrDoctor = role === 'clinic_staff' || role === 'clinic_doctor' || role === 'clinic_admin'
  const canEdit = isNurseOrDoctor

  const startEdit = () => {
    setFormData({ ...student })
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setFormData(null)
    setIsEditing(false)
  }

  const handleFieldChange = (field: keyof Student, value: any) => {
    if (field === 'sex' && value === 'F') {
      setFormData(prev => prev ? { ...prev, sex: value, suffix: undefined } : null)
    } else {
      setFormData(prev => prev ? { ...prev, [field]: value } : null)
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

  const saveChanges = async () => {
    if (!formData) return

    setIsSaving(true)
    try {
      const updateData = {
        first_name: formData.first_name,
        middle_name: formData.middle_name,
        last_name: formData.last_name,
        suffix: formData.sex === 'M' ? formData.suffix || null : null,
        age: formData.age,
        date_of_birth: formData.date_of_birth,
        contact_number: formData.contact_number,
        guardian_name: formData.guardian_name,
        guardian_contact: formData.guardian_contact,
        guardian_email: formData.guardian_email,
        mother_name: formData.mother_name,
        father_name: formData.father_name,
        person_to_notify: formData.person_to_notify,
        emergency_contact: formData.emergency_contact,
        voucher_type: formData.voucher_type,
        allergies: formData.allergies,
        diagnosed_diseases: formData.diagnosed_diseases,
        address_field: formData.address_field,
        barangay: formData.barangay,
        city: formData.city,
        province: formData.province,
        zip_code: formData.zip_code,
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
                  <p className="text-sm mt-1">{displayData?.date_of_birth || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={displayData?.contact_number || ''}
                    onChange={(e) => handleFieldChange('contact_number', e.target.value)}
                    className="input-field mt-1"
                  />
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
                {student.education_level === 'shs' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">SHS Track</label>
                      <p className="text-sm mt-1">{student.program || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grade</label>
                      <p className="text-sm mt-1">{student.year_level || 'N/A'}</p>
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
                    <input
                      type="tel"
                      value={displayData?.guardian_contact || ''}
                      onChange={(e) => handleFieldChange('guardian_contact', e.target.value)}
                      className="input-field mt-1"
                    />
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
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mother's Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.mother_name || ''}
                    onChange={(e) => handleFieldChange('mother_name', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.mother_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Father's Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.father_name || ''}
                    onChange={(e) => handleFieldChange('father_name', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.father_name || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Person to Notify</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.person_to_notify || ''}
                    onChange={(e) => handleFieldChange('person_to_notify', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.person_to_notify || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Emergency Contact</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={displayData?.emergency_contact || ''}
                    onChange={(e) => handleFieldChange('emergency_contact', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.emergency_contact || 'N/A'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Voucher Type</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={displayData?.voucher_type || ''}
                    onChange={(e) => handleFieldChange('voucher_type', e.target.value)}
                    className="input-field mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{displayData?.voucher_type || 'N/A'}</p>
                )}
              </div>
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
