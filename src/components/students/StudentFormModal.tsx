import { useState, useEffect } from 'react'
import type { Student } from '../../types'
import type { StudentFormData } from '../../types/students'
import { shsTracks, collegeCourses } from '../../types/students'
import { useStudentForm } from '../../hooks/useStudentForm'
import philippinesData from '../../constants/philippines.json'

interface StudentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (student: Student) => void
}

export function StudentFormModal({ isOpen, onClose, onSuccess }: StudentFormModalProps) {
  const {
    form,
    errors,
    missingColumns,
    submitting,
    handleChange,
    submitForm
  } = useStudentForm()

  const [showMedicalFields, setShowMedicalFields] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  useEffect(() => {
    setSelectedProvince(form.province)
  }, [form.province])

  useEffect(() => {
    setSelectedCity(form.city)
  }, [form.city])

  if (!isOpen) return null

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    handleChange(e)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitForm(onSuccess)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Register patient</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {Object.keys(missingColumns).length > 0 && (
            <div className="rounded-md bg-yellow-50 p-3 text-yellow-800 text-sm">
              Database missing columns: {Object.keys(missingColumns).join(', ')}. Saved records will omit these fields — run the migration in the README to add them.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Patient type</label>
              <select
                name="patient_type"
                value={form.patient_type}
                onChange={handleFormChange}
                className="input-field"
              >
                <option value="student">Student</option>
                <option value="personnel">School personnel</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">ID number</label>
              <input
                name="student_id"
                value={form.student_id}
                onChange={handleFormChange}
                className="input-field"
                inputMode="numeric"
                pattern="\d{7}"
                maxLength={7}
                placeholder="7 digits"
                required
              />
              {missingColumns.patient_id && (
                <p className="text-xs text-yellow-700 mt-1">
                  Note: The database schema is missing <code>patient_id</code>/<code>student_id</code>, so this value will not be saved.
                </p>
              )}
              {errors.student_id && <p className="text-xs text-red-600 mt-1">{errors.student_id}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">First name</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleFormChange}
                className="input-field"
                required
              />
              {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Middle name</label>
              <input
                name="middle_name"
                value={form.middle_name}
                onChange={handleFormChange}
                className="input-field"
              />
              {errors.middle_name && <p className="text-xs text-red-600 mt-1">{errors.middle_name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Last name</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleFormChange}
                className="input-field"
                required
              />
              {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name}</p>}
            </div>
            <div>
              {form.sex === 'M' ? (
                <>
                  <label className="mb-1 block text-sm font-medium">Suffix</label>
                  <select
                    name="suffix"
                    value={form.suffix}
                    onChange={handleFormChange}
                    className="input-field"
                  >
                    <option value="">None</option>
                    <option value="Jr.">Jr.</option>
                    <option value="Sr.">Sr.</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </>
              ) : (
                <div />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Age</label>
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleFormChange}
                className="input-field"
                min={1}
                max={100}
                placeholder="1-100"
                required
              />
              {errors.age && <p className="text-xs text-red-600 mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date of birth</label>
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleFormChange}
                className="input-field"
                required
              />
              {errors.date_of_birth && <p className="text-xs text-red-600 mt-1">{errors.date_of_birth}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Sex</label>
              <select
                name="sex"
                value={form.sex}
                onChange={handleFormChange}
                className="input-field"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Contact number</label>
              <input
                name="contact_number"
                value={form.contact_number}
                onChange={handleFormChange}
                className="input-field"
                inputMode="numeric"
                pattern="\d{11}"
                maxLength={11}
                placeholder="11 digits"
                required
              />
              {errors.contact_number && <p className="text-xs text-red-600 mt-1">{errors.contact_number}</p>}
            </div>
          </div>

          {form.patient_type === 'student' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Education level</label>
                <select
                  name="education_level"
                  value={form.education_level}
                  onChange={handleFormChange}
                  className="input-field"
                >
                  <option value="kindergarten">Kindergarten</option>
                  <option value="elementary">Elementary (Grades 1–6)</option>
                  <option value="junior-high-school">Junior High School (Grades 7–10)</option>
                  <option value="shs">Senior High School</option>
                  <option value="college">College</option>
                </select>
              </div>
              {(form.education_level === 'elementary' || form.education_level === 'junior-high-school' || form.education_level === 'kindergarten') && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Grade level</label>
                    <input
                      name="grade_level"
                      value={form.grade_level}
                      onChange={handleFormChange}
                      className="input-field"
                      inputMode="numeric"
                      maxLength={2}
                      placeholder={form.education_level === 'kindergarten' ? 'e.g. K' : form.education_level === 'elementary' ? 'e.g. 3' : 'e.g. 8'}
                      readOnly={form.education_level === 'kindergarten'}
                      aria-readonly={form.education_level === 'kindergarten'}
                    />
                    {errors.grade_level && <p className="text-xs text-red-600 mt-1">{errors.grade_level}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Section</label>
                    <input
                      name="section"
                      value={form.section}
                      onChange={handleFormChange}
                      className="input-field"
                      placeholder="e.g. Rizal"
                    />
                  </div>
                </>
              )}
              {form.education_level === 'shs' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">SHS track</label>
                    <select
                      name="shs_track"
                      value={form.shs_track}
                      onChange={handleFormChange}
                      className="input-field"
                    >
                      {shsTracks.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {errors.shs_track && <p className="text-xs text-red-600 mt-1">{errors.shs_track}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Grade</label>
                    <select
                      name="shs_grade"
                      value={form.shs_grade}
                      onChange={handleFormChange}
                      className="input-field"
                    >
                      <option value="11">11</option>
                      <option value="12">12</option>
                    </select>
                    {errors.shs_grade && <p className="text-xs text-red-600 mt-1">{errors.shs_grade}</p>}
                  </div>
                </>
              )}
              {form.education_level === 'college' && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Course</label>
                    <select
                      name="college_course"
                      value={form.college_course}
                      onChange={handleFormChange}
                      className="input-field"
                    >
                      {collegeCourses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.college_course && <p className="text-xs text-red-600 mt-1">{errors.college_course}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Year level</label>
                    <select
                      name="college_year"
                      value={form.college_year}
                      onChange={handleFormChange}
                      className="input-field"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                    </select>
                    {errors.college_year && <p className="text-xs text-red-600 mt-1">{errors.college_year}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {form.patient_type === 'student' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Guardian / parent name</label>
                <input
                  name="guardian_name"
                  value={form.guardian_name}
                  onChange={handleFormChange}
                  className="input-field"
                  required
                />
                {errors.guardian_name && <p className="text-xs text-red-600 mt-1">{errors.guardian_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Guardian contact number
                </label>
                <input
                  name="guardian_contact"
                  value={form.guardian_contact}
                  onChange={handleFormChange}
                  className="input-field"
                  required
                />
                {errors.guardian_contact && <p className="text-xs text-red-600 mt-1">{errors.guardian_contact}</p>}
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Guardian email (Gmail, if minor)
                </label>
                <input
                  type="email"
                  name="guardian_email"
                  value={form.guardian_email}
                  onChange={handleFormChange}
                  className="input-field"
                  required
                />
                {errors.guardian_email && <p className="text-xs text-red-600 mt-1">{errors.guardian_email}</p>}
              </div>
            </div>
          )}

          {form.patient_type === 'student' && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Parents & Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Mother's name</label>
                <input
                  name="mother_name"
                  value={form.mother_name}
                  onChange={handleFormChange}
                  onKeyPress={(e) => { if (/\d/.test(e.key)) e.preventDefault() }}
                  className="input-field"
                  placeholder="Full name"
                />
                {errors.mother_name && <p className="text-xs text-red-600 mt-1">{errors.mother_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Father's name</label>
                <input
                  name="father_name"
                  value={form.father_name}
                  onChange={handleFormChange}
                  onKeyPress={(e) => { if (/\d/.test(e.key)) e.preventDefault() }}
                  className="input-field"
                  placeholder="Full name"
                />
                {errors.father_name && <p className="text-xs text-red-600 mt-1">{errors.father_name}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Father's suffix</label>
                <select
                  name="father_suffix"
                  value={form.father_suffix}
                  onChange={handleFormChange}
                  className="input-field"
                >
                  <option value="">None</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Person to notify</label>
                <input
                  name="person_to_notify"
                  value={form.person_to_notify}
                  onChange={handleFormChange}
                  className="input-field"
                  placeholder="Name of emergency contact person"
                />
                {errors.person_to_notify && <p className="text-xs text-red-600 mt-1">{errors.person_to_notify}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Emergency contact number</label>
                <input
                  name="emergency_contact"
                  value={form.emergency_contact}
                  onChange={handleFormChange}
                  className="input-field"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="11 digits"
                />
                {errors.emergency_contact && <p className="text-xs text-red-600 mt-1">{errors.emergency_contact}</p>}
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Voucher type</label>
                <input
                  name="voucher_type"
                  value={form.voucher_type}
                  onChange={handleFormChange}
                  className="input-field"
                  placeholder="e.g., None, PWD, Senior Citizen, etc."
                />
              </div>
            </div>
          </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Address</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Block / Lot / Purok / Subdivision</label>
                <input
                  name="address_field"
                  value={form.address_field}
                  onChange={handleFormChange}
                  className="input-field"
                  placeholder="e.g. Blk 4 Lot 12, Purok 3, Greenville Subd."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Barangay</label>
                {selectedProvince && selectedCity && (philippinesData.barangays as any)?.[selectedProvince]?.[selectedCity]?.length > 0 ? (
                  <select
                    name="barangay"
                    value={form.barangay}
                    onChange={handleFormChange}
                    className="input-field"
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
                    name="barangay"
                    value={form.barangay}
                    onChange={handleFormChange}
                    className="input-field"
                    placeholder="e.g., Barangay San Isidro"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Province</label>
                <select
                  name="province"
                  value={form.province}
                  onChange={(e) => {
                    handleFormChange(e)
                    setSelectedProvince(e.target.value)
                    // Clear city when province changes
                    handleChange({ target: { name: 'city', value: '' } } as any)
                  }}
                  className="input-field"
                >
                  <option value="">Select Province</option>
                  {philippinesData.provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">City</label>
                <select
                  name="city"
                  value={form.city}
                  onChange={handleFormChange}
                  className="input-field"
                  required
                >
                  <option value="">Select City</option>
                  {selectedProvince && (philippinesData.cities as any)[selectedProvince]?.map((city: string) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">ZIP Code</label>
                <input
                  name="zip_code"
                  value={form.zip_code}
                  onChange={handleFormChange}
                  className="input-field"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="4 digits"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-medical"
              checked={showMedicalFields}
              onChange={(e) => setShowMedicalFields(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="show-medical" className="text-sm text-slate-600">
              Add medical information (allergies, diagnosed diseases)
            </label>
          </div>

          {showMedicalFields && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Allergies</label>
                <textarea
                  name="allergies"
                  value={form.allergies}
                  onChange={handleFormChange}
                  className="input-field"
                  rows={2}
                  placeholder="List any allergies..."
                />
                {errors.allergies && <p className="text-xs text-red-600 mt-1">{errors.allergies}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Diagnosed diseases</label>
                <textarea
                  name="diagnosed_diseases"
                  value={form.diagnosed_diseases}
                  onChange={handleFormChange}
                  className="input-field"
                  rows={2}
                  placeholder="List any diagnosed diseases..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
