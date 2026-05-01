import { Search, Eye, Edit2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import type { Student } from '../../types'
import { EDUCATION_TYPE_OPTIONS, SCHOOL_YEAR_OPTIONS } from '../../constants'
import { getGradeFilterOptions, getGradeLevelQueryParams, isK12EducationLevel, matchesGradeFilter } from '../../utils/helpers'

interface StudentListProps {
  students: Student[]
  search: string
  onSearchChange: (search: string) => void
  onViewDetails: (student: Student) => void
  onStudentsReload?: () => void
}

type EducationType = 'all' | 'k12' | 'college' | 'personnel'
type GradeLevel = string
type GuardianFilter = 'all' | 'has-contact' | 'no-contact'

export function StudentList({ students, search, onSearchChange, onViewDetails, onStudentsReload }: StudentListProps) {
  const [educationType, setEducationType] = useState<EducationType>('all')
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('all')
  const [section, setSection] = useState('')
  const [schoolYear, setSchoolYear] = useState('all')
  const [guardianFilter, setGuardianFilter] = useState<GuardianFilter>('all')
  const [collegeProgram, setCollegeProgram] = useState('all')
  const [collegeYearLevel, setCollegeYearLevel] = useState('all')
  const [availableSections, setAvailableSections] = useState<string[]>([])
  const [availableCollegePrograms, setAvailableCollegePrograms] = useState<string[]>([])
  const [availableCollegeYearLevels, setAvailableCollegeYearLevels] = useState<string[]>([])
  const [loadingSections, setLoadingSections] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showSexModal, setShowSexModal] = useState(false)
  const [sexUpdateLoading, setSexUpdateLoading] = useState(false)

  // Fetch available sections when grade level changes
  useEffect(() => {
    const fetchSections = async () => {
      if (gradeLevel === 'all') {
        setAvailableSections([])
        setSection('')
        return
      }

      setLoadingSections(true)
      try {
        const queryParams = getGradeLevelQueryParams(educationType, gradeLevel)

        if (!queryParams) {
          setAvailableSections([])
          return
        }

        let query = supabase.from('patients').select('section')

        if (queryParams.educationLevels?.length) {
          query = query.in('education_level', queryParams.educationLevels)
        }

        query = query.in(queryParams.column, queryParams.values)

        const { data, error } = await query
        if (error) {
          console.error('Failed to fetch sections:', error)
          setAvailableSections([])
          return
        }

        // Extract unique, non-null, non-empty sections
        const uniqueSections = Array.from(
          new Set(
            (data ?? [])
              .map((row: any) => row.section)
              .filter((s: string | null): s is string => Boolean(s && s.trim()))
          )
        ).sort()

        setAvailableSections(uniqueSections)
        setSection('')
      } catch (err) {
        console.error('Error fetching sections:', err)
        setAvailableSections([])
      } finally {
        setLoadingSections(false)
      }
    }

    void fetchSections()
  }, [gradeLevel])

  useEffect(() => {
    const collegeStudents = students.filter((p) => p.education_level === 'college')
    const programs = Array.from(new Set(collegeStudents.map((p) => p.program).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)) as string[]
    const yearLevels = Array.from(new Set(collegeStudents.map((p) => p.year_level).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)) as string[]

    setAvailableCollegePrograms(programs)
    setAvailableCollegeYearLevels(yearLevels)
  }, [students])

  useEffect(() => {
    if (educationType !== 'college' && educationType !== 'all') {
      setCollegeProgram('all')
      setCollegeYearLevel('all')
    }
  }, [educationType])

  // Apply all filters
  const filtered = students.filter((s) => {
    // Search filter (by name or ID)
    const term = search.toLowerCase()
    const fullName = `${s.last_name}, ${s.first_name}${s.middle_name ? ` ${s.middle_name}` : ''}`
    const matchesSearch =
      s.patient_id.toLowerCase().includes(term) ||
      fullName.toLowerCase().includes(term)

    if (!matchesSearch) return false

    // Education type filter
    if (educationType !== 'all') {
      if (educationType === 'k12') {
        if (s.patient_type !== 'student' || !isK12EducationLevel(s.education_level)) {
          return false
        }
      } else if (educationType === 'college') {
        if (s.patient_type !== 'student' || s.education_level !== 'college') {
          return false
        }
      } else if (educationType === 'personnel') {
        if (s.patient_type !== 'personnel') {
          return false
        }
      }
    }

    if (gradeLevel !== 'all') {
      if (!matchesGradeFilter(s, educationType, gradeLevel)) return false
    }

    // Section filter (only applies when grade level is selected)
    if (section && s.section !== section) {
      return false
    }

    // School year filter (placeholder - no school_year column in current schema)
    // This is prepared for future use; currently just passes all
    if (schoolYear !== 'all') {
      // TODO: implement when school_year column is added
    }

    // College program filter
    if (collegeProgram !== 'all' && s.program !== collegeProgram) {
      return false
    }

    // College year level filter
    if (collegeYearLevel !== 'all' && s.year_level !== collegeYearLevel) {
      return false
    }

    // Guardian contact filter
    if (guardianFilter !== 'all') {
      if (guardianFilter === 'has-contact') {
        if (!s.guardian_contact) return false
      } else if (guardianFilter === 'no-contact') {
        if (s.guardian_contact) return false
      }
    }

    return true
  })

  const levelDisplay = (s: Student) => {
    const isShs = s.education_level === 'shs' || Boolean(s.shs_track)
    if (isShs && s.shs_track) {
      return `${s.shs_track}-${s.grade_level || s.year_level || 'N/A'}`
    }
    if (s.education_level === 'shs' && s.program && (s.grade_level || s.year_level)) {
      return `${s.program}-${s.grade_level || s.year_level}`
    }
    if (s.education_level === 'college' && s.program && s.year_level) {
      return `${s.program}-${s.year_level}`
    }
    return s.grade_level ?? '—'
  }

  const toggleSelection = (studentId: string) => {
    const next = new Set(selectedIds)
    if (next.has(studentId)) {
      next.delete(studentId)
    } else {
      next.add(studentId)
    }
    setSelectedIds(next)
  }

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((s) => s.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const updateSelectedSex = async (sex: 'M' | 'F') => {
    if (selectedIds.size === 0) return
    setSexUpdateLoading(true)
    try {
      const ids = Array.from(selectedIds)
      const { error } = await supabase
        .from('patients')
        .update({ sex })
        .in('id', ids)

      if (error) {
        console.error('Failed to update patient sex', error)
        toast.error('Failed to update patient sex')
        return
      }

      if (onStudentsReload) {
        try {
          await onStudentsReload()
        } catch (reloadError) {
          console.error('Failed to reload students after sex update', reloadError)
        }
      }

      toast.success(`Sex updated for ${ids.length} selected patients successfully`)
      clearSelection()
      setShowSexModal(false)
      return
    } catch (error) {
      console.error('Failed to update patient sex', error)
      toast.error('Failed to update patient sex')
    } finally {
      setSexUpdateLoading(false)
    }
  }

  return (
    <>
      {/* Search Bar */}
      <div className="mt-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowSexModal(true)}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit Sex ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Cascading Filter Dropdowns */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        {/* Education Type Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Education Type</label>
          <select
            value={educationType}
            onChange={(e) => {
              setEducationType(e.target.value as EducationType)
              setGradeLevel('all')
              setSection('')
            }}
            className="input-field"
          >
            {EDUCATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grade Level Filter for K-12 */}
        {(educationType === 'k12' || educationType === 'all') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level</label>
            <select
              value={gradeLevel}
              onChange={(e) => {
                setGradeLevel(e.target.value as GradeLevel)
                setSection('')
              }}
              className="input-field"
            >
              <option value="all">All Grade Levels</option>
              {getGradeFilterOptions(educationType).map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {/* Section Filter - Only show when grade level is selected */}
        {(educationType === 'k12' || educationType === 'all') && gradeLevel !== 'all' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="input-field"
              disabled={loadingSections}
            >
              <option value="">All Sections</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
            {loadingSections && <p className="text-xs text-slate-500 mt-1">Loading sections...</p>}
          </div>
        )}

        {/* College Program Filter */}
        {(educationType === 'college' || educationType === 'all') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Program</label>
            <select
              value={collegeProgram}
              onChange={(e) => setCollegeProgram(e.target.value)}
              className="input-field"
            >
              <option value="all">All Programs</option>
              {availableCollegePrograms.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* College Year Level Filter */}
        {(educationType === 'college' || educationType === 'all') && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Year Level</label>
            <select
              value={collegeYearLevel}
              onChange={(e) => setCollegeYearLevel(e.target.value)}
              className="input-field"
            >
              <option value="all">All Year Levels</option>
              {availableCollegeYearLevels.map((yearLevel) => (
                <option key={yearLevel} value={yearLevel}>
                  {yearLevel}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* School Year Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">School Year</label>
          <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="input-field">
            {SCHOOL_YEAR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Parent/Guardian Contact Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Info</label>
          <select
            value={guardianFilter}
            onChange={(e) => setGuardianFilter(e.target.value as GuardianFilter)}
            className="input-field"
          >
            <option value="all">All</option>
            <option value="has-contact">Has Guardian Contact</option>
            <option value="no-contact">No Guardian Contact</option>
          </select>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={(e) => e.currentTarget.checked ? selectAll() : clearSelection()}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Level / Program</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const fullName = `${s.last_name}, ${s.first_name}${
                s.middle_name ? ` ${s.middle_name}` : ''
              }`
              return (
                <tr
                  key={s.id}
                  className={`border-b border-slate-100 ${selectedIds.has(s.id) ? 'bg-sky-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-slate-900">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelection(s.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.patient_id}</td>
                  <td className="px-4 py-3">{fullName}</td>
                  <td className="px-4 py-3 capitalize">{s.patient_type}</td>
                  <td className="px-4 py-3">{levelDisplay(s)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onViewDetails(s)}
                      className="inline-flex items-center gap-2 rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      title="View patient details"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-slate-500">No patients found.</p>
        )}
      </div>

      {showSexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Change sex for {selectedIds.size} selected patient{selectedIds.size !== 1 ? 's' : ''} to:</h2>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => void updateSelectedSex('M')}
                className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:bg-blue-400"
                disabled={sexUpdateLoading}
              >
                Male
              </button>
              <button
                onClick={() => void updateSelectedSex('F')}
                className="w-full rounded bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition-colors disabled:cursor-not-allowed disabled:bg-pink-400"
                disabled={sexUpdateLoading}
              >
                Female
              </button>
            </div>
            <button
              onClick={() => setShowSexModal(false)}
              className="mt-4 w-full rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
