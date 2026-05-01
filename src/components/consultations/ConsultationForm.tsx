import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import type { ConsultationFormData } from '../../types/consultations'
import type { Patient } from '../../types'
import { CONSULTATION_STATUS_OPTIONS } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { PrescriptionUpload } from './PrescriptionUpload'

const formatForDatetimeLocal = (value: string | null | undefined): string => {
  if (!value) return ''
  try {
    const date = new Date(value)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  } catch {
    return ''
  }
}

const getLocalDatetimeNow = (): string => {
  const date = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface ConsultationFormProps {
  initialData?: Partial<ConsultationFormData>
  onSubmit: (data: ConsultationFormData, pendingFiles?: File[]) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
  patient?: Patient
  consultationId?: string
  prescriptionImages?: string[]
  onPrescriptionUpdate?: (newFiles: string[]) => void
  onDone?: () => void
}

export function ConsultationForm({ initialData, onSubmit, onCancel, isEditing = false, patient, consultationId, prescriptionImages, onPrescriptionUpdate, onDone }: ConsultationFormProps) {
  const [form, setForm] = useState<ConsultationFormData>(() => {
    const consultationDate = formatForDatetimeLocal(initialData?.consultation_date) || getLocalDatetimeNow()
    const followUpDate = formatForDatetimeLocal(initialData?.follow_up_date) || null

    return {
      patient_id: initialData?.patient_id || '',
      patient_external_id: initialData?.patient_external_id || '',
      patient_name: initialData?.patient_name || '',
      patient_type: initialData?.patient_type || 'student',
      grade_level: initialData?.grade_level || '',
      section: initialData?.section || '',
      year_level: initialData?.year_level || '',
      course: initialData?.course || '',
      reason: '',
      intervention: '',
      actions_taken: '',
      doctors_remarks: '',
      diagnosis_result: '',
      attending_staff_name: '',
      doctor_name: '',
      blood_pressure: '',
      heart_rate: '',
      oxygen_saturation: '',
      temperature: '',
      height_cm: '',
      weight_kg: '',
      lmp: '',
      medicines: '',
      status: 'pending',
      ...initialData,
      consultation_date: consultationDate,
      follow_up_date: followUpDate,
    }
  })

  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patient || null)
  const [patientError, setPatientError] = useState<string | null>(null)
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  useEffect(() => {
    setSelectedPatient(patient || null)
  }, [patient])

  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true)
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id,patient_id,patient_type,first_name,middle_name,last_name,grade_level,section,year_level,program,sex')

        if (error) throw error
        setPatients((data ?? []) as Patient[])
      } catch (err) {
        console.error('Failed to load patients', err)
      } finally {
        setLoadingPatients(false)
      }
    }

    void loadPatients()
  }, [])

  useEffect(() => {
    const term = patientSearch.trim().toLowerCase()
    if (!term) {
      setFilteredPatients([])
      return
    }

    setFilteredPatients(
      patients.filter((p) => {
        const fullName = `${p.first_name} ${p.middle_name ? `${p.middle_name} ` : ''}${p.last_name}`.trim().toLowerCase()
        return fullName.includes(term) || p.patient_id.toLowerCase().includes(term)
      })
    )
  }, [patientSearch, patients])

  useEffect(() => {
    if (!selectedPatient) return

    setForm((current) => ({
      ...current,
      patient_id: selectedPatient.id,
      patient_external_id: selectedPatient.patient_id,
      patient_name: `${selectedPatient.first_name} ${selectedPatient.middle_name ? `${selectedPatient.middle_name} ` : ''}${selectedPatient.last_name}`.trim(),
      patient_type: selectedPatient.patient_type,
      grade_level: selectedPatient.grade_level || '',
      section: selectedPatient.section || '',
      year_level: selectedPatient.year_level || '',
      course: selectedPatient.program || '',
    }))
  }, [selectedPatient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadingFiles(true)

    if (!form.patient_id) {
      setPatientError('Please select a patient')
      setUploadingFiles(false)
      return
    }

    const submitData = {
      patient_id: form.patient_id,
      patient_type: form.patient_type,
      patient_name: form.patient_name,
      grade_level: form.grade_level || undefined,
      section: form.section || undefined,
      course: form.course || undefined,
      year_level: form.year_level || undefined,
      reason: form.reason,
      intervention: form.intervention,
      actions_taken: form.actions_taken,
      doctors_remarks: form.doctors_remarks,
      diagnosis_result: form.diagnosis_result,
      consultation_date: form.consultation_date,
      follow_up_date: form.follow_up_date || null,
      attending_staff_name: form.attending_staff_name,
      doctor_name: form.doctor_name,
      blood_pressure: form.blood_pressure,
      heart_rate: form.heart_rate !== '' ? parseInt(String(form.heart_rate), 10) : null,
      oxygen_saturation: form.oxygen_saturation !== '' ? parseFloat(String(form.oxygen_saturation)) : null,
      temperature: form.temperature !== '' ? parseFloat(String(form.temperature)) : null,
      height_cm: form.height_cm !== '' ? parseFloat(String(form.height_cm)) : null,
      weight_kg: form.weight_kg !== '' ? parseFloat(String(form.weight_kg)) : null,
      lmp: form.lmp || null,
      medicines: form.medicines,
      status: form.status || 'pending'
    } as ConsultationFormData

    try {
      await onSubmit(submitData, pendingFiles)
    } finally {
      setUploadingFiles(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            {isEditing ? 'Edit Consultation' : 'Add New Consultation'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Patient</label>
                <input
                  type="text"
                  className="input-field"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    setPatientError(null)
                  }}
                  placeholder="Search by name or patient ID"
                />
                {patientError && <p className="text-xs text-red-600 mt-1">{patientError}</p>}
              </div>

              {loadingPatients && (
                <p className="text-sm text-slate-500">Loading patients...</p>
              )}

              {patientSearch.trim() && !loadingPatients && (
                <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-2 max-h-64 overflow-y-auto">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((p) => {
                      const fullName = `${p.first_name} ${p.middle_name ? `${p.middle_name} ` : ''}${p.last_name}`.trim()
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100"
                          onClick={() => {
                            setSelectedPatient(p)
                            setPatientSearch('')
                          }}
                        >
                          <div className="font-medium text-slate-800">{fullName}</div>
                          <div className="text-sm text-slate-500">ID: {p.patient_id}</div>
                        </button>
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-500 px-3 py-2">No patients found.</p>
                  )}
                </div>
              )}

              {selectedPatient && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Selected Patient</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">
                    {selectedPatient.first_name} {selectedPatient.middle_name ? `${selectedPatient.middle_name} ` : ''}{selectedPatient.last_name}
                  </p>
                  <p className="text-sm text-slate-600">ID: {selectedPatient.patient_id}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Consultation Date & Time</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={form.consultation_date}
                  onChange={(e) => setForm(f => ({ ...f, consultation_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={form.follow_up_date || ''}
                  onChange={(e) => setForm(f => ({ ...f, follow_up_date: e.target.value || null }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Attending Staff Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.attending_staff_name}
                  onChange={(e) => setForm(f => ({ ...f, attending_staff_name: e.target.value }))}
                  placeholder="Enter staff name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Doctor Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.doctor_name}
                  onChange={(e) => setForm(f => ({ ...f, doctor_name: e.target.value }))}
                  placeholder="Enter doctor name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Reason for Consultation</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Describe the reason for consultation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Intervention</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.intervention}
                onChange={(e) => setForm(f => ({ ...f, intervention: e.target.value }))}
                placeholder="Describe the intervention provided"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Actions Taken</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.actions_taken}
                onChange={(e) => setForm(f => ({ ...f, actions_taken: e.target.value }))}
                placeholder="Describe actions taken"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Diagnosis Result</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.diagnosis_result}
                onChange={(e) => setForm(f => ({ ...f, diagnosis_result: e.target.value }))}
                placeholder="Enter diagnosis result"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Doctor's Remarks</label>
              <textarea
                className="input-field"
                rows={3}
                value={form.doctors_remarks}
                onChange={(e) => setForm(f => ({ ...f, doctors_remarks: e.target.value }))}
                placeholder="Enter doctor's remarks"
              />
            </div>

            {/* Vital Signs Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Vital Signs</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Pressure (e.g., 120/80)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.blood_pressure}
                    onChange={(e) => setForm(f => ({ ...f, blood_pressure: e.target.value }))}
                    placeholder="120/80"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.heart_rate ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, heart_rate: e.target.value }))}
                    placeholder="72"
                    min="0"
                    max="300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Oxygen Saturation (%)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.oxygen_saturation ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, oxygen_saturation: e.target.value }))}
                    placeholder="98.5"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.temperature ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, temperature: e.target.value }))}
                    placeholder="37.5"
                    step="0.1"
                    min="0"
                    max="50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Height (cm)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.height_cm ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, height_cm: e.target.value }))}
                    placeholder="170"
                    min="0"
                    max="300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.weight_kg ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                    placeholder="65"
                    min="0"
                    max="500"
                    step="0.1"
                  />
                </div>
              </div>

              {(selectedPatient?.sex === 'F' || patient?.sex === 'F') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Last Menstrual Period (LMP)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.lmp ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, lmp: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Medicines Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Treatment & Medicines</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Medicines Given</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.medicines}
                  onChange={(e) => setForm(f => ({ ...f, medicines: e.target.value }))}
                  placeholder="List medicines and dosages given during consultation"
                />
              </div>
            </div>

            {/* Status Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Consultation Status</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="input-field"
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value as 'pending' | 'completed' | 'follow_up' | 'cancelled' }))}
                >
                  {CONSULTATION_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Prescription Files</h3>

              {isEditing && consultationId && (
                <PrescriptionUpload
                  consultationId={consultationId}
                  existingFiles={prescriptionImages ?? []}
                  onUpdate={(newFiles) => onPrescriptionUpdate?.(newFiles)}
                />
              )}

              {!isEditing && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">Upload, view, or delete prescription documents for this consultation.</p>
                    <label className="inline-flex items-center gap-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 cursor-pointer transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Upload PDF
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (file.type !== 'application/pdf') {
                            toast.error('Only PDF files are allowed')
                            return
                          }
                          if (file.size > 50 * 1024 * 1024) {
                            toast.error('File size must be less than 50MB')
                            return
                          }
                          setPendingFiles(prev => [...prev, file])
                          setPendingPreviews(prev => [...prev, file.name])
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>

                  {pendingPreviews.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                      <p className="text-sm text-slate-400">No prescription PDFs uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingPreviews.map((name, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span className="text-sm text-slate-700">{name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingFiles(prev => prev.filter((_, i) => i !== index))
                              setPendingPreviews(prev => prev.filter((_, i) => i !== index))
                            }}
                            className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={uploadingFiles}>
                {isEditing ? 'Update Consultation' : 'Add Consultation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
