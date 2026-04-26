import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PhysicalExamination, Patient } from '../types.ts'
import { Search, Plus, Edit, Save, X, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'

export default function PhysicalExaminations() {
  const { profile } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [examinations, setExaminations] = useState<PhysicalExamination[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingExam, setEditingExam] = useState<PhysicalExamination | null>(null)
  const [examForm, setExamForm] = useState<Partial<PhysicalExamination>>({
    exam_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    const loadPatients = async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_id, first_name, middle_name, last_name, date_of_birth, age, sex')
        .order('last_name')
      if (error) {
        toast.error(error.message || 'Failed to load patients')
        return
      }
      setPatients((data ?? []) as Patient[])
    }
    void loadPatients()
  }, [])

  const loadExaminations = async (patientId: string) => {
    const { data, error } = await supabase
      .from('physical_examinations')
      .select('*')
      .eq('patient_id', patientId)
      .order('exam_date', { ascending: false })
    if (error) {
      toast.error(error.message || 'Failed to load examinations')
      return
    }
    setExaminations((data ?? []) as PhysicalExamination[])
  }

  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient)
    await loadExaminations(patient.id)
  }

  const openAddModal = () => {
    if (!selectedPatient) return
    setEditingExam(null)
    setExamForm({
      patient_id: selectedPatient.id,
      exam_date: new Date().toISOString().split('T')[0],
      examined_by: profile?.id
    })
    setShowModal(true)
  }

  const openEditModal = (exam: PhysicalExamination) => {
    setEditingExam(exam)
    setExamForm({ ...exam })
    setShowModal(true)
  }

  const calculateBMI = (weight?: number, height?: number) => {
    if (!weight || !height || height <= 0) return undefined
    const heightM = height / 100
    return Math.round((weight / (heightM * heightM)) * 100) / 100
  }

  const formatTimestamp = (value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/.test(value)) {
      return format(new Date(value), 'MMMM d, yyyy h:mm a')
    }
    return value
  }

  const exportToExcel = () => {
    const data = examinations.map(e => {
      const obj = {
        'Patient ID': selectedPatient?.patient_id || '',
        'Patient Name': selectedPatient ? `${selectedPatient.last_name}, ${selectedPatient.first_name}${selectedPatient.middle_name ? ` ${selectedPatient.middle_name}` : ''}` : '',
        'Exam Date': e.exam_date,
        'Height (cm)': e.height || '',
        'Weight (kg)': e.weight || '',
        'BMI': e.bmi || '',
        'Blood Pressure': e.blood_pressure || '',
        'Heart Rate': e.heart_rate || '',
        'Temperature (°C)': e.temperature || '',
        'Vision Left': e.vision_left || '',
        'Vision Right': e.vision_right || '',
        'Hearing': e.hearing || '',
        'Skin': e.skin || '',
        'Head': e.head || '',
        'Eyes': e.eyes || '',
        'Ears': e.ears || '',
        'Nose': e.nose || '',
        'Throat': e.throat || '',
        'Neck': e.neck || '',
        'Chest': e.chest || '',
        'Heart': e.heart || '',
        'Lungs': e.lungs || '',
        'Abdomen': e.abdomen || '',
        'Extremities': e.extremities || '',
        'Neurological': e.neurological || '',
        'Remarks': e.remarks || '',
        'Created At': e.created_at,
        'Updated At': e.updated_at || ''
      }
      return Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, formatTimestamp(val)]))
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Physical Examinations')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'physical_examinations.xlsx')
    toast.success('Excel file exported successfully')
  }

  const handleSave = async () => {
    if (!examForm.exam_date) {
      toast.error('Exam date is required')
      return
    }

    // Remove bmi from dataToSave since it's computed by the database
    const { bmi, ...dataToSave } = examForm

    try {
      if (editingExam) {
        const { error } = await supabase
          .from('physical_examinations')
          .update({ ...dataToSave, updated_at: new Date().toISOString() })
          .eq('id', editingExam.id)
        if (error) throw error
        toast.success('Examination updated successfully')
      } else {
        const { error } = await supabase
          .from('physical_examinations')
          .insert(dataToSave)
        if (error) throw error
        toast.success('Examination added successfully')
      }
      setShowModal(false)
      setExamForm({})
      if (selectedPatient) {
        await loadExaminations(selectedPatient.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save examination')
    }
  }

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Physical Examinations</h1>
        {selectedPatient && (
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Patients List */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => selectPatient(patient)}
                className={`w-full rounded-lg border p-4 text-left transition hover:bg-gray-50 ${
                  selectedPatient?.id === patient.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200'
                }`}
              >
                <div className="font-medium text-slate-800">
                  {patient.first_name} {patient.middle_name} {patient.last_name}
                </div>
                <div className="text-sm text-slate-500">ID: {patient.patient_id}</div>
                <div className="text-sm text-slate-500">
                  Age: {patient.age || 'N/A'} | Sex: {patient.sex === 'M' ? 'Male' : 'Female'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Examinations List */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}'s Examinations` : 'Select a patient'}
            </h2>
            {selectedPatient && (
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add Examination
              </button>
            )}
          </div>
          {selectedPatient ? (
            <div className="max-h-96 overflow-y-auto">
              {examinations.length > 0 ? (
                examinations.map((exam) => (
                  <div key={exam.id} className="mb-4 rounded-lg border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium text-slate-800">
                        {new Date(exam.exam_date).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => openEditModal(exam)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-sm text-primary-600 hover:bg-primary-50"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {exam.weight_kg && <div>Weight: {exam.weight_kg} kg</div>}
                      {exam.height_cm && <div>Height: {exam.height_cm} cm</div>}
                      {exam.bmi && <div>BMI: {exam.bmi}</div>}
                      {exam.blood_pressure && <div>BP: {exam.blood_pressure}</div>}
                    </div>
                    {exam.remarks && <div className="mt-2 text-sm text-slate-600">{exam.remarks}</div>}
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500">No examinations recorded</div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500">Select a patient to view examinations</div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingExam ? 'Edit Examination' : 'Add Examination'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Exam Date</label>
                <input
                  type="date"
                  value={examForm.exam_date || ''}
                  onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={examForm.weight_kg || ''}
                  onChange={(e) => {
                    const weight = parseFloat(e.target.value) || undefined
                    const bmi = calculateBMI(weight, examForm.height_cm)
                    setExamForm({ ...examForm, weight_kg: weight, bmi })
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={examForm.height_cm || ''}
                  onChange={(e) => {
                    const height = parseFloat(e.target.value) || undefined
                    const bmi = calculateBMI(examForm.weight_kg, height)
                    setExamForm({ ...examForm, height_cm: height, bmi })
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">BMI</label>
                <input
                  type="number"
                  step="0.01"
                  value={examForm.bmi || ''}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-gray-50 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Blood Pressure</label>
                <input
                  type="text"
                  value={examForm.blood_pressure || ''}
                  onChange={(e) => setExamForm({ ...examForm, blood_pressure: e.target.value })}
                  placeholder="e.g., 120/80"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Vaccination Status</label>
                <select
                  value={examForm.vaccination_status || ''}
                  onChange={(e) => setExamForm({ ...examForm, vaccination_status: e.target.value as 'complete' | 'incomplete' })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">Select status</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Past Illness</label>
                <textarea
                  value={examForm.past_illness || ''}
                  onChange={(e) => setExamForm({ ...examForm, past_illness: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Present Illness</label>
                <textarea
                  value={examForm.present_illness || ''}
                  onChange={(e) => setExamForm({ ...examForm, present_illness: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Remarks</label>
                <textarea
                  value={examForm.remarks || ''}
                  onChange={(e) => setExamForm({ ...examForm, remarks: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
              >
                <Save className="h-4 w-4" />
                {editingExam ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
