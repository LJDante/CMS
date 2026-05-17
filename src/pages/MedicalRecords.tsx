import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { InventoryItem, MedicalRecord, Student, ClinicVisit } from '../types.ts'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { getDisplayName } from '../utils/nameFormatter'
import IndividualHealthRecordForm from '../components/IndividualHealthRecordForm'

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
  const [administeredMedicineHistory, setAdministeredMedicineHistory] = useState<Array<{ id: string; quantity: number; administered_at: string | null; inventory_name: string; administered_by_name: string }>>([])
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [medicineInventory, setMedicineInventory] = useState<InventoryItem[]>([])
  const [administeredMedicines, setAdministeredMedicines] = useState<Array<{ inventory_id: string; quantity: number }>>([
    { inventory_id: '', quantity: 1 }
  ])
  const [showHealthRecord, setShowHealthRecord] = useState(false)
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

  useEffect(() => {
    const loadMedicineInventory = async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('id,name,quantity_on_hand,unit')
        .eq('category', 'medicine')
        .order('name', { ascending: true })
      if (error) {
        toast.error(error.message || 'Failed to load medicine inventory')
        return
      }
      setMedicineInventory((data ?? []) as InventoryItem[])
    }
    void loadMedicineInventory()
  }, [])

  const addMedicineRow = () => {
    setAdministeredMedicines((prev) => [...prev, { inventory_id: '', quantity: 1 }])
  }

  const updateMedicineRow = (index: number, updates: Partial<{ inventory_id: string; quantity: number }>) => {
    setAdministeredMedicines((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...updates } : row))
    )
  }

  const removeMedicineRow = (index: number) => {
    setAdministeredMedicines((prev) => prev.filter((_, idx) => idx !== index))
  }

  const loadAdministeredMedicineHistory = async (medicalRecordId: string) => {
    try {
      const { data, error } = await supabase
        .from('administered_medicines')
        .select(`
          id,
          quantity,
          administered_at,
          inventory:inventory_id ( name ),
          administered_by:profiles!administered_medicines_administered_by_fkey ( full_name )
        `)
        .eq('medical_record_id', medicalRecordId)
        .order('administered_at', { ascending: false })

      if (error) {
        toast.error(error.message || 'Failed to load administered medicine history')
        return
      }

      setAdministeredMedicineHistory(
        (data ?? []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          administered_at: item.administered_at,
          inventory_name: item.inventory?.name || 'Unknown',
          administered_by_name: item.administered_by?.full_name || 'Unknown'
        }))
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to load administered medicine history')
    }
  }

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
    setAdministeredMedicines([{ inventory_id: '', quantity: 1 }])
    if ((data as any)?.id) {
      await loadAdministeredMedicineHistory((data as any).id)
    } else {
      setAdministeredMedicineHistory([])
    }
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

  const openPrintableRecord = () => {
    if (!selected) return
    setShowHealthRecord(true)
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
      const medicineRows = administeredMedicines
        .filter((row) => row.inventory_id)
        .map((row) => ({
          inventory_id: row.inventory_id,
          quantity: Number(row.quantity) || 0
        }))

      if (medicineRows.some((row) => row.quantity < 1)) {
        toast.error('Please enter a quantity of at least 1 for each medicine')
        return
      }

      let inventoryById: Record<string, { id: string; name: string; quantity_on_hand: number }> = {}
      if (medicineRows.length > 0) {
        const inventoryIds = Array.from(new Set(medicineRows.map((row) => row.inventory_id)))
        const { data: inventoryRows, error: inventoryError } = await supabase
          .from('inventory')
          .select('id,name,quantity_on_hand')
          .in('id', inventoryIds)
        if (inventoryError) throw inventoryError

        inventoryById = Object.fromEntries(
          (inventoryRows ?? []).map((item: any) => [item.id, item])
        )

        const requestedTotals = medicineRows.reduce<Record<string, number>>((acc, row) => {
          acc[row.inventory_id] = (acc[row.inventory_id] || 0) + row.quantity
          return acc
        }, {})

        for (const [inventoryId, totalQuantity] of Object.entries(requestedTotals)) {
          const item = inventoryById[inventoryId]
          if (!item) {
            toast.error('Selected medicine not found')
            return
          }
          if (item.quantity_on_hand - totalQuantity < 0) {
            toast.error(`Insufficient stock for ${item.name}`)
            return
          }
        }
      }

      let medicalRecordId = (record as any).id
      if ((record as any).id) {
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
          .eq('id', medicalRecordId)
        if (error) throw error
        toast.success('Medical record updated')
      } else {
        const payload: Record<string, unknown> = {
          patient_id: selected.id,
          last_updated_by: profile?.id || null
        }
        if (!missingMedColumns.diagnosed_diseases) payload.diagnosed_diseases = record.diagnosed_diseases || null
        if (!missingMedColumns.allergies) payload.allergies = record.allergies || null
        if (!missingMedColumns.immunization_history) payload.immunization_history = record.immunization_history || null

        const { data: insertedRecord, error } = await supabase
          .from('medical_records')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        medicalRecordId = insertedRecord?.id
        toast.success('Medical record saved')
      }

      if (medicalRecordId && medicineRows.length > 0) {
        const administeredRows = medicineRows.map((row) => ({
          medical_record_id: medicalRecordId,
          inventory_id: row.inventory_id,
          quantity: row.quantity,
          administered_by: profile?.id || null
        }))

        const { error: administeredError } = await supabase
          .from('administered_medicines')
          .insert(administeredRows)
        if (administeredError) throw administeredError

        const updateTotals = medicineRows.reduce<Record<string, number>>((acc, row) => {
          acc[row.inventory_id] = (acc[row.inventory_id] || 0) + row.quantity
          return acc
        }, {})

        const inventoryUpdates = await Promise.all(
          Object.entries(updateTotals).map(async ([inventoryId, totalQuantity]) => {
            const { error: updateError } = await supabase
              .from('inventory')
              .update({ quantity_on_hand: inventoryById[inventoryId].quantity_on_hand - totalQuantity })
              .eq('id', inventoryId)
            return updateError
          })
        )

        const firstInventoryError = inventoryUpdates.find((error) => error)
        if (firstInventoryError) throw firstInventoryError
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
    <div className="animate-fade-in w-full max-w-screen-xl px-4 py-3 sm:px-6 lg:px-8 mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Medical Records</h1>
        </div>
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
                    <button className="btn-primary" onClick={() => void openRecord(s)}>View / Edit</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="py-10 text-center text-slate-500">No patients found.</p>}
      </div>

      {showModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50 p-4">
          <div className="w-full max-w-6xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="min-w-0 text-lg font-semibold text-slate-800">Medical record — {selected.patient_id} — {selected.last_name}, {selected.first_name}</h2>
              <div className="flex flex-shrink-0 gap-2">
                <button className="btn-secondary" onClick={() => void openPrintableRecord()}>Open Printable</button>
              </div>
            </div>
            {Object.keys(missingMedColumns).length > 0 && (
              <div className="rounded-md bg-yellow-50 p-3 text-yellow-800 text-sm">
                Database missing medical_records columns: {Object.keys(missingMedColumns).join(', ')}. Saved records will omit these fields — run the migration in the README to add them.
              </div>
            )}
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-slate-700">Patient Details</h3>
                  <p className="text-sm text-slate-600">Full patient information for reference and quick edits.</p>
                </div>
                <div className="flex-shrink-0">
                  <button
                    className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <textarea rows={3} className="input-field w-full min-w-0" value={record.allergies || ''} onChange={(e) => setRecord((r) => ({ ...r, allergies: e.target.value }))} disabled={!!missingMedColumns.allergies} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Clinically diagnosed diseases</label>
                <textarea rows={3} className="input-field w-full min-w-0" value={record.diagnosed_diseases || ''} onChange={(e) => setRecord((r) => ({ ...r, diagnosed_diseases: e.target.value }))} disabled={!!missingMedColumns.diagnosed_diseases} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Immunization history / notes</label>
                <textarea rows={3} className="input-field w-full min-w-0" value={record.immunization_history || ''} onChange={(e) => setRecord((r) => ({ ...r, immunization_history: e.target.value }))} disabled={!!missingMedColumns.immunization_history} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">Administered Medicine</h3>
                  <button type="button" className="btn-secondary" onClick={addMedicineRow}>Add Medicine</button>
                </div>
                {administeredMedicines.map((medicine, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-[1.9fr_0.75fr_auto] items-end">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Medicine</label>
                      <select
                        className="input-field w-full"
                        value={medicine.inventory_id}
                        onChange={(e) => updateMedicineRow(index, { inventory_id: e.target.value })}
                      >
                        <option value="">Select medicine</option>
                        {medicineInventory.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.quantity_on_hand} {item.unit} available)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        className="input-field w-full"
                        value={medicine.quantity}
                        onChange={(e) => updateMedicineRow(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </div>
                    <button type="button" className="btn-secondary" onClick={() => removeMedicineRow(index)}>
                      Remove
                    </button>
                  </div>
                ))}
                {medicineInventory.length === 0 && (
                  <p className="text-sm text-slate-500">No medicine inventory items are available.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Administered Medicine History</h3>
                </div>
                {administeredMedicineHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No medicines administered yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 font-medium text-slate-600">Medicine Name</th>
                          <th className="px-3 py-2 font-medium text-slate-600">Quantity</th>
                          <th className="px-3 py-2 font-medium text-slate-600">Administered By</th>
                          <th className="px-3 py-2 font-medium text-slate-600">Date &amp; Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {administeredMedicineHistory.map((item) => (
                          <tr key={item.id} className="border-b border-slate-200">
                            <td className="px-3 py-2">{item.inventory_name}</td>
                            <td className="px-3 py-2">{item.quantity}</td>
                            <td className="px-3 py-2">{item.administered_by_name}</td>
                            <td className="px-3 py-2">{item.administered_at ? new Date(item.administered_at).toLocaleString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={() => void handleSave()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showHealthRecord && selected && (
        <IndividualHealthRecordForm
          key={selected.id}
          patient={selected}
          medicalRecord={record}
          onClose={() => setShowHealthRecord(false)}
        />
      )}
    </div>
  )
}
