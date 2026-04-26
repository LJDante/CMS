import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Patient, DentalRecord, DentalFormType } from '../types'
import { Search, Upload, Download, Trash2, Eye, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useDentalRepository } from '../hooks/useDentalRepository'
import { format } from 'date-fns'

export default function DentalRepository() {
  const { user, profile } = useAuth()
  const { records, loading: recordsLoading, loadRecords, uploadRecord, deleteRecord } = useDentalRepository()

  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [formType, setFormType] = useState<DentalFormType>('dental_health_record')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Load patients on mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, patient_id, first_name, middle_name, last_name, sex')
          .order('last_name')

        if (error) {
          console.error('Error loading patients:', error)
          toast.error('Failed to load patients')
          return
        }

        setPatients((data ?? []) as Patient[])
      } catch (error) {
        console.error('Failed to load patients:', error)
        toast.error('Failed to load patients')
      } finally {
        setPatientsLoading(false)
      }
    }

    loadPatients()
  }, [])

  // Load records when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      loadRecords(selectedPatient.id)
    }
  }, [selectedPatient])

  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.first_name} ${patient.last_name} ${patient.patient_id}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase())
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file is PDF
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB')
      return
    }

    setUploadFile(file)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!uploadFile || !selectedPatient || !user) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setUploading(true)
      await uploadRecord(selectedPatient.id, uploadFile, formType, user.id)

      // Reset form
      setUploadFile(null)
      setFormType('dental_health_record')
      setShowUploadForm(false)

      // Reload records
      await loadRecords(selectedPatient.id)
    } catch (error) {
      console.error('Upload handler error:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      setDeleting(prev => ({ ...prev, [recordId]: true }))
      await deleteRecord(recordId)
    } catch (error) {
      console.error('Delete handler error:', error)
    } finally {
      setDeleting(prev => ({ ...prev, [recordId]: false }))
    }
  }

  const handlePreview = (fileUrl: string) => {
    window.open(fileUrl, '_blank')
  }

  const getFormTypeLabel = (type: DentalFormType): string => {
    return type === 'dental_health_record' ? 'Dental Health Record' : 'Dental Health Referral'
  }

  const getFormTypeBadgeColor = (type: DentalFormType): string => {
    return type === 'dental_health_record'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800'
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dental Repository</h1>
          <p className="mt-1 text-slate-500">Manage dental health records and referrals</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Patient Search */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Select Patient</h2>

            {patientsLoading ? (
              <div className="text-center py-4 text-slate-500">Loading patients...</div>
            ) : (
              <>
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <p className="text-center py-4 text-slate-500">No patients found</p>
                  ) : (
                    filteredPatients.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition ${
                          selectedPatient?.id === patient.id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <div className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </div>
                        <div className="text-xs text-slate-500">ID: {patient.patient_id}</div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Documents List and Upload */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                  Dental Documents for {selectedPatient.first_name} {selectedPatient.last_name}
                </h2>
                <p className="text-sm text-slate-500">Patient ID: {selectedPatient.patient_id}</p>
              </div>

              {/* Upload Button */}
              {!showUploadForm && (
                <button
                  onClick={() => setShowUploadForm(true)}
                  className="btn-primary flex items-center gap-2 mb-6"
                >
                  <Upload className="h-4 w-4" />
                  Upload Document
                </button>
              )}

              {/* Upload Form */}
              {showUploadForm && (
                <form onSubmit={handleUpload} className="mb-6 p-4 bg-gray-50 rounded-lg border border-slate-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Document Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as DentalFormType)}
                        className="input-field"
                      >
                        <option value="dental_health_record">Dental Health Record</option>
                        <option value="dental_health_referral">Dental Health Referral</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">PDF File</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        required
                        className="input-field"
                      />
                      {uploadFile && (
                        <p className="text-sm text-slate-600 mt-2">
                          Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={uploading || !uploadFile}
                        className="btn-primary flex-1"
                      >
                        {uploading ? 'Uploading...' : 'Upload Document'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUploadForm(false)
                          setUploadFile(null)
                        }}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Documents List */}
              {recordsLoading ? (
                <div className="text-center py-8 text-slate-500">Loading documents...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p>No dental documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getFormTypeBadgeColor(record.form_type)}`}>
                            {getFormTypeLabel(record.form_type)}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 truncate">{record.file_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {record.file_size && `${(record.file_size / 1024).toFixed(2)} KB • `}
                          Uploaded {format(new Date(record.uploaded_at), 'PPp')}
                        </p>
                      </div>

                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handlePreview(record.file_url)}
                          title="Preview document"
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={record.file_url}
                          download={record.file_name}
                          title="Download document"
                          className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(record.id)}
                          disabled={deleting[record.id]}
                          title="Delete document"
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-2" />
              <p>Select a patient to view or upload dental documents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
