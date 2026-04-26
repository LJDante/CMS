import { Search, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import type { Student } from '../../types'
import { EDUCATION_TYPE_OPTIONS, SCHOOL_YEAR_OPTIONS } from '../../constants'
import { getGradeFilterOptions, getGradeLevelQueryParams, isK12EducationLevel, matchesGradeFilter } from '../../utils/helpers'

interface StudentListProps {
  students: Student[]
  search: string
  onSearchChange: (search: string) => void
  onViewDetails: (student: Student) => void
}

type EducationType = 'all' | 'k12' | 'college' | 'personnel'
type GradeLevel = string
type GuardianFilter = 'all' | 'has-contact' | 'no-contact'

export function StudentList({ students, search, onSearchChange, onViewDetails }: StudentListProps) {
  const [educationType, setEducationType] = useState<EducationType>('all')
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('all')
  const [section, setSection] = useState('')
  const [schoolYear, setSchoolYear] = useState('all')
  const [guardianFilter, setGuardianFilter] = useState<GuardianFilter>('all')
  const [availableSections, setAvailableSections] = useState<string[]>([])
  const [loadingSections, setLoadingSections] = useState(false)

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
    if (s.education_level === 'shs' && s.program && s.year_level) {
      return `${s.program}-${s.year_level}`
    }
    if (s.education_level === 'college' && s.program && s.year_level) {
      return `${s.program}-${s.year_level}`
    }
    return s.grade_level ?? '—'
  }

  return (
    <>
      {/* Search Bar */}
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Cascading Filter Dropdowns */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <tr key={s.id} className="border-b border-slate-100 hover:bg-gray-50">
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
    </>
  )
}
