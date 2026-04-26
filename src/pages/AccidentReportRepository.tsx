import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Patient, AccidentReport } from '../types'
import { Search, Upload, Download, Trash2, Eye, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useAccidentRepository } from '../hooks/useAccidentRepository'
import { format } from 'date-fns'

export default function AccidentReportRepository() {
  const { user, profile } = useAuth()
  const { records, loading: recordsLoading, loadRecords, uploadRecord, deleteRecord } = useAccidentRepository()

  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})

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

  // Load reports when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      loadRecords(selectedPatient.id)
    }
  }, [selectedPatient, loadRecords])

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
      toast.error('Please select a file to upload')
      return
    }

    try {
      setUploading(true)
      const result = await uploadRecord(selectedPatient.id, uploadFile, user.id)

      if (result) {
        // Reset form
        setUploadFile(null)
        setShowUploadForm(false)
        toast.success('Upload complete, loading updated list...')

        // Reload records
        await loadRecords(selectedPatient.id)
      }
    } catch (error) {
      console.error('Upload handler error:', error)
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this accident report?')) return

    try {
      setDeleting(prev => ({ ...prev, [reportId]: true }))
      await deleteRecord(reportId)
    } catch (error) {
      console.error('Delete handler error:', error)
    } finally {
      setDeleting(prev => ({ ...prev, [reportId]: false }))
    }
  }

  const handlePreview = (fileUrl: string) => {
    window.open(fileUrl, '_blank')
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accident Report Repository</h1>
          <p className="mt-1 text-slate-500">Manage patient accident report documents</p>
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
                  Accident Reports for {selectedPatient.first_name} {selectedPatient.last_name}
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
                  Upload Report
                </button>
              )}

              {/* Upload Form */}
              {showUploadForm && (
                <form onSubmit={handleUpload} className="mb-6 p-4 bg-gray-50 rounded-lg border border-slate-200">
                  <div className="space-y-4">
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
                        {uploading ? 'Uploading...' : 'Upload Report'}
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

              {/* Reports List */}
              {recordsLoading ? (
                <div className="text-center py-8 text-slate-500">Loading reports...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 mb-2" />
                  <p>No accident reports uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Accident Report
                          </span>
                        </div>
                        <p className="font-medium text-slate-800 truncate">{report.file_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {report.file_size && `${(report.file_size / 1024).toFixed(2)} KB • `}
                          Uploaded {format(new Date(report.uploaded_at), 'PPp')}
                        </p>
                      </div>

                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handlePreview(report.file_url)}
                          title="Preview document"
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={report.file_url}
                          download={report.file_name}
                          title="Download document"
                          className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deleting[report.id]}
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
              <p>Select a patient to view or upload accident reports</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
