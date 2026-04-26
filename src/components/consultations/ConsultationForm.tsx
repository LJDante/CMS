import { useState } from 'react'
import type { ConsultationFormData } from '../../types/consultations'
import type { Patient } from '../../types'
import { CONSULTATION_STATUS_OPTIONS } from '../../constants'

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
  onSubmit: (data: ConsultationFormData) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
  patient?: Patient
}

export function ConsultationForm({ initialData, onSubmit, onCancel, isEditing = false, patient }: ConsultationFormProps) {
  const [form, setForm] = useState<ConsultationFormData>(() => {
    const consultationDate = formatForDatetimeLocal(initialData?.consultation_date) || getLocalDatetimeNow()
    const followUpDate = formatForDatetimeLocal(initialData?.follow_up_date) || null

    return {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const submitData = {
      ...form,
      // We send the datetime-local string directly for timestamp without time zone storage
      consultation_date: form.consultation_date,
      follow_up_date: form.follow_up_date || null,
      // Convert numeric fields properly and preserve 0 values
      heart_rate: form.heart_rate !== '' ? parseInt(String(form.heart_rate), 10) : null,
      oxygen_saturation: form.oxygen_saturation !== '' ? parseFloat(String(form.oxygen_saturation)) : null,
      temperature: form.temperature !== '' ? parseFloat(String(form.temperature)) : null,
      height_cm: form.height_cm !== '' ? parseFloat(String(form.height_cm)) : null,
      weight_kg: form.weight_kg !== '' ? parseFloat(String(form.weight_kg)) : null,
      lmp: form.lmp || null
    }
    
    await onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            {isEditing ? 'Edit Consultation' : 'Add New Consultation'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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

              {patient?.sex === 'F' && (
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

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? 'Update Consultation' : 'Add Consultation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
