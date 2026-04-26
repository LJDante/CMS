import { format } from 'date-fns'
import { MessageSquare, Edit2, Trash2, Download } from 'lucide-react'
import type { Consultation } from '../../types'

interface ConsultationListProps {
  consultations: Consultation[]
  onViewNotes: (consultation: Consultation) => void
  onEdit: (consultation: Consultation) => void
  onDelete: (id: string) => void
  onExport?: (consultations: Consultation[]) => void
  loading?: boolean
}

export function ConsultationList({
  consultations,
  onViewNotes,
  onEdit,
  onDelete,
  loading = false
}: ConsultationListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-500">Loading consultations...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Consultations</h3>

      {consultations.length === 0 ? (
        <p className="text-center text-slate-500 py-8">No consultations found</p>
      ) : (
        <div className="space-y-3">
          {consultations.map((consultation) => (
            <div
              key={consultation.id}
              className="border border-slate-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-slate-600">
                      {format(new Date(consultation.consultation_date), 'PPP p')}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {consultation.doctor_name || 'No Doctor'}
                    </span>
                  </div>

                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Reason:</strong> {consultation.reason || 'Not specified'}
                  </div>

                  {consultation.diagnosis_result && (
                    <div className="text-sm text-slate-700 mb-2">
                      <strong>Diagnosis:</strong> {consultation.diagnosis_result}
                    </div>
                  )}

                  {consultation.follow_up_date && (
                    <div className="text-sm text-slate-700">
                      <strong>Follow-up:</strong> {format(new Date(consultation.follow_up_date), 'PPP')}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onViewNotes(consultation)}
                    className="text-blue-600 hover:text-blue-700 transition-colors p-1"
                    title="View Notes"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(consultation)}
                    className="text-green-600 hover:text-green-700 transition-colors p-1"
                    title="Edit Consultation"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(consultation.id)}
                    className="text-red-600 hover:text-red-700 transition-colors p-1"
                    title="Delete Consultation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
