import { useState, useEffect } from 'react'
import { Plus, Download, Search, Loader2, Eye, Edit2, Trash2, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Patient, Consultation, ConsultationNote } from '../types'
import { ConsultationForm, NotesModal } from '../components/consultations'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { normalizeLabel } from '../utils/helpers'

export default function Consultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null)
  const [notes, setNotes] = useState<ConsultationNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const { profile } = useAuth()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Load all consultations
        const { data: consultationData, error: consError } = await supabase
          .from('consultations')
          .select('*')
          .order('consultation_date', { ascending: false })

        if (consError) throw consError

        // Load patients for name lookup
        const { data: patientData, error: patError } = await supabase
          .from('patients')
          .select('*')

        if (patError) throw patError

        setConsultations((consultationData ?? []) as Consultation[])
        setPatients((patientData ?? []) as Patient[])
      } catch (error) {
        console.error('Failed to load data', error)
        toast.error('Failed to load consultations')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filtered = consultations.filter((c) => {
    const term = search.toLowerCase()
    const patient = patients.find(p => p.id === c.patient_id)
    const patientName = patient ? `${patient.last_name}, ${patient.first_name}`.toLowerCase() : ''
    return (
      patientName.includes(term) ||
      c.patient_external_id.toLowerCase().includes(term) ||
      c.reason.toLowerCase().includes(term) ||
      (c.diagnosis_result ?? '').toLowerCase().includes(term)
    )
  })

  const loadNotes = async (consultationId: string) => {
    setNotesLoading(true)
    try {
      const { data, error } = await supabase
        .from('consultation_notes')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes((data ?? []) as ConsultationNote[])
    } catch (error) {
      console.error('Failed to load notes', error)
      toast.error('Failed to load notes')
    } finally {
      setNotesLoading(false)
    }
  }

  const addNote = async (consultationId: string, content: string) => {
    if (!profile?.id) {
      const errorMessage = 'Unable to save note: no authenticated user found.'
      console.error(errorMessage)
      toast.error('Failed to save note')
      throw new Error(errorMessage)
    }

    try {
      const { data, error } = await supabase
        .from('consultation_notes')
        .insert({ consultation_id: consultationId, note_text: content, created_by: profile.id })
        .select()
        .single()

      if (error) {
        console.error('Failed to insert consultation note', error)
        throw error
      }

      setNotes(prev => [data as ConsultationNote, ...prev])
      await loadNotes(consultationId)
      toast.success('Note saved successfully')
    } catch (error) {
      console.error('Failed to add note', error)
      toast.error('Failed to save note')
      throw error
    }
  }

  const handleViewDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setShowViewModal(true)
  }

  const handleEdit = (consultation: Consultation) => {
    setEditingConsultation(consultation)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this consultation?')) return

    try {
      const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', id)

      if (error) throw error
      setConsultations(prev => prev.filter(c => c.id !== id))
      toast.success('Consultation deleted successfully')
    } catch (error) {
      console.error('Failed to delete consultation', error)
      toast.error('Failed to delete consultation')
    }
  }

  const handleViewNotes = async (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    await loadNotes(consultation.id)
    setShowNotesModal(true)
  }

  const handleAddConsultation = async (formData: any) => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .insert(formData)
        .select()
        .single()

      if (error) throw error
      setConsultations(prev => [data as Consultation, ...prev])
      setShowForm(false)
      toast.success('Consultation added successfully')
    } catch (error) {
      console.error('Failed to add consultation', error)
      toast.error('Failed to add consultation')
    }
  }

  const handleUpdateConsultation = async (formData: any) => {
    if (!editingConsultation) return

    try {
      const { error } = await supabase
        .from('consultations')
        .update(formData)
        .eq('id', editingConsultation.id)

      if (error) throw error
      setConsultations(prev => prev.map(c => c.id === editingConsultation.id ? { ...c, ...formData } : c))
      setShowForm(false)
      setEditingConsultation(null)
      toast.success('Consultation updated successfully')
    } catch (error) {
      console.error('Failed to update consultation', error)
      toast.error('Failed to update consultation')
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingConsultation(null)
  }

  const formatTimestamp = (value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/.test(value)) {
      return format(new Date(value), 'MMMM d, yyyy h:mm a')
    }
    return value
  }

  const exportToExcel = () => {
    const data = consultations.map(c => {
      const patient = patients.find(p => p.id === c.patient_id)
      const obj = {
        'Patient ID': patient?.patient_id || '',
        'Patient Name': patient ? `${patient.last_name}, ${patient.first_name}` : '',
        'Patient Type': c.patient_type,
        'Grade Level': c.grade_level || '',
        'Section': c.section || '',
        'Reason': c.reason,
        'Intervention': c.intervention || '',
        'Actions Taken': c.actions_taken || '',
        'Doctor Remarks': c.doctors_remarks || '',
        'Diagnosis Result': c.diagnosis_result || '',
        'Consultation Date': c.consultation_date,
        'Follow Up Date': c.follow_up_date || '',
        'Attending Staff Name': c.attending_staff_name || '',
        'Doctor Name': c.doctor_name || '',
        'Course': c.course || '',
        'Year Level': c.year_level || '',
        'SHS Track': c.shs_track || '',
        'Status': c.status || 'pending'
      }
      return Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, formatTimestamp(val)]))
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Consultations')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'consultations.xlsx')
    toast.success('Excel file exported successfully')
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consultations</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Consultation
          </button>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by patient name, ID, reason, or diagnosis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center p-10 text-slate-500">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading consultations...</span>
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Consultation Date</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Diagnosis Result</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Follow Up</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const patient = patients.find(p => p.id === c.patient_id)
                const patientName = patient ? `${patient.last_name}, ${patient.first_name}` : c.patient_external_id
                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="font-medium text-slate-700">{c.consultation_date ? format(new Date(c.consultation_date), 'MMM d, yyyy') : '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{patientName}</div>
                      <div className="text-xs text-slate-500">ID: {patient?.patient_id}</div>
                    </td>
                    <td className="px-4 py-3">{c.reason}</td>
                    <td className="px-4 py-3">{c.diagnosis_result || '—'}</td>
                    <td className="px-4 py-3">{c.doctor_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        (c.status ?? 'pending') === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : (c.status ?? 'pending') === 'follow_up'
                          ? 'bg-blue-100 text-blue-800'
                          : (c.status ?? 'pending') === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {normalizeLabel(c.status ?? 'pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.follow_up_date ? format(new Date(c.follow_up_date), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(c)}
                          className="btn-primary btn-xs"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          className="btn-secondary btn-xs"
                          title="Edit consultation"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewNotes(c)}
                          className="btn-secondary btn-xs"
                          title="View notes"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="btn-danger btn-xs"
                          title="Delete consultation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {filtered.length === 0 && !loading && (
          <p className="py-10 text-center text-slate-500">No consultations found.</p>
        )}
      </div>

      {/* View Details Modal */}
      {showViewModal && selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-800">Consultation Details</h2>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500">Patient</p>
                <p className="font-medium">{selectedConsultation.patient_external_id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Date</p>
                <p>{selectedConsultation.consultation_date ? format(new Date(selectedConsultation.consultation_date), 'PP') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Reason</p>
                <p>{selectedConsultation.reason || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Intervention</p>
                <p>{selectedConsultation.intervention || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Actions Taken</p>
                <p>{selectedConsultation.actions_taken || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Doctor Remarks</p>
                <p>{selectedConsultation.doctors_remarks || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Diagnosis Result</p>
                <p>{selectedConsultation.diagnosis_result || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Temperature</p>
                <p>{selectedConsultation.temperature != null ? String(selectedConsultation.temperature) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Follow Up Date</p>
                <p>{selectedConsultation.follow_up_date ? format(new Date(selectedConsultation.follow_up_date), 'PP') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Doctor</p>
                <p>{selectedConsultation.doctor_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  (selectedConsultation.status ?? 'pending') === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : (selectedConsultation.status ?? 'pending') === 'follow_up'
                    ? 'bg-blue-100 text-blue-800'
                    : (selectedConsultation.status ?? 'pending') === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {normalizeLabel(selectedConsultation.status ?? 'pending')}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <ConsultationForm
          initialData={editingConsultation ? {
            patient_id: editingConsultation.patient_id,
            patient_external_id: editingConsultation.patient_external_id,
            patient_name: editingConsultation.patient_name,
            patient_type: editingConsultation.patient_type,
            grade_level: editingConsultation.grade_level || '',
            section: editingConsultation.section || '',
            year_level: editingConsultation.year_level || '',
            course: editingConsultation.course || '',
            reason: editingConsultation.reason || '',
            intervention: editingConsultation.intervention || '',
            actions_taken: editingConsultation.actions_taken || '',
            doctors_remarks: editingConsultation.doctors_remarks || '',
            diagnosis_result: editingConsultation.diagnosis_result || '',
            consultation_date: editingConsultation.consultation_date,
            follow_up_date: editingConsultation.follow_up_date || '',
            attending_staff_name: editingConsultation.attending_staff_name || '',
            doctor_name: editingConsultation.doctor_name || '',
            blood_pressure: editingConsultation.blood_pressure || '',
            heart_rate: editingConsultation.heart_rate != null ? String(editingConsultation.heart_rate) : '',
            oxygen_saturation: editingConsultation.oxygen_saturation != null ? String(editingConsultation.oxygen_saturation) : '',
            temperature: editingConsultation.temperature != null ? String(editingConsultation.temperature) : '',
            height_cm: editingConsultation.height_cm ? String(editingConsultation.height_cm) : '',
            weight_kg: editingConsultation.weight_kg ? String(editingConsultation.weight_kg) : '',
            lmp: editingConsultation.lmp || '',
            medicines: editingConsultation.medicines || '',
            status: editingConsultation.status || 'pending'
          } : undefined}
          onSubmit={editingConsultation ? handleUpdateConsultation : handleAddConsultation}
          onCancel={handleCloseForm}
          isEditing={!!editingConsultation}
          patient={editingConsultation ? patients.find((p) => p.id === editingConsultation.patient_id) : undefined}
        />
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedConsultation && (
        <NotesModal
          consultationId={selectedConsultation.id}
          notes={notes}
          loading={notesLoading}
          onAddNote={addNote}
          onClose={() => setShowNotesModal(false)}
        />
      )}
    </div>
  )
}
