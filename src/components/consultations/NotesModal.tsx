import { useState } from 'react'
import { format } from 'date-fns'
import { X, Plus } from 'lucide-react'
import type { ConsultationNote } from '../../types'

interface NotesModalProps {
  consultationId: string
  notes: ConsultationNote[]
  loading: boolean
  onAddNote: (consultationId: string, noteText: string) => Promise<void>
  onClose: () => void
}

export function NotesModal({ consultationId, notes, loading, onAddNote, onClose }: NotesModalProps) {
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setNoteError('Please enter a note before saving')
      return
    }

    setAddingNote(true)
    try {
      await onAddNote(consultationId, newNote.trim())
      setNewNote('')
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setAddingNote(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Consultation Notes</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Add Note Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Add New Note</label>
            <div className="flex gap-2">
              <textarea
                className="input-field flex-1"
                rows={3}
                value={newNote}
                onChange={(e) => {
                  setNewNote(e.target.value)
                  setNoteError(null)
                }}
                placeholder="Enter your note..."
                disabled={addingNote}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || addingNote}
                className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {noteError && <p className="text-xs text-red-600 mt-2">{noteError}</p>}
          </div>

          {/* Notes List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-slate-500 py-8">Loading notes...</div>
            ) : notes.length === 0 ? (
              <div className="text-center text-slate-500 py-8">No notes yet</div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-2">
                    {format(new Date(note.created_at), 'PPP p')}
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap">{note.note_text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
