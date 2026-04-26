import { Search } from 'lucide-react'
import type { Patient } from '../../types'

interface PatientListProps {
  patients: Patient[]
  search: string
  onSearchChange: (value: string) => void
  onPatientSelect: (patient: Patient) => void
  selectedPatientId?: string
}

export function PatientList({ patients, search, onSearchChange, onPatientSelect, selectedPatientId }: PatientListProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Select Patient</h2>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field pl-10"
          placeholder="Search by name or patient ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Patient List */}
      <div className="max-h-96 overflow-y-auto">
        {patients.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No patients found</p>
        ) : (
          <div className="space-y-2">
            {patients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => onPatientSelect(patient)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedPatientId === patient.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-slate-800">
                  {patient.last_name}, {patient.first_name}
                  {patient.middle_name && ` ${patient.middle_name}`}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  ID: {patient.patient_id} • {patient.patient_type}
                  {patient.grade_level && ` • Grade ${patient.grade_level}`}
                  {patient.section && ` • ${patient.section}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
