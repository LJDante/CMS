import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { ClinicVisit, Patient, Profile } from '../types'
import { format, addDays } from 'date-fns'
import { Search, Plus, Loader2, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { normalizeLabel } from '../utils/helpers'

type VisitRow = ClinicVisit & {
  patient_name?: string
  patient_external_id?: string
  patients?: { first_name: string; last_name: string; patient_id: string } | Array<{ first_name: string; last_name: string; patient_id: string }>
  type?: string
}

const COMPLAINT_OPTIONS = [
  'Headache',
  'Abdominal Pain',
  'Fever',
  'Asthma',
  'Dysmenorrhea',
  'Pain',
  'Major Injury',
  'Minor Injury',
  'Toothache',
  'Communicable Disease',
  'Others'
]

import { useAuth } from '../contexts/AuthContext'
import { getDisplayName } from '../utils/nameFormatter'

export default function Visits() {
  const { profile } = useAuth()
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Profile[]>([])
  const [staff, setStaff] = useState<Profile[]>([])
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewPatientExternalId, setViewPatientExternalId] = useState<string | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [loadingVisits, setLoadingVisits] = useState(false)

   const [editingVisit, setEditingVisit] = useState<VisitRow | null>(null)
   const [formErrors, setFormErrors] = useState<Record<string, string>>({})

   const [form, setForm] = useState({
     patient_id: '',
     complaint: '',
     complaint_options: [] as string[],
     other_complaint: '',
     assessment: '',
     treatment: '',
     disposition: 'returned_to_class',
     notes: '',
     visit_date: format(new Date(), 'yyyy-MM-dd'),
     visit_time: format(new Date(), 'HH:mm'),
     assigned_doctor: '',
     assigned_staff: '',
     temperature: '',
     entry_type: 'entrance',
     commuter_status: 'commuter',
     place_name: '',
     referred_to: '',
     type: ''
   })

  useEffect(() => {
    const loadData = async () => {
      // Load patients
      const { data: patientData } = await supabase.from('patients').select('*')
      setPatients((patientData ?? []) as Patient[])

      // Load doctors (clinic_doctor role)
      const { data: doctorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'clinic_doctor')
        .order('full_name')
      setDoctors((doctorData ?? []) as Profile[])

      // Load staff (clinic_staff and clinic_nurse roles)
      const { data: staffData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['clinic_staff', 'clinic_nurse'])
        .order('full_name')
      setStaff((staffData ?? []) as Profile[])
    }
    void loadData()
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoadingVisits(true)
      try {
        let query = supabase
          .from('clinic_visits')
          .select('*, patients(first_name,last_name,patient_id)')
          .order('created_at', { ascending: false })

        if (!showAllHistory) {
          const start = `${dateFilter}T00:00:00`
          const end = `${format(addDays(new Date(dateFilter), 1), 'yyyy-MM-dd')}T00:00:00`
          query = query.gte('visit_date', start).lt('visit_date', end).limit(10)
        }

        const { data, error } = await query
        if (error) {
          toast.error('Failed to load visits')
          return
        }

        const visitsData = (data ?? []) as VisitRow[]
        const withNames = visitsData.map((v) => {
          const patientRecord = Array.isArray(v.patients) ? v.patients[0] : v.patients
          const p = patientRecord ?? patients.find((pt) => pt.id === v.patient_id)
          return {
            ...v,
            patient_name: p ? `${p.last_name}, ${p.first_name}` : undefined,
            patient_external_id: p?.patient_id
          }
        })
        setVisits(withNames)
      } catch (error) {
        toast.error('Failed to load visits')
      } finally {
        setLoadingVisits(false)
      }
    }
    void load()
  }, [dateFilter, patients, showAllHistory])

  const filtered = visits.filter((v) => {
    const term = search.toLowerCase()
    return (
      v.patient_name?.toLowerCase().includes(term) ||
      v.patient_external_id?.toLowerCase().includes(term) ||
      v.complaint.toLowerCase().includes(term) ||
      (v.assessment ?? '').toLowerCase().includes(term)
    )
  })

  const formatTimestamp = (value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/.test(value)) {
      return format(new Date(value), 'MMMM d, yyyy h:mm a')
    }
    return value
  }

  const getVisitDateTime = (visit: VisitRow) => {
    if (visit.entry_type === 'exit' && visit.exit_time) {
      return new Date(visit.exit_time)
    }
    if (visit.entry_type === 'entrance' && visit.entrance_time) {
      return new Date(visit.entrance_time)
    }
    return new Date(visit.visit_date || visit.created_at || '')
  }

  const getVisitTimeLabel = (visit: VisitRow) => {
    if (visit.entry_type === 'exit' && visit.exit_time) {
      return format(new Date(visit.exit_time), 'p')
    }
    if (visit.entry_type === 'entrance' && visit.entrance_time) {
      return format(new Date(visit.entrance_time), 'p')
    }
    if (visit.visit_date) {
      return format(new Date(visit.visit_date), 'p')
    }
    return 'N/A'
  }

  const combineDateTimeToIso = (date: string, time: string) => {
    const combined = new Date(`${date}T${time}:00`)
    return Number.isNaN(combined.getTime()) ? null : combined.toISOString()
  }

  const exportToExcel = async () => {
    // Load all visits for export
    const { data: allVisits, error } = await supabase
      .from('clinic_visits')
      .select('*, patients(first_name,last_name,patient_id)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load visits for export')
      return
    }

    const visitsData = (allVisits ?? []) as VisitRow[]
    const withNames = visitsData.map((v) => {
      const patientRecord = Array.isArray(v.patients) ? v.patients[0] : v.patients
      const p = patientRecord ?? patients.find((pt) => pt.id === v.patient_id)
      return {
        ...v,
        patient_name: p ? `${p.last_name}, ${p.first_name}` : undefined,
        patient_external_id: p?.patient_id
      }
    })

    const data = withNames.map(v => {
      const obj = {
        'Patient ID': v.patient_external_id || v.patient_id || 'N/A',
        'Patient Name': v.patient_name || 'N/A',
        'Visit Date': v.visit_date || 'N/A',
        'Complaint': v.complaint || 'N/A',
        'Assessment': v.assessment || 'N/A',
        'Treatment': v.treatment || 'N/A',
        'Disposition': v.disposition || 'N/A',
        'Referred To': v.referred_to || 'N/A',
        'Notes': v.notes || 'N/A',
        'Temperature': v.temperature || 'N/A',
        'Entry Type': v.entry_type || 'N/A',
        'Commuter Status': v.commuter_status || 'N/A',
        'Place Name': v.place_name || 'N/A',
        'Assigned Doctor': v.assigned_doctor ? getDisplayName(doctors.find(d => d.id === v.assigned_doctor)?.full_name, 'clinic_doctor') : 'N/A',
        'Assigned Staff': v.assigned_staff ? staff.find(s => s.id === v.assigned_staff)?.full_name : 'N/A',
        'Created At': v.created_at || 'N/A'
      }
      return Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, formatTimestamp(val)]))
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clinic Visits')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'clinic_visits.xlsx')
    toast.success('Excel file exported successfully')
  }

  const buildComplaintString = (options: string[], other: string) => {
    const selected = [...options]
    if (selected.includes('Others')) {
      const otherText = other.trim()
      const index = selected.indexOf('Others')
      selected[index] = otherText ? `Others: ${otherText}` : 'Others'
    }
    return selected.filter(Boolean).join(', ')
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'other_complaint' && f.complaint_options.includes('Others')
        ? value
        : value,
      complaint:
        name === 'other_complaint' && f.complaint_options.includes('Others')
          ? buildComplaintString(f.complaint_options, value)
          : f.complaint
    }))
    setFormErrors((prev) => {
      const { [name]: _removed, ...rest } = prev
      return rest
    })
  }

  const handleComplaintOptionChange = (option: string, checked: boolean) => {
    setForm((f) => {
      const options = checked
        ? [...f.complaint_options, option]
        : f.complaint_options.filter((item) => item !== option)

      return {
        ...f,
        complaint_options: options,
        complaint: buildComplaintString(options, f.other_complaint)
      }
    })
    setFormErrors((prev) => {
      const { complaint: _removed, ...rest } = prev
      return rest
    })
  }

  const parseComplaintString = (value?: string) => {
    const options: string[] = []
    let other = ''
    if (!value) return { options, other }

    value.split(',').map((item) => item.trim()).forEach((item) => {
      if (!item) return
      if (item.toLowerCase().startsWith('others:')) {
        options.push('Others')
        other = item.replace(/^[Oo]thers:\s*/i, '')
      } else if (item.toLowerCase() === 'others') {
        options.push('Others')
      } else {
        options.push(item)
      }
    })

    return { options, other }
  }

  const buildComplaintValue = () => buildComplaintString(form.complaint_options, form.other_complaint)

  const filteredPatients = patients.filter((s) => {
    const term = patientSearch.toLowerCase()
    const fullName = `${s.last_name}, ${s.first_name}`.toLowerCase()
    return (
      fullName.includes(term) ||
      s.patient_id.toLowerCase().includes(term)
    )
  })

  const selectedPatient = form.patient_id ? patients.find((s) => s.id === form.patient_id) : null

  const handleSelectPatient = (patient: Patient) => {
    let typeValue = ''
    if (patient.patient_type === 'student') {
      const typeMapping: Record<string, string> = {
        'kindergarten': 'Kindergarten',
        'k-12': 'IBED',
        'shs': 'SHS',
        'college': 'College',
        'n/a': ''
      }
      typeValue = typeMapping[patient.education_level || ''] || ''
    } else if (patient.patient_type === 'personnel') {
      typeValue = 'School Personnel'
    }
    setForm((f) => ({ ...f, patient_id: patient.id, type: typeValue }))
    setPatientSearch('')
    setShowPatientDropdown(false)
  }

  const openVisitModal = (visit: VisitRow) => {
    setEditingVisit(visit)
    const visitDateTime = getVisitDateTime(visit)
    const parsed = parseComplaintString(visit.complaint)
    setForm({
      patient_id: visit.patient_id,
      complaint: visit.complaint,
      complaint_options: parsed.options,
      other_complaint: parsed.other,
      assessment: visit.assessment || '',
      treatment: visit.treatment || '',
      disposition: visit.disposition,
      notes: visit.notes || '',
      visit_date: format(visitDateTime, 'yyyy-MM-dd'),
      visit_time: format(visitDateTime, 'HH:mm'),
      assigned_doctor: visit.assigned_doctor || '',
      assigned_staff: visit.assigned_staff || '',
      temperature: visit.temperature ? String(visit.temperature) : '',
      entry_type: visit.entry_type || 'entrance',
      commuter_status: visit.commuter_status || 'commuter',
      place_name: visit.place_name || '',
      referred_to: visit.referred_to || '',
      type: visit.type || ''
    })
    const patient = patients.find((p) => p.id === visit.patient_id)
    setViewPatientExternalId(patient?.patient_id ?? null)
    setShowForm(false)
    setShowViewModal(true)
  }

  const openEditModal = (visit: VisitRow) => {
    setEditingVisit(visit)
    const visitDateTime = getVisitDateTime(visit)
    const parsed = parseComplaintString(visit.complaint)
    setForm({
      patient_id: visit.patient_id,
      complaint: visit.complaint,
      complaint_options: parsed.options,
      other_complaint: parsed.other,
      assessment: visit.assessment || '',
      treatment: visit.treatment || '',
      disposition: visit.disposition,
      notes: visit.notes || '',
      visit_date: format(visitDateTime, 'yyyy-MM-dd'),
      visit_time: format(visitDateTime, 'HH:mm'),
      assigned_doctor: visit.assigned_doctor || '',
      assigned_staff: visit.assigned_staff || '',
      temperature: visit.temperature ? String(visit.temperature) : '',
      entry_type: visit.entry_type || 'entrance',
      commuter_status: visit.commuter_status || 'commuter',
      place_name: visit.place_name || '',
      referred_to: visit.referred_to || '',
      type: visit.type || ''
    })
    setViewPatientExternalId(null)
    setShowViewModal(false)
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingVisit(null)
    setForm({
      patient_id: '',
      complaint: '',
      complaint_options: [],
      other_complaint: '',
      assessment: '',
      treatment: '',
      disposition: 'returned_to_class',
      notes: '',
      visit_date: format(new Date(), 'yyyy-MM-dd'),
      visit_time: format(new Date(), 'HH:mm'),
      assigned_doctor: '',
      assigned_staff: '',
      temperature: '',
      entry_type: 'entrance',
      commuter_status: 'commuter',
      place_name: '',
      referred_to: '',
      type: ''
    })
    setPatientSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const visitDateTime = combineDateTimeToIso(form.visit_date, form.visit_time)
    if (!visitDateTime) {
      toast.error('Invalid visit date or time')
      return
    }

    if (!form.complaint_options.length) {
      setFormErrors((prev) => ({ ...prev, complaint: 'Please select at least one complaint' }))
      toast.error('Please select at least one complaint')
      return
    }

    const visitPayload = {
      patient_id: form.patient_id,
      complaint: buildComplaintValue(),
      assessment: form.assessment || null,
      treatment: form.treatment || null,
      disposition: form.disposition,
      notes: form.notes || null,
      visit_date: form.visit_date,
      assigned_doctor: form.assigned_doctor || null,
      assigned_staff: form.assigned_staff || null,
      temperature: form.temperature ? parseFloat(form.temperature) : null,
      entry_type: form.entry_type || null,
      commuter_status: form.commuter_status || null,
      place_name: form.place_name || null,
      referred_to: form.referred_to || null,
      type: form.type || null,
      entrance_time: form.entry_type === 'entrance' ? visitDateTime : null,
      exit_time: form.entry_type === 'exit' ? visitDateTime : null
    }

    if (editingVisit) {
      // Update existing visit
      const { data: updatedVisit, error } = await supabase
        .from('clinic_visits')
        .update(visitPayload)
        .eq('id', editingVisit.id)
        .select()
        .single()

      if (error || !updatedVisit) {
        // eslint-disable-next-line no-console
        console.error('Update clinic_visits failed', error)
        toast.error('Failed to update visit')
        return
      }

      const updatedPatient = patients.find((p) => p.id === form.patient_id)
      setVisits((prev) => prev.map((v) =>
        v.id === editingVisit.id
          ? {
              ...v,
              ...updatedVisit,
              patient_id: form.patient_id,
              patient_name: updatedPatient ? `${updatedPatient.last_name}, ${updatedPatient.first_name}` : v.patient_name,
              patient_external_id: updatedPatient?.patient_id || v.patient_external_id
            }
          : v
      ))

      toast.success('Visit updated')
    } else {
      // Create new visit
      if (!profile) {
        toast.error('Not signed in')
        return
      }

      const { data: newVisit, error } = await supabase.from('clinic_visits').insert({
        ...visitPayload,
        created_by: profile.id
      }).select().single()

      if (error || !newVisit) {
        // eslint-disable-next-line no-console
        console.error('Insert clinic_visits failed', error)
        toast.error('Failed to save visit')
        return
      }

      toast.success('Visit recorded')
    }

    setShowForm(false)
    resetForm()
    setDateFilter(form.visit_date)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clinic visits</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export to Excel
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => {resetForm(); setShowViewModal(false); setEditingVisit(null); setShowForm(true)}}>
            <Plus className="h-4 w-4" />
            New visit
          </button>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by name, complaint, or assessment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="input-field w-auto"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          disabled={showAllHistory}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShowAllHistory((prev) => !prev)}
        >
          {showAllHistory ? 'Show Less' : 'View All History'}
        </button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loadingVisits ? (
          <div className="flex min-h-[220px] items-center justify-center p-10 text-slate-500">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading visit history...</span>
            </div>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Visit Date</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Complaint</th>
                <th className="px-4 py-3 font-medium">Assessment</th>
                <th className="px-4 py-3 font-medium">Treatment</th>
                <th className="px-4 py-3 font-medium">Disposition</th>
                <th className="px-4 py-3 font-medium">Referred To</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div className="font-medium text-slate-700">{v.visit_date ? format(new Date(v.visit_date), 'MMM d, yyyy') : 'N/A'}</div>
                    <div>{getVisitTimeLabel(v)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {v.patient_name ?? ((v.patients ? `${Array.isArray(v.patients) ? v.patients[0]?.last_name : v.patients.last_name}, ${Array.isArray(v.patients) ? v.patients[0]?.first_name : v.patients.first_name}` : '').trim() || v.patient_external_id || v.patient_id)}
                  </td>
                  <td className="px-4 py-3">{v.complaint}</td>
                  <td className="px-4 py-3">{v.assessment || 'N/A'}</td>
                  <td className="px-4 py-3">{v.treatment || 'N/A'}</td>
                  <td className="px-4 py-3 capitalize">{v.disposition.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3">{v.referred_to || 'N/A'}</td>
                  <td className="px-4 py-3">{v.notes || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <button
                      className="btn-primary btn-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        openVisitModal(v)
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-slate-500">No visits recorded for this date.</p>
        )}
      </div>

      {showViewModal && editingVisit && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
             <h2 className="text-lg font-semibold text-slate-800">Clinic visit details</h2>
             <div className="mt-4 space-y-3">
               <div>
                 <p className="text-xs text-slate-500">Patient</p>
                 <p className="font-medium">{viewPatientExternalId ?? editingVisit.patient_id}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Date</p>
                 <p>{editingVisit.visit_date ? format(new Date(editingVisit.visit_date), 'PP') : 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Time</p>
                 <p>{getVisitTimeLabel(editingVisit)}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Complaint</p>
                 <p>{editingVisit.complaint || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Assessment</p>
                 <p>{editingVisit.assessment || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Treatment</p>
                 <p>{editingVisit.treatment || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Disposition</p>
                 <p className="capitalize">{editingVisit.disposition.replaceAll('_', ' ')}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Referred To</p>
                 <p>{editingVisit.referred_to || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Notes</p>
                 <p>{editingVisit.notes || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Assigned Doctor</p>
                 <p>{editingVisit.assigned_doctor ? getDisplayName(doctors.find(d => d.id === editingVisit.assigned_doctor)?.full_name, 'clinic_doctor') : 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Assigned Staff</p>
                 <p>{editingVisit.assigned_staff ? staff.find(s => s.id === editingVisit.assigned_staff)?.full_name : 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Temperature (°C)</p>
                 <p>{editingVisit.temperature || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Entry Type</p>
                 <p className="capitalize">{editingVisit.entry_type ? normalizeLabel(editingVisit.entry_type) : 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Commuter Status</p>
                 <p className="capitalize">{editingVisit.commuter_status ? normalizeLabel(editingVisit.commuter_status) : 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Place Name</p>
                 <p>{editingVisit.place_name || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Referred To</p>
                 <p>{editingVisit.referred_to || '—'}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500">Type</p>
                 <p>{editingVisit.type || 'N/A'}</p>
               </div>
               <div className="flex justify-end gap-2 pt-2">
                 <button
                   type="button"
                   className="btn-secondary"
                   onClick={() => {
                     setShowViewModal(false)
                     setEditingVisit(null)
                     setViewPatientExternalId(null)
                   }}
                 >
                   Close
                 </button>
                 <button
                   type="button"
                   className="btn-primary"
                   onClick={() => {
                     setShowViewModal(false)
                     setShowForm(true)
                   }}
                 >
                   Edit visit
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

      {showForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
           <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
             <h2 className="text-lg font-semibold text-slate-800">{editingVisit ? 'Edit clinic visit' : 'New clinic visit'}</h2>
             <form onSubmit={handleSubmit} className="mt-4 space-y-3">
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="mb-1 block text-sm font-medium">Date</label>
                   <input
                     type="date"
                     name="visit_date"
                     value={form.visit_date}
                     onChange={handleChange}
                     className="input-field"
                     required
                   />
                 </div>
                 <div>
                   <label className="mb-1 block text-sm font-medium">Time</label>
                   <input
                     type="time"
                     name="visit_time"
                     value={form.visit_time}
                     onChange={handleChange}
                     className="input-field"
                     required
                   />
                 </div>
               </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Patient</label>
                <div className="relative">
                  <div className="input-field flex items-center px-0">
                    <Search className="h-4 w-4 text-slate-400 ml-3" />
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value)
                        setShowPatientDropdown(true)
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      className="flex-1 border-0 outline-none bg-transparent py-2 px-2"
                    />
                    {selectedPatient && (
                      <div className="text-xs text-slate-600 px-2">
                        {selectedPatient.last_name}, {selectedPatient.first_name}
                      </div>
                    )}
                  </div>
                  {showPatientDropdown && (
                    <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-md">
                      {filteredPatients.length > 0 ? (
                        filteredPatients.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectPatient(s)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="font-medium">{s.last_name}, {s.first_name}</div>
                            <div className="text-xs text-slate-500">ID: {s.patient_id}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-center text-sm text-slate-500">No patients found</div>
                      )}
                    </div>
                  )}
                </div>
                {!form.patient_id && <p className="text-xs text-red-600 mt-1">Please select a patient</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Complaint</label>
                <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {COMPLAINT_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.complaint_options.includes(option)}
                        onChange={(e) => handleComplaintOptionChange(option, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {form.complaint_options.includes('Others') && (
                  <div className="mt-2">
                    <input
                      type="text"
                      name="other_complaint"
                      value={form.other_complaint}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Describe other complaint"
                    />
                  </div>
                )}
                {formErrors.complaint && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.complaint}</p>
                )}
                {!form.complaint_options.length && !formErrors.complaint && (
                  <p className="text-xs text-red-600 mt-1">Please choose at least one complaint</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Assessment</label>
                  <textarea
                    name="assessment"
                    value={form.assessment}
                    onChange={handleChange}
                    className="input-field"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Treatment</label>
                  <textarea
                    name="treatment"
                    value={form.treatment}
                    onChange={handleChange}
                    className="input-field"
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Disposition</label>
                  <select
                    name="disposition"
                    value={form.disposition}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="returned_to_class">Returned to class</option>
                    <option value="sent_home">Sent home</option>
                    <option value="referred">Referred</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Referred To</label>
                  <input
                    type="text"
                    name="referred_to"
                    value={form.referred_to}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Hospital, Specialist"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Assigned Doctor</label>
                  <select
                    name="assigned_doctor"
                    value={form.assigned_doctor}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">-- Select a doctor --</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {getDisplayName(doctor.full_name, doctor.role)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Assigned Staff</label>
                  <select
                    name="assigned_staff"
                    value={form.assigned_staff}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">-- Select staff --</option>
                    {staff.map((staffMember) => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Temperature (°C)</label>
                  <input
                    type="number"
                    name="temperature"
                    value={form.temperature}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., 37.5"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Entry Type</label>
                  <select
                    name="entry_type"
                    value={form.entry_type}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="entrance">Entrance</option>
                    <option value="exit">Exit</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Commuter Status</label>
                  <select
                    name="commuter_status"
                    value={form.commuter_status}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="commuter">Commuter</option>
                    <option value="non-commuter">Non-commuter</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Place Name</label>
                  <input
                    type="text"
                    name="place_name"
                    value={form.place_name}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Clinic Room A"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="input-field"
                  disabled
                >
                  <option value="">-- Select type --</option>
                  <option value="IBED">IBED</option>
                  <option value="College">College</option>
                  <option value="SHS">SHS</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="School Personnel">School Personnel</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingVisit ? 'Update visit' : 'Save visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

