import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { MedicalRecord, Student, ClinicVisit } from '../types.ts'
import { Search, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { getDisplayName } from '../utils/nameFormatter'
import * as XLSX from 'xlsx'

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
import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import philippinesData from '../constants/philippines.json'

export default function MedicalRecords() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [record, setRecord] = useState<Partial<MedicalRecord>>({})
  const [showModal, setShowModal] = useState(false)
  const [missingMedColumns, setMissingMedColumns] = useState<Record<string, boolean>>({})
  const [editingPatientInfo, setEditingPatientInfo] = useState(false)
  const [patientInfo, setPatientInfo] = useState<Partial<Student>>({})
  const [medicalHistory, setMedicalHistory] = useState<ClinicVisit[]>([])
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // probe medical_records for missing columns (diagnosed_diseases, allergies, immunization_history)
  useEffect(() => {
    const probe = async () => {
      const colsToCheck = ['diagnosed_diseases', 'allergies', 'immunization_history']
      const missing: Record<string, boolean> = {}
      for (const col of colsToCheck) {
        const { error } = await supabase.from('medical_records').select(col).limit(1)
        if (error && /column .* does not exist/i.test(error.message || '')) {
          missing[col] = true
        }
      }
      if (Object.keys(missing).length > 0) {
        setMissingMedColumns(missing)
        toast.error(`Missing medical_records columns: ${Object.keys(missing).join(', ')}. See README to add them.`)
      }
    }
    void probe()
  }, [])
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_id, first_name, middle_name, last_name, date_of_birth, age, contact_number, guardian_email, address_field, barangay, city, province, zip_code, sex')
        .order('last_name')
      if (error) {
        toast.error(error.message || 'Failed to load patients')
        return
      }
      setStudents((data ?? []) as Student[])
    }
    void load()
  }, [])

  // Update selected province when patientInfo changes
  useEffect(() => {
    if (patientInfo?.province) {
      setSelectedProvince(patientInfo.province)
    } else {
      setSelectedProvince('')
    }
  }, [patientInfo?.province])

  // Initialize selectedProvince when entering edit mode
  useEffect(() => {
    if (editingPatientInfo && selected?.province) {
      setSelectedProvince(selected.province)
    }
  }, [editingPatientInfo, selected?.province])

  // Update selectedCity when patientInfo changes
  useEffect(() => {
    if (patientInfo?.city) {
      setSelectedCity(patientInfo.city)
    } else {
      setSelectedCity('')
    }
  }, [patientInfo?.city])

  const openRecord = async (s: Student) => {
    setSelected(s)
    setPatientInfo(s)
    setShowModal(true)
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', s.id)
      .maybeSingle()
    if (error) {
      // if a column is missing, surface the missing column state and let the user edit available fields
      const missingMatch = error.message ? error.message.match(/column .* does not exist/i) : null
      if (missingMatch) {
        // re-run probe quickly to update missingMedColumns
        const colsToCheck = ['diagnosed_diseases', 'allergies', 'immunization_history']
        const missing: Record<string, boolean> = {}
        for (const col of colsToCheck) {
          const { error: e } = await supabase.from('medical_records').select(col).limit(1)
          if (e && /column .* does not exist/i.test(e.message || '')) missing[col] = true
        }
        if (Object.keys(missing).length > 0) setMissingMedColumns(missing)
      }
      toast.error(error.message || 'Failed to load medical record')
      return
    }
    setRecord(data ?? {})
    // load medical history (clinic visits)
    try {
      const { data: visits } = await supabase
        .from('clinic_visits')
        .select('*')
        .eq('patient_id', s.id)
        .order('visit_date', { ascending: false })
      setMedicalHistory((visits ?? []) as ClinicVisit[])
    } catch (e) {
      setMedicalHistory([])
    }
  }

  const formatSex = (v?: string | null) => {
    if (!v) return 'N/A'
    const s = String(v).trim().toLowerCase()
    if (s === 'm' || s === 'male') return 'Male'
    if (s === 'f' || s === 'female') return 'Female'
    return 'N/A'
  }

  const normalizeSex = (v?: string | null) => {
    if (!v) return undefined
    const s = String(v).trim().toLowerCase()
    if (s === 'm' || s === 'male') return 'M'
    if (s === 'f' || s === 'female') return 'F'
    return undefined
  }

  const formatTimestamp = (value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/.test(value)) {
      return format(new Date(value), 'MMMM d, yyyy h:mm a')
    }
    return value
  }

  const exportToExcel = () => {
    const data = students.map(s => {
      const obj = {
        'Patient ID': s.patient_id,
        'First Name': s.first_name,
        'Middle Name': s.middle_name || '',
        'Last Name': s.last_name,
        'Date of Birth': s.date_of_birth || '',
        'Age': s.age || '',
        'Sex': formatSex(s.sex),
        'Contact Number': s.contact_number || '',
        'Guardian Email': s.guardian_email || '',
        'Address': s.address_field?.trim() || 'N/A'
      }
      return Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, formatTimestamp(val)]))
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Medical Records')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'medical_records.xlsx')
    toast.success('Excel file exported successfully')
  }

  const openPrintableRecord = () => {
    if (!selected) return
    const physician = getDisplayName(profile?.full_name, profile?.role) || '[YOUR NAME], [YOUR COMPANY NAME]'
    const dob = formatDate(selected.date_of_birth || null)
    const address = selected.address_field?.trim() || 'N/A'

    const visitsHtml = medicalHistory.length > 0
      ? medicalHistory.map(v => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${new Date(v.visit_date).toLocaleDateString()}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${(v.complaint || 'N/A')}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">${(v.disposition || '').replace(/_/g,' ')}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="3" style="padding:8px">No clinic visits recorded.</td></tr>`

    const html = `<!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Medical Record - ${selected.last_name}, ${selected.first_name}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 28px; }
        .header { background: linear-gradient(90deg,#60a5fa,#93c5fd); padding:28px; color:#fff; border-radius:6px; }
        h1 { margin:0; font-size:24px; }
        .sub { margin-top:6px; color:rgba(255,255,255,0.95); }
        table.info { width:100%; border-collapse:collapse; margin-top:20px; }
        table.info td { padding:10px; border:1px solid #e6eef8; }
        table.visits { width:100%; border-collapse:collapse; margin-top:18px; }
        table.visits th { text-align:left; padding:8px; background:#f8fafc; border-bottom:1px solid #e6eef8; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Medical Record</h1>
        <div class="sub">Physician: ${physician}</div>
      </div>

      <p style="margin-top:18px;color:#334155;">The following information is a comprehensive medical record of the patient, intended for professional use only. This document ensures a detailed overview of the patient's medical history and current health status.</p>

      <table class="info">
        <tr><td style="width:30%;font-weight:600">Name:</td><td>${selected.first_name} ${selected.middle_name ? selected.middle_name + ' ' : ''}${selected.last_name}</td></tr>
        <tr><td style="font-weight:600">Date of Birth:</td><td>${dob}</td></tr>
        <tr><td style="font-weight:600">Gender:</td><td>${formatSex(selected.sex)}</td></tr>
        <tr><td style="font-weight:600">Contact Number:</td><td>${selected.contact_number || 'N/A'}</td></tr>
        <tr><td style="font-weight:600">Email:</td><td>${selected.guardian_email || 'N/A'}</td></tr>
        <tr><td style="font-weight:600">Address:</td><td>${address || 'N/A'}</td></tr>
      </table>

      <h3 style="margin-top:22px;">Medical History</h3>
      <p style="color:#374151">${(medicalHistory.length > 0) ? 'Summary of recent clinic visits (most recent first):' : 'No recorded clinic visits.'}</p>

      <table class="visits">
        <thead>
          <tr><th style="padding:8px">Date</th><th style="padding:8px">Complaint</th><th style="padding:8px">Disposition</th></tr>
        </thead>
        <tbody>
          ${visitsHtml}
        </tbody>
      </table>

      <div style="margin-top:22px;color:#6b7280;font-size:13px">Generated: ${new Date().toLocaleString()}</div>
      <div style="position:fixed;right:20px;bottom:20px;"><button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:10px 14px;border-radius:6px;cursor:pointer">Print</button></div>
    </body>
    </html>`

    const w = window.open('', '_blank')
    if (!w) {
      toast.error('Failed to open new window for printable record')
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  const savePatientInfo = async () => {
    if (!selected) return
    try {
      const payload: Record<string, unknown> = {
        contact_number: patientInfo.contact_number ?? null,
        guardian_email: patientInfo.guardian_email ?? null,
        address_field: patientInfo.address_field ?? null,
        barangay: patientInfo.barangay ?? null,
        city: patientInfo.city ?? null,
        province: patientInfo.province ?? null,
        zip_code: patientInfo.zip_code ?? null,
        sex: normalizeSex(patientInfo.sex)
      }

      const { error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', selected.id)

      if (error) throw error

      // update local state
      const updated = { ...selected, ...payload } as Student
      setSelected(updated)
      setStudents((prev) => prev.map(p => p.id === updated.id ? updated : p))
      setEditingPatientInfo(false)
      toast.success('Patient info updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update patient info')
    }
  }

  const handleSave = async () => {
    if (!selected) return
    try {
      if ((record as any).id) {
        // update
        const payload: Record<string, unknown> = {
          last_updated_by: profile?.id || null,
          last_updated_at: new Date().toISOString()
        }
        if (!missingMedColumns.diagnosed_diseases) payload.diagnosed_diseases = record.diagnosed_diseases || null
        if (!missingMedColumns.allergies) payload.allergies = record.allergies || null
        if (!missingMedColumns.immunization_history) payload.immunization_history = record.immunization_history || null

        const { error } = await supabase
          .from('medical_records')
          .update(payload)
          .eq('id', (record as any).id)
        if (error) throw error
        toast.success('Medical record updated')
      } else {
        // insert
        const payload: Record<string, unknown> = {
          patient_id: selected.id,
          last_updated_by: profile?.id || null
        }
        if (!missingMedColumns.diagnosed_diseases) payload.diagnosed_diseases = record.diagnosed_diseases || null
        if (!missingMedColumns.allergies) payload.allergies = record.allergies || null
        if (!missingMedColumns.immunization_history) payload.immunization_history = record.immunization_history || null

        const { error } = await supabase.from('medical_records').insert(payload)
        if (error) throw error
        toast.success('Medical record saved')
      }
      setShowModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save medical record')
    }
  }

  const filtered = students.filter((s) => {
    const term = search.toLowerCase()
    const fullName = `${s.last_name}, ${s.first_name}${s.middle_name ? ` ${s.middle_name}` : ''}`
    return s.patient_id.toLowerCase().includes(term) || fullName.toLowerCase().includes(term)
  })

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
        </div>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-10" placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const fullName = `${s.last_name}, ${s.first_name}${s.middle_name ? ` ${s.middle_name}` : ''}`
              return (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.patient_id}</td>
                  <td className="px-4 py-3">{fullName}</td>
                  <td className="px-4 py-3">
                    {profile?.role !== 'clinic_admin' && <button className="btn-primary" onClick={() => void openRecord(s)}>View / Edit</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-10 text-center text-slate-500">No patients found.</p>}
      </div>

      {showModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Medical record — {selected.patient_id} — {selected.last_name}, {selected.first_name}</h2>
              <div>
                <button className="btn-secondary mr-2" onClick={() => void openPrintableRecord()}>Open Printable</button>
              </div>
            </div>
            {Object.keys(missingMedColumns).length > 0 && (
              <div className="rounded-md bg-yellow-50 p-3 text-yellow-800 text-sm">
                Database missing medical_records columns: {Object.keys(missingMedColumns).join(', ')}. Saved records will omit these fields — run the migration in the README to add them.
              </div>
            )}
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Patient Details</h3>
                  <p className="text-sm text-slate-600">Full patient information for reference and quick edits.</p>
                </div>
                <div>
                  <button
                    className="inline-flex items-center gap-2 rounded px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      setEditingPatientInfo(!editingPatientInfo)
                      if (!editingPatientInfo) setPatientInfo(selected || {})
                    }}
                  >
                    {editingPatientInfo ? 'Cancel Edit' : 'Edit Patient Info'}
                  </button>
                </div>
              </div>

              {!editingPatientInfo ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Name</label>
                    <p className="text-sm text-slate-700">{selected.last_name}, {selected.first_name}{selected.middle_name ? ` ${selected.middle_name}` : ''}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Date of Birth</label>
                    <p className="text-sm text-slate-700">{formatDate(selected.date_of_birth || null)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Gender</label>
                    <p className="text-sm text-slate-700">{selected.sex === 'M' ? 'Male' : selected.sex === 'F' ? 'Female' : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Age</label>
                    <p className="text-sm text-slate-700">{selected.age ?? 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Contact</label>
                    <p className="text-sm text-slate-700">{selected.contact_number ?? 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500">Email</label>
                    <p className="text-sm text-slate-700">{selected.guardian_email ?? 'N/A'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500">Address</label>
                    <p className="text-sm text-slate-700">{selected.address_field?.trim() || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500">Contact Number</label>
                      <input className="input-field" value={patientInfo.contact_number || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, contact_number: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500">Gender</label>
                      <select className="input-field" value={patientInfo.sex || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, sex: normalizeSex(e.target.value) }))}>
                        <option value="">Unspecified</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500">Email</label>
                      <input className="input-field" value={patientInfo.guardian_email || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, guardian_email: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-500">Address</label>
                      <input className="input-field" value={patientInfo.address_field || ''} placeholder="e.g., Blk 4 Lot 12, Purok 3, Greenville Subd." onChange={(e) => setPatientInfo((p) => ({ ...p, address_field: e.target.value }))} />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {selectedCity && (philippinesData.barangays as any)?.[selectedCity]?.length > 0 ? (
                          <select className="input-field" value={patientInfo.barangay || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, barangay: e.target.value }))}>
                            <option value="">Select Barangay</option>
                            {((philippinesData.barangays as any)[selectedCity] || []).map((barangay: string) => (
                              <option key={barangay} value={barangay}>
                                {barangay}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input className="input-field" placeholder="Barangay" value={patientInfo.barangay || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, barangay: e.target.value }))} />
                        )}
                        <select className="input-field" value={patientInfo.province || ''} onChange={(e) => {
                          setPatientInfo((p) => ({ ...p, province: e.target.value }))
                          setSelectedProvince(e.target.value)
                          // Clear city when province changes
                          setPatientInfo((p) => ({ ...p, city: '' }))
                        }}>
                          <option value="">Select Province</option>
                          {philippinesData.provinces.map((province) => (
                            <option key={province} value={province}>
                              {province}
                            </option>
                          ))}
                        </select>
                        {selectedProvince && (philippinesData.cities as any)[selectedProvince] ? (
                          <select className="input-field" value={patientInfo.city || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, city: e.target.value }))}>
                            <option value="">Select City</option>
                            {(philippinesData.cities as any)[selectedProvince].map((city: string) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input className="input-field" placeholder="City/Municipality" value={patientInfo.city || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, city: e.target.value }))} />
                        )}
                        <input className="input-field col-span-2" placeholder="ZIP Code" value={patientInfo.zip_code || ''} onChange={(e) => setPatientInfo((p) => ({ ...p, zip_code: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="btn-secondary" onClick={() => { setEditingPatientInfo(false); setPatientInfo(selected || {}); }}>Cancel</button>
                    <button className="btn-primary" onClick={() => void savePatientInfo()}>Save Info</button>
                  </div>
                </div>
              )}

              <hr />

              <div>
                <label className="mb-1 block text-sm font-medium">Allergies</label>
                <textarea rows={3} className="input-field" value={record.allergies || ''} onChange={(e) => setRecord((r) => ({ ...r, allergies: e.target.value }))} disabled={!!missingMedColumns.allergies} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Clinically diagnosed diseases</label>
                <textarea rows={3} className="input-field" value={record.diagnosed_diseases || ''} onChange={(e) => setRecord((r) => ({ ...r, diagnosed_diseases: e.target.value }))} disabled={!!missingMedColumns.diagnosed_diseases} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Immunization history / notes</label>
                <textarea rows={3} className="input-field" value={record.immunization_history || ''} onChange={(e) => setRecord((r) => ({ ...r, immunization_history: e.target.value }))} disabled={!!missingMedColumns.immunization_history} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={() => void handleSave()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
