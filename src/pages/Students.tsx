import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStudents } from '../hooks/useStudents'
import { useAuth } from '../contexts/AuthContext'
import { StudentList, StudentDetailsModal, StudentFormModal } from '../components/students'
import type { Student } from '../types'

export default function Students() {
  const { students, loadStudents, addStudent } = useStudents()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student)
    setShowDetails(true)
  }

  const handleCloseDetails = () => {
    setShowDetails(false)
    setSelectedStudent(null)
  }

  const handleFormSuccess = (student: Student) => {
    addStudent(student)
    setShowForm(false)
  }

  const handleStudentUpdated = (updatedStudent: Student) => {
    // Update the selectedStudent state to reflect changes
    setSelectedStudent(updatedStudent)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patients (students & personnel)</h1>
          <p className="mt-1 text-slate-500">
            Clinic-side registry of patients (students and school personnel), separate from the
            official school database.
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Register patient
        </button>
      </div>

      <StudentList
        students={students}
        search={search}
        onSearchChange={setSearch}
        onViewDetails={handleViewDetails}
        onStudentsReload={loadStudents}
      />

      <StudentDetailsModal
        student={selectedStudent}
        isOpen={showDetails}
        onClose={handleCloseDetails}
        role={profile?.role}
        onStudentUpdated={handleStudentUpdated}
      />

      <StudentFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}

