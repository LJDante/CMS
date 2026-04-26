import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import type { Student, ClinicVisit } from '../types.ts'
import { Search, Eye, X, Edit2, Check, Trash2, Download, X as XIcon, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import * as ExcelJS from 'exceljs'
import { EDUCATION_TYPE_OPTIONS, GRADE_LEVEL_OPTIONS, SCHOOL_YEAR_OPTIONS } from '../constants'
import { getGradeLevelDatabaseValues, isK12EducationLevel } from '../utils/helpers'
import philippinesData from '../constants/philippines.json'
import Papa from 'papaparse'

type EducationType = 'all' | 'k12' | 'college' | 'personnel'
type GradeLevel = 'all' | 'kindergarten' | 'elementary' | 'jhs' | 'shs'
type GuardianFilter = 'all' | 'has-contact' | 'no-contact'

export default function Patients() {
  const { profile } = useAuth()
  const [patients, setPatients] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Student | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [medicalHistory, setMedicalHistory] = useState<ClinicVisit[]>([])
  const [editingEnrollment, setEditingEnrollment] = useState(false)
  const [enrollmentStatus, setEnrollmentStatus] = useState<'active' | 'inactive'>('active')
  
  // Edit patient info states
  const [isEditingPatient, setIsEditingPatient] = useState(false)
  const [isSavingPatient, setIsSavingPatient] = useState(false)
  const [editedPatient, setEditedPatient] = useState<Partial<Student> | null>(null)
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  
  // Bulk edit states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<'active' | 'inactive'>('inactive')

  // Filter states
  const [educationType, setEducationType] = useState<EducationType>('all')
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('all')
  const [section, setSection] = useState('')
  const [schoolYear, setSchoolYear] = useState('all')
  const [guardianFilter, setGuardianFilter] = useState<GuardianFilter>('all')
  const [availableSections, setAvailableSections] = useState<string[]>([])
  const [loadingSections, setLoadingSections] = useState(false)

  // Check if user can edit patient info (staff and doctors)
  const canEditPatientInfo = profile?.role === 'clinic_staff' || profile?.role === 'clinic_doctor' || profile?.role === 'clinic_admin'

  // Load all patients (both students and personnel)
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('last_name')
      
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load patients', error)
        setPatients([])
      } else {
        setPatients((data ?? []) as Student[])
      }
      setLoading(false)
    }
    void load()
  }, [])

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
        const gradeLevelQueries = getGradeLevelDatabaseValues(gradeLevel)

        if (gradeLevelQueries.length === 0) {
          setAvailableSections([])
          return
        }

        // Fetch all patients with matching grade levels and get unique sections
        const { data, error } = await supabase
          .from('patients')
          .select('section')
          .in('grade_level', gradeLevelQueries)
        
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

  // Initialize selectedProvince when entering edit mode
  useEffect(() => {
    if (isEditingPatient && selectedPatient?.province) {
      setSelectedProvince(selectedPatient.province)
    }
  }, [isEditingPatient, selectedPatient?.province])

  // Load medical history for selected patient
  const loadMedicalHistory = async (patientId: string) => {
    const { data, error } = await supabase
      .from('clinic_visits')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
    
    if (error) {
      console.error('Failed to load medical history', error)
      setMedicalHistory([])
    } else {
      setMedicalHistory((data ?? []) as ClinicVisit[])
    }
  }

  // Toggle patient selection for bulk actions
  const toggleSelection = (patientId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId)
    } else {
      newSelected.add(patientId)
    }
    setSelectedIds(newSelected)
  }

  // Select all filtered patients
  const selectAll = () => {
    const allIds = new Set(filtered.map((p) => p.id))
    setSelectedIds(allIds)
  }

  // Clear all selections
  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Apply bulk status change
  const saveEnrollmentStatus = async () => {
    if (!selectedPatient) return

    try {
      // Update database
      await supabase
        .from('patients')
        .update({ enrollment_status: enrollmentStatus })
        .eq('id', selectedPatient.id)

      // Update selectedPatient state
      const updatedPatient = { ...selectedPatient, enrollment_status: enrollmentStatus }
      setSelectedPatient(updatedPatient)

      // Update patients array (use functional update to avoid stale closure)
      setPatients((prev) => prev.map(p => p.id === selectedPatient.id ? updatedPatient : p))

      setEditingEnrollment(false)
      toast.success(`Enrollment status updated to ${enrollmentStatus}`)
    } catch (error) {
      console.error('Failed to update status', error)
      toast.error('Failed to update enrollment status')
    }
  }

  const applyBulkStatusChange = async () => {
    if (selectedIds.size === 0) {
      toast.error('No patients selected')
      return
    }

    try {
      const idsArray = Array.from(selectedIds)
      // Since Supabase doesn't have direct bulk update in the SDK,
      // we'll update them individually but efficiently
      const updatePromises = idsArray.map((id) =>
        supabase
          .from('patients')
          .update({ enrollment_status: bulkStatus })
          .eq('id', id)
      )

      await Promise.all(updatePromises)
      
      toast.success(`Updated ${selectedIds.size} patient(s) to ${bulkStatus}`)
      setShowBulkActions(false)
      setSelectedIds(new Set())
      
      // Reload patients
      const { data } = await supabase
        .from('patients')
        .select('*')
        .order('last_name')
      if (data) {
        setPatients((data ?? []) as Student[])
      }
    } catch (error) {
      console.error('Failed to update status', error)
      toast.error('Failed to update enrollment status')
    }
  }

  // Edit patient information
  const startEditPatient = () => {
    if (!selectedPatient) return
    setEditedPatient({ ...selectedPatient })
    setEditErrors({})
    setIsEditingPatient(true)
  }

  const cancelEditPatient = () => {
    setEditedPatient(null)
    setEditErrors({})
    setIsEditingPatient(false)
  }

  const handlePatientFieldChange = (field: keyof Student, value: any) => {
    if (field === 'contact_number' || field === 'guardian_contact' || field === 'emergency_contact') {
      value = value.replace(/\D/g, '').slice(0, 11)
    }
    if (field === 'first_name' || field === 'middle_name' || field === 'last_name' || field === 'guardian_name' || field === 'mother_name' || field === 'father_name' || field === 'person_to_notify') {
      value = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'. -]/g, '')
    }
    if (field === 'sex' && value === 'F') {
      setEditedPatient(prev => prev ? { ...prev, sex: value, suffix: undefined } : null)
    } else {
      setEditedPatient(prev => prev ? { ...prev, [field]: value } : null)
    }

    setEditErrors((prev) => {
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }

  const validateEditedPatient = () => {
    const errors: Record<string, string> = {}
    if (!editedPatient) return errors

    if (editedPatient.first_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(editedPatient.first_name)) {
      errors.first_name = 'First name must contain letters only'
    }
    if (!editedPatient.first_name) {
      errors.first_name = 'First name is required'
    }

    if (editedPatient.last_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(editedPatient.last_name)) {
      errors.last_name = 'Last name must contain letters only'
    }
    if (!editedPatient.last_name) {
      errors.last_name = 'Last name is required'
    }

    if (editedPatient.contact_number && !/^[0-9]{11}$/.test(editedPatient.contact_number)) {
      errors.contact_number = 'Contact number must be exactly 11 digits'
    }
    if (!editedPatient.contact_number) {
      errors.contact_number = 'Contact number is required'
    }

    if (editedPatient.patient_type === 'student') {
      if (editedPatient.guardian_contact && !/^[0-9]{11}$/.test(editedPatient.guardian_contact)) {
        errors.guardian_contact = 'Guardian contact must be exactly 11 digits'
      }
      if (!editedPatient.guardian_contact) {
        errors.guardian_contact = 'Guardian contact is required'
      }

      if (editedPatient.guardian_email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i.test(editedPatient.guardian_email)) {
        errors.guardian_email = 'Enter a valid email address'
      }
      if (!editedPatient.guardian_email) {
        errors.guardian_email = 'Guardian email is required'
      }
    }

    if (editedPatient.emergency_contact && !/^[0-9]{11}$/.test(editedPatient.emergency_contact)) {
      errors.emergency_contact = 'Emergency contact must be exactly 11 digits'
    }
    if (editedPatient.emergency_contact && !editedPatient.person_to_notify) {
      errors.person_to_notify = 'Please provide the emergency contact name'
    }

    if (editedPatient.person_to_notify && !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(editedPatient.person_to_notify)) {
      errors.person_to_notify = 'Emergency contact name must contain letters only'
    }

    if (editedPatient.mother_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(editedPatient.mother_name)) {
      errors.mother_name = 'Name must contain letters only'
    }
    if (editedPatient.father_name && !/^[A-Za-zÀ-ÖØ-öø-ÿ'. -]+$/.test(editedPatient.father_name)) {
      errors.father_name = 'Name must contain letters only'
    }

    setEditErrors(errors)
    return errors
  }

  const savePatientChanges = async () => {
    if (!selectedPatient || !editedPatient) return

    const errors = validateEditedPatient()
    if (Object.keys(errors).length > 0) {
      toast.error('Please fix validation errors before saving')
      return
    }

    setIsSavingPatient(true)
    try {
      const updateData = {
        first_name: editedPatient.first_name,
        middle_name: editedPatient.middle_name,
        last_name: editedPatient.last_name,
        age: editedPatient.age,
        date_of_birth: editedPatient.date_of_birth,
        contact_number: editedPatient.contact_number,
        guardian_name: editedPatient.guardian_name,
        guardian_contact: editedPatient.guardian_contact,
        guardian_email: editedPatient.guardian_email,
        mother_name: editedPatient.mother_name,
        father_name: editedPatient.father_name,
        suffix: editedPatient.sex === 'M' ? editedPatient.suffix : null,
        father_suffix: editedPatient.father_suffix,
        person_to_notify: editedPatient.person_to_notify,
        emergency_contact: editedPatient.emergency_contact,
        voucher_type: editedPatient.voucher_type,
        allergies: editedPatient.allergies,
        diagnosed_diseases: editedPatient.diagnosed_diseases,
        address_field: editedPatient.address_field,
        barangay: editedPatient.barangay,
        city: editedPatient.city,
        province: editedPatient.province,
        zip_code: editedPatient.zip_code,
      }

      const { error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', selectedPatient.id)

      if (error) {
        console.error('Failed to update patient:', error)
        toast.error('Failed to save changes')
        return
      }

      // Update states
      const updatedPatient = { ...selectedPatient, ...updateData } as Student
      setSelectedPatient(updatedPatient)
      setPatients((prev) => prev.map(p => p.id === selectedPatient.id ? updatedPatient : p))
      setIsEditingPatient(false)
      toast.success('Patient information updated successfully')
    } catch (err) {
      console.error('Error saving patient:', err)
      toast.error('Failed to save changes')
    } finally {
      setIsSavingPatient(false)
    }
  }

  const displayPatient = isEditingPatient ? editedPatient : selectedPatient

  // Update selected province when displayPatient changes
  useEffect(() => {
    if (displayPatient?.province) {
      setSelectedProvince(displayPatient.province)
    } else {
      setSelectedProvince('')
    }
  }, [displayPatient?.province])

  // Update selected city when displayPatient changes
  useEffect(() => {
    if (displayPatient?.city) {
      setSelectedCity(displayPatient.city)
    } else {
      setSelectedCity('')
    }
  }, [displayPatient?.city])

  const filtered = patients.filter((s) => {
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
        if (s.patient_type !== 'student' || !['k-12', 'kindergarten', 'shs'].includes(s.education_level ?? '')) {
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

    // Grade level filter (only applies when education type is K-12)
    if (educationType === 'k12' && gradeLevel !== 'all') {
      const studentGradeLevelDb = s.grade_level
      let matches = false

      switch (gradeLevel) {
        case 'kindergarten':
          matches = studentGradeLevelDb === 'Kindergarten'
          break
        case 'elementary':
          matches = /^Grade [1-6]$/.test(studentGradeLevelDb ?? '')
          break
        case 'jhs':
          matches = /^Grade (7|8|9|10)$/.test(studentGradeLevelDb ?? '')
          break
        case 'shs':
          matches = /^Grade (11|12)$/.test(studentGradeLevelDb ?? '')
          break
      }

      if (!matches) return false
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

  const formatTimestamp = (value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/.test(value)) {
      return format(new Date(value), 'MMMM d, yyyy h:mm a')
    }
    return value
  }

  const exportToExcel = () => {
    let dataToExport = filtered
    let fileName = 'All_Patients_Export.xlsx'
    let data

    // Determine what to export based on current education type filter
    if (educationType === 'k12') {
      // K-12 students only with K-12 specific columns
      dataToExport = filtered.filter(p => p.patient_type === 'student' && p.education_level === 'k-12')
      fileName = 'K12_Students_Export.xlsx'
      
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Students')
      
      // Add layout rows
      worksheet.addRow([]) // Row 1: blank
      worksheet.addRow([]) // Row 2: blank
      worksheet.addRow(['Student Directories']) // Row 3: title
      worksheet.addRow([]) // Row 4: blank
      worksheet.addRow([]) // Row 5: blank
      worksheet.addRow(['Student ID', 'Grade Level', 'Section', 'Student Name', 'Address', 'Date of Birth', 'Contact Number', "Mother's Name", "Father's Name", "Guardian's Name", 'Person to Notify', 'Emergency Contact', 'Voucher Type']) // Row 6: headers
      
      // Add data rows
      const dataRows = dataToExport.map(p => [
        p.patient_id || 'N/A',
        p.grade_level || 'N/A',
        p.section || 'N/A',
        `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}`.trim() || 'N/A',
        p.address_field?.trim() || 'N/A',
        p.date_of_birth ? format(new Date(p.date_of_birth), 'MMMM dd, yyyy') : 'N/A',
        p.contact_number || 'N/A',
        p.mother_name || 'N/A',
        p.father_name || 'N/A',
        p.guardian_name || 'N/A',
        p.person_to_notify || 'N/A',
        p.emergency_contact || 'N/A',
        p.voucher_type || 'N/A'
      ])
      worksheet.addRows(dataRows)
      
      // Title styling
      worksheet.getRow(3).font = { bold: true, size: 14 }
      worksheet.mergeCells('A3:M3')
      worksheet.getCell('A3').alignment = { horizontal: 'center' }
      
      // Header styling
      worksheet.getRow(6).font = { bold: true, size: 11 }
      worksheet.getRow(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      }
      
      // Data rows font
      for (let i = 7; i <= worksheet.rowCount; i++) {
        worksheet.getRow(i).font = { size: 11 }
      }
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (!column) return
        let maxLength = 0
        column.eachCell?.({ includeEmpty: false }, cell => {
          const cellLength = cell.value ? cell.value.toString().length : 10
          if (cellLength > maxLength) maxLength = cellLength
        })
        column.width = Math.min(maxLength + 2, 60)
      })
      
      // Enable text wrap for long content columns
      worksheet.getColumn(4).alignment = { wrapText: true } // Student Name
      worksheet.getColumn(5).alignment = { wrapText: true } // Address
      worksheet.getColumn(8).alignment = { wrapText: true } // Mother's Name
      worksheet.getColumn(9).alignment = { wrapText: true } // Father's Name
      worksheet.getColumn(10).alignment = { wrapText: true } // Guardian's Name
      worksheet.getColumn(11).alignment = { wrapText: true } // Person to Notify
      
      // Save file
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        saveAs(blob, fileName)
        toast.success(`Excel file exported successfully (${dataToExport.length} records)`)
      })
      return
    } else if (educationType === 'college') {
      // College students only with college specific columns
      dataToExport = filtered.filter(p => p.patient_type === 'student' && p.education_level === 'college')
      fileName = 'College_Patients_Export.xlsx'
      
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Students')
      
      const headers = ['Student ID', 'Year Level', 'Program', 'Student Name', 'Address', 'Date of Birth', 'Contact Number', "Mother's Name", "Father's Name", "Guardian's Name", 'Person to Notify', 'Emergency Contact', 'Voucher Type']
      worksheet.addRow(headers)
      
      const dataRows = dataToExport.map(p => {
        const fullName = `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}`.trim()
        return [
          p.patient_id || 'N/A',
          p.year_level || 'N/A',
          p.program || 'N/A',
          fullName || 'N/A',
          p.address_field?.trim() || 'N/A',
          p.date_of_birth ? format(new Date(p.date_of_birth), 'MMMM dd, yyyy') : 'N/A',
          p.contact_number || 'N/A',
          p.mother_name || 'N/A',
          p.father_name || 'N/A',
          p.guardian_name || 'N/A',
          p.person_to_notify || 'N/A',
          p.emergency_contact || 'N/A',
          p.voucher_type || 'N/A'
        ]
      })
      worksheet.addRows(dataRows)
      
      // Header styling
      worksheet.getRow(1).font = { bold: true, size: 11 }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      }
      
      // Data rows font
      for (let i = 2; i <= worksheet.rowCount; i++) {
        worksheet.getRow(i).font = { size: 11 }
      }
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (!column) return
        let maxLength = 0
        column.eachCell?.({ includeEmpty: false }, cell => {
          const cellLength = cell.value ? cell.value.toString().length : 10
          if (cellLength > maxLength) maxLength = cellLength
        })
        column.width = Math.min(maxLength + 2, 60)
      })
      
      // Enable text wrap for long content columns
      worksheet.getColumn(4).alignment = { wrapText: true } // Student Name
      worksheet.getColumn(5).alignment = { wrapText: true } // Address
      worksheet.getColumn(8).alignment = { wrapText: true } // Mother's Name
      worksheet.getColumn(9).alignment = { wrapText: true } // Father's Name
      worksheet.getColumn(10).alignment = { wrapText: true } // Guardian's Name
      worksheet.getColumn(11).alignment = { wrapText: true } // Person to Notify
      
      // Save file
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        saveAs(blob, fileName)
        toast.success(`Excel file exported successfully (${dataToExport.length} records)`)
      })
      return
    } else if (educationType === 'personnel') {
      // Personnel only with personnel specific columns
      dataToExport = filtered.filter(p => p.patient_type === 'personnel')
      fileName = 'Personnel_Export.xlsx'
      
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Personnel')
      
      const headers = ['Patient ID', 'Full Name', 'Address', 'Date of Birth', 'Contact Number', 'Guardian\'s Name', 'Person to Notify', 'Emergency Contact']
      worksheet.addRow(headers)
      
      const dataRows = dataToExport.map(p => {
        const fullName = `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}`.trim()
        return [
          p.patient_id || 'N/A',
          fullName || 'N/A',
          p.address_field?.trim() || 'N/A',
          p.date_of_birth ? format(new Date(p.date_of_birth), 'MMMM dd, yyyy') : 'N/A',
          p.contact_number || 'N/A',
          p.guardian_name || 'N/A',
          p.person_to_notify || 'N/A',
          p.emergency_contact || 'N/A'
        ]
      })
      worksheet.addRows(dataRows)
      
      // Header styling
      worksheet.getRow(1).font = { bold: true, size: 11 }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      }
      
      // Data rows font
      for (let i = 2; i <= worksheet.rowCount; i++) {
        worksheet.getRow(i).font = { size: 11 }
      }
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (!column) return
        let maxLength = 0
        column.eachCell?.({ includeEmpty: false }, cell => {
          const cellLength = cell.value ? cell.value.toString().length : 10
          if (cellLength > maxLength) maxLength = cellLength
        })
        column.width = Math.min(maxLength + 2, 60)
      })
      
      // Enable text wrap for long content columns
      worksheet.getColumn(2).alignment = { wrapText: true } // Full Name
      worksheet.getColumn(3).alignment = { wrapText: true } // Address
      worksheet.getColumn(6).alignment = { wrapText: true } // Guardian's Name
      worksheet.getColumn(7).alignment = { wrapText: true } // Person to Notify
      
      // Save file
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        saveAs(blob, fileName)
        toast.success(`Excel file exported successfully (${dataToExport.length} records)`)
      })
      return
    } else {
      // All patients with all columns
      data = filtered.map(p => {
        const obj = {
          'Patient ID': p.patient_id || 'N/A',
          'First Name': p.first_name || 'N/A',
          'Middle Name': p.middle_name || 'N/A',
          'Last Name': p.last_name || 'N/A',
          'Patient Type': p.patient_type || 'N/A',
          'Age': p.age || 'N/A',
          'Grade Level': p.grade_level || 'N/A',
          'Section': p.section || 'N/A',
          'Education Level': p.education_level || 'N/A',
          'Program': p.program || 'N/A',
          'Year Level': p.year_level || 'N/A',
          'Date of Birth': p.date_of_birth ? format(new Date(p.date_of_birth), 'MMMM dd, yyyy') : 'N/A',
          'Sex': p.sex || 'N/A',
          'Contact Number': p.contact_number || 'N/A',
          'Guardian Name': p.guardian_name || 'N/A',
          'Guardian Contact': p.guardian_contact || 'N/A',
          'Guardian Email': p.guardian_email || 'N/A',
          'Mother\'s Name': p.mother_name || 'N/A',
          'Father\'s Name': p.father_name || 'N/A',
          'Person to Notify': p.person_to_notify || 'N/A',
          'Emergency Contact': p.emergency_contact || 'N/A',
          'Voucher Type': p.voucher_type || 'N/A',
          'Allergies': p.allergies || 'N/A',
          'Diagnosed Diseases': p.diagnosed_diseases || 'N/A',
          'Address': p.address_field?.trim() || 'N/A',
          'Enrollment Status': p.enrollment_status || 'active'
        }
        return obj
      })

      if (data.length === 0) {
        toast.error('No patients found to export')
        return
      }
      
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Patients')
      
      const headers = Object.keys(data[0]).filter(key => key !== 'id' && key !== 'ID')
      worksheet.addRow(headers)
      
      const dataRows = data.map(row => {
        const filteredRow = Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== 'id' && key !== 'ID')
        )
        return Object.values(filteredRow)
      })
      worksheet.addRows(dataRows)
      
      // Header styling
      worksheet.getRow(1).font = { bold: true, size: 11 }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      }
      
      // Data rows font
      for (let i = 2; i <= worksheet.rowCount; i++) {
        worksheet.getRow(i).font = { size: 11 }
      }
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (!column) return
        let maxLength = 0
        column.eachCell?.({ includeEmpty: false }, cell => {
          const cellLength = cell.value ? cell.value.toString().length : 10
          if (cellLength > maxLength) maxLength = cellLength
        })
        column.width = Math.min(maxLength + 2, 60)
      })
      
      // Enable text wrap for long content columns
      worksheet.getColumn(15).alignment = { wrapText: true } // Guardian Name
      worksheet.getColumn(18).alignment = { wrapText: true } // Mother's Name
      worksheet.getColumn(19).alignment = { wrapText: true } // Father's Name
      worksheet.getColumn(20).alignment = { wrapText: true } // Person to Notify
      worksheet.getColumn(23).alignment = { wrapText: true } // Allergies
      worksheet.getColumn(24).alignment = { wrapText: true } // Diagnosed Diseases
      worksheet.getColumn(25).alignment = { wrapText: true } // Full Address
      
      // Save file
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        saveAs(blob, fileName)
        toast.success(`Excel file exported successfully (${data.length} records)`)
      })
      return
    }

    // Fallback for old XLSX (should not reach here)
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Patients')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, fileName)
    toast.success(`Excel file exported successfully (${data.length} records)`)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Registered Patients</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-600">Total Patients</p>
            <p className="text-3xl font-bold text-blue-700">{patients.length}</p>
          </div>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            title="Export filtered patients to Excel based on current filters"
          >
            <Download className="h-4 w-4" />
            Export{educationType !== 'all' ? ` ${educationType.toUpperCase()}` : ''} to Excel
          </button>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-10"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

        {/* Grade Level Filter - Only show for K-12 */}
        {educationType === 'k12' && (
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
              {GRADE_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Section Filter - Only show when grade level is selected */}
        {educationType === 'k12' && gradeLevel !== 'all' && (
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

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-blue-900">
              {selectedIds.size} patient{selectedIds.size !== 1 ? 's' : ''} selected
            </p>
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Select All {filtered.length}
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => setShowBulkActions(true)}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Change Enrollment Status
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 text-center py-10">
          <p className="text-slate-500">Loading patients...</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={(e) => e.currentTarget.checked ? selectAll() : clearSelection()}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">ID</th>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Name</th>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Type</th>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Level / Program</th>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Enrollment Status</th>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Contact</th>
                <th className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const fullName = `${p.last_name}, ${p.first_name}${
                  p.middle_name ? ` ${p.middle_name}` : ''
                }`
                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelection(p.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-slate-100">{p.patient_id}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{fullName}</td>
                    <td className="px-4 py-3 capitalize text-slate-900 dark:text-slate-100">{p.patient_type}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{levelDisplay(p)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        (p.enrollment_status ?? 'active') === 'inactive'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        ● {(p.enrollment_status ?? 'active') === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-900 dark:text-slate-100">{p.contact_number || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                              setSelectedPatient(p)
                              const currentStatus = p.enrollment_status ?? 'active'
                              setEnrollmentStatus(currentStatus)
                              setEditingEnrollment(false)
                              setShowDetails(true)
                              void loadMedicalHistory(p.id)
                            }}
                        className="inline-flex items-center gap-2 rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
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
            <p className="py-10 text-center text-slate-500 dark:text-slate-400">No patients found.</p>
          )}
        </div>
      )}

      {/* Patient Details Modal */}
      {showDetails && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">{isEditingPatient ? 'Edit Patient Information' : 'Patient Details'}</h2>
              <div className="flex items-center gap-2">
                {canEditPatientInfo && !isEditingPatient && (
                  <button
                    onClick={startEditPatient}
                    className="inline-flex items-center gap-2 rounded px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Edit patient information"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowDetails(false)
                    setSelectedPatient(null)
                    setEnrollmentStatus('active')
                    setEditingEnrollment(false)
                    cancelEditPatient()
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">ID Number</label>
                    {isEditingPatient ? (
                      <input
                        type="text"
                        value={displayPatient?.patient_id || ''}
                        disabled
                        className="input-field mt-1 bg-gray-200"
                      />
                    ) : (
                      <p className="text-sm font-mono mt-1">{displayPatient?.patient_id}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Patient Type</label>
                    {isEditingPatient ? (
                      <select
                        value={displayPatient?.patient_type || 'student'}
                        onChange={(e) => handlePatientFieldChange('patient_type', e.target.value)}
                        className="input-field mt-1"
                      >
                        <option value="student">Student</option>
                        <option value="personnel">Personnel</option>
                      </select>
                    ) : (
                      <p className="text-sm mt-1 capitalize">{displayPatient?.patient_type}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">First Name</label>
                    {isEditingPatient ? (
                      <>
                        <input
                          type="text"
                          value={displayPatient?.first_name || ''}
                          onChange={(e) => handlePatientFieldChange('first_name', e.target.value)}
                          className="input-field mt-1"
                        />
                        {editErrors.first_name && <p className="text-xs text-red-600 mt-1">{editErrors.first_name}</p>}
                      </>
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.first_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Middle Name</label>
                    {isEditingPatient ? (
                      <input
                        type="text"
                        value={displayPatient?.middle_name || ''}
                        onChange={(e) => handlePatientFieldChange('middle_name', e.target.value)}
                        className="input-field mt-1"
                      />
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.middle_name || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Last Name</label>
                    {isEditingPatient ? (
                      <>
                        <input
                          type="text"
                          value={displayPatient?.last_name || ''}
                          onChange={(e) => handlePatientFieldChange('last_name', e.target.value)}
                          className="input-field mt-1"
                        />
                        {editErrors.last_name && <p className="text-xs text-red-600 mt-1">{editErrors.last_name}</p>}
                      </>
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.last_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sex</label>
                    {isEditingPatient ? (
                      <select
                        value={displayPatient?.sex || 'M'}
                        onChange={(e) => handlePatientFieldChange('sex', e.target.value)}
                        className="input-field mt-1"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.sex === 'M' ? 'Male' : 'Female'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Suffix</label>
                    {isEditingPatient ? (
                      displayPatient?.sex === 'M' ? (
                        <select
                          value={displayPatient?.suffix || ''}
                          onChange={(e) => handlePatientFieldChange('suffix', e.target.value)}
                          className="input-field mt-1"
                        >
                          <option value="">None</option>
                          <option value="Jr.">Jr.</option>
                          <option value="Sr.">Sr.</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                        </select>
                      ) : (
                        <p className="text-sm mt-1">N/A</p>
                      )
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.suffix || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Age</label>
                    {isEditingPatient ? (
                      <input
                        type="number"
                        value={displayPatient?.age || ''}
                        onChange={(e) => handlePatientFieldChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="input-field mt-1"
                      />
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.age || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date of Birth</label>
                    {isEditingPatient ? (
                      <input
                        type="date"
                        value={displayPatient?.date_of_birth || ''}
                        onChange={(e) => handlePatientFieldChange('date_of_birth', e.target.value)}
                        className="input-field mt-1"
                      />
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.date_of_birth || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact Number</label>
                    {isEditingPatient ? (
                      <>
                        <input
                          type="tel"
                          value={displayPatient?.contact_number || ''}
                          onChange={(e) => handlePatientFieldChange('contact_number', e.target.value)}
                          className="input-field mt-1"
                        />
                        {editErrors.contact_number && <p className="text-xs text-red-600 mt-1">{editErrors.contact_number}</p>}
                      </>
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.contact_number || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Education Information (for students) */}
              {selectedPatient.patient_type === 'student' && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Education Information</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Education Level</label>
                      <p className="text-sm mt-1 capitalize">{selectedPatient.education_level || 'N/A'}</p>
                    </div>
                    {(selectedPatient.education_level === 'k-12' || selectedPatient.education_level === 'kindergarten') && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grade Level</label>
                          <p className="text-sm mt-1">{selectedPatient.grade_level || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Section</label>
                          <p className="text-sm mt-1">{selectedPatient.section || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    {selectedPatient.education_level === 'shs' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">SHS Track</label>
                          <p className="text-sm mt-1">{selectedPatient.program || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Grade</label>
                          <p className="text-sm mt-1">{selectedPatient.year_level || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    {selectedPatient.education_level === 'college' && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Course</label>
                          <p className="text-sm mt-1">{selectedPatient.program || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Year Level</label>
                          <p className="text-sm mt-1">{selectedPatient.year_level || 'N/A'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Guardian Information (for students) */}
              {displayPatient?.patient_type === 'student' && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Guardian / Parent Information</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Guardian Name</label>
                      {isEditingPatient ? (
                        <>
                          <input
                            type="text"
                            value={displayPatient?.guardian_name || ''}
                            onChange={(e) => handlePatientFieldChange('guardian_name', e.target.value)}
                            className="input-field mt-1"
                          />
                          {editErrors.guardian_name && <p className="text-xs text-red-600 mt-1">{editErrors.guardian_name}</p>}
                        </>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.guardian_name || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Guardian Contact</label>
                      {isEditingPatient ? (
                        <>
                          <input
                            type="tel"
                            value={displayPatient?.guardian_contact || ''}
                            onChange={(e) => handlePatientFieldChange('guardian_contact', e.target.value)}
                            className="input-field mt-1"
                          />
                          {editErrors.guardian_contact && <p className="text-xs text-red-600 mt-1">{editErrors.guardian_contact}</p>}
                        </>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.guardian_contact || 'N/A'}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Guardian Email</label>
                      {isEditingPatient ? (
                        <>
                          <input
                            type="email"
                            value={displayPatient?.guardian_email || ''}
                            onChange={(e) => handlePatientFieldChange('guardian_email', e.target.value)}
                            className="input-field mt-1"
                          />
                          {editErrors.guardian_email && <p className="text-xs text-red-600 mt-1">{editErrors.guardian_email}</p>}
                        </>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.guardian_email || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Parents & Emergency Contact (for students) */}
              {displayPatient?.patient_type === 'student' && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Parents & Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mother's Name</label>
                      {isEditingPatient ? (
                        <>
                          <input
                            type="text"
                            value={displayPatient?.mother_name || ''}
                            onChange={(e) => handlePatientFieldChange('mother_name', e.target.value)}
                            onKeyPress={(e) => { if (/\d/.test(e.key)) e.preventDefault() }}
                            className="input-field mt-1"
                          />
                          {editErrors.mother_name && <p className="text-xs text-red-600 mt-1">{editErrors.mother_name}</p>}
                        </>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.mother_name || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Father's Name</label>
                      {isEditingPatient ? (
                        <>
                          <input
                            type="text"
                            value={displayPatient?.father_name || ''}
                            onChange={(e) => handlePatientFieldChange('father_name', e.target.value)}
                            onKeyPress={(e) => { if (/\d/.test(e.key)) e.preventDefault() }}
                            className="input-field mt-1"
                          />
                          {editErrors.father_name && <p className="text-xs text-red-600 mt-1">{editErrors.father_name}</p>}
                        </>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.father_name || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Father's suffix</label>
                      {isEditingPatient ? (
                        <select
                          value={displayPatient?.father_suffix || ''}
                          onChange={(e) => handlePatientFieldChange('father_suffix', e.target.value)}
                          className="input-field mt-1"
                        >
                          <option value="">None</option>
                          <option value="Jr.">Jr.</option>
                          <option value="Sr.">Sr.</option>
                          <option value="II">II</option>
                          <option value="III">III</option>
                          <option value="IV">IV</option>
                        </select>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.father_suffix || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Person to Notify</label>
                      {isEditingPatient ? (
                        <>
                          <input
                            type="text"
                            value={displayPatient?.person_to_notify || ''}
                            onChange={(e) => handlePatientFieldChange('person_to_notify', e.target.value)}
                            className="input-field mt-1"
                          />
                          {editErrors.person_to_notify && <p className="text-xs text-red-600 mt-1">{editErrors.person_to_notify}</p>}
                        </>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.person_to_notify || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Emergency Contact</label>
                      {isEditingPatient ? (
                        <>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="\d*"
                            value={displayPatient?.emergency_contact || ''}
                            onChange={(e) => handlePatientFieldChange('emergency_contact', e.target.value.replace(/\D/g, ''))}
                            className="input-field mt-1"
                          />
                          {editErrors.emergency_contact && <p className="text-xs text-red-600 mt-1">{editErrors.emergency_contact}</p>}
                        </>
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.emergency_contact || 'N/A'}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Voucher Type</label>
                      {isEditingPatient ? (
                        <input
                          type="text"
                          value={displayPatient?.voucher_type || ''}
                          onChange={(e) => handlePatientFieldChange('voucher_type', e.target.value)}
                          className="input-field mt-1"
                        />
                      ) : (
                        <p className="text-sm mt-1">{displayPatient?.voucher_type || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Address Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Address</h3>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Address</label>
                    {isEditingPatient ? (
                      <input
                        type="text"
                        value={displayPatient?.address_field || ''}
                        onChange={(e) => handlePatientFieldChange('address_field', e.target.value)}
                        className="input-field mt-1"
                        placeholder="e.g., Blk 4 Lot 12, Purok 3, Greenville Subd."
                      />
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.address_field || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Barangay</label>
                    {isEditingPatient ? (
                      selectedProvince && selectedCity && (philippinesData.barangays as any)?.[selectedProvince]?.[selectedCity]?.length > 0 ? (
                        <select
                          value={displayPatient?.barangay || ''}
                          onChange={(e) => handlePatientFieldChange('barangay', e.target.value)}
                          className="input-field mt-1"
                        >
                          <option value="">Select Barangay</option>
                          {((philippinesData.barangays as any)[selectedProvince][selectedCity] || []).map((barangay: string) => (
                            <option key={barangay} value={barangay}>
                              {barangay}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={displayPatient?.barangay || ''}
                          onChange={(e) => handlePatientFieldChange('barangay', e.target.value)}
                          className="input-field mt-1"
                          placeholder="e.g., Barangay San Isidro"
                        />
                      )
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.barangay || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Province</label>
                    {isEditingPatient ? (
                      <select
                        value={displayPatient?.province || ''}
                        onChange={(e) => {
                          handlePatientFieldChange('province', e.target.value)
                          setSelectedProvince(e.target.value)
                          // Clear city when province changes
                          handlePatientFieldChange('city', '')
                        }}
                        className="input-field mt-1"
                      >
                        <option value="">Select Province</option>
                        {philippinesData.provinces.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.province || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">City</label>
                    {isEditingPatient ? (
                      selectedProvince && (philippinesData.cities as any)[selectedProvince] ? (
                        <select
                          value={displayPatient?.city || ''}
                          onChange={(e) => handlePatientFieldChange('city', e.target.value)}
                          className="input-field mt-1"
                        >
                          <option value="">Select City</option>
                          {(philippinesData.cities as any)[selectedProvince].map((city: string) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={displayPatient?.city || ''}
                          onChange={(e) => handlePatientFieldChange('city', e.target.value)}
                          className="input-field mt-1"
                          placeholder="City/Municipality"
                        />
                      )
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.city || 'N/A'}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">ZIP Code</label>
                    {isEditingPatient ? (
                      <input
                        type="text"
                        value={displayPatient?.zip_code || ''}
                        onChange={(e) => handlePatientFieldChange('zip_code', e.target.value)}
                        className="input-field mt-1"
                        placeholder="4 digits"
                      />
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.zip_code || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Medical Information</h3>
                <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Allergies</label>
                    {isEditingPatient ? (
                      <textarea
                        value={displayPatient?.allergies || ''}
                        onChange={(e) => handlePatientFieldChange('allergies', e.target.value)}
                        className="input-field mt-2"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.allergies || 'None reported'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Diagnosed Diseases</label>
                    {isEditingPatient ? (
                      <textarea
                        value={displayPatient?.diagnosed_diseases || ''}
                        onChange={(e) => handlePatientFieldChange('diagnosed_diseases', e.target.value)}
                        className="input-field mt-2"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm mt-1">{displayPatient?.diagnosed_diseases || 'None reported'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Enrollment Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">Enrollment Status</h3>
                  <button
                    onClick={() => setEditingEnrollment(!editingEnrollment)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                    {editingEnrollment ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  {editingEnrollment ? (
                    <div className="space-y-3">
                      <select
                        value={enrollmentStatus}
                        onChange={(e) => setEnrollmentStatus(e.target.value as 'active' | 'inactive')}
                        className="input-field"
                      >
                        <option value="active">Active - Currently Enrolled</option>
                        <option value="inactive">Inactive - No Longer Enrolled</option>
                      </select>
                      <button
                        onClick={saveEnrollmentStatus}
                        className="w-full flex items-center justify-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Save Status
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        (selectedPatient.enrollment_status ?? 'active') === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(selectedPatient.enrollment_status ?? 'active') === 'active' ? '● Active' : '● Inactive'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical History / Clinic Visits */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Medical History (Clinic Visits)</h3>
                {medicalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {medicalHistory.map((visit) => (
                      <div key={visit.id} className="rounded-lg border border-slate-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-slate-800">
                            {new Date(visit.visit_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {visit.disposition.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <label className="font-medium text-slate-600">Complaint:</label>
                            <p className="text-slate-700">{visit.complaint || 'N/A'}</p>
                          </div>
                          {visit.assessment && (
                            <div>
                              <label className="font-medium text-slate-600">Assessment:</label>
                              <p className="text-slate-700">{visit.assessment}</p>
                            </div>
                          )}
                          {visit.treatment && (
                            <div>
                              <label className="font-medium text-slate-600">Treatment:</label>
                              <p className="text-slate-700">{visit.treatment}</p>
                            </div>
                          )}
                          {visit.notes && (
                            <div>
                              <label className="font-medium text-slate-600">Notes:</label>
                              <p className="text-slate-700">{visit.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <p className="text-sm text-slate-500">No clinic visits recorded yet</p>
                  </div>
                )}
              </div>

              {/* Registration Date */}
              <div className="rounded-lg bg-blue-50 p-4">
                <label className="text-xs font-medium text-blue-700 uppercase tracking-wide">Registration Date</label>
                <p className="text-sm mt-1 text-blue-900">
                  {new Date(selectedPatient.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-slate-200 sticky bottom-0 bg-white">
              {isEditingPatient ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditPatient}
                    disabled={isSavingPatient}
                    className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <XIcon className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePatientChanges}
                    disabled={isSavingPatient}
                    className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {isSavingPatient ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetails(false)
                    setSelectedPatient(null)
                    setEnrollmentStatus('active')
                    setEditingEnrollment(false)
                    cancelEditPatient()
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      {showBulkActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Change Enrollment Status</h2>
              <button
                onClick={() => setShowBulkActions(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-600 mb-4">
                Update enrollment status for <span className="font-semibold">{selectedIds.size} patient(s)</span>
              </p>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">New Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as 'active' | 'inactive')}
                  className="input-field"
                >
                  <option value="active">Active - Currently Enrolled</option>
                  <option value="inactive">Inactive - No Longer Enrolled</option>
                </select>
              </div>

              <div className="mt-4 rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Tip:</span> You can filter by level/program first, then select all to bulk update specific groups (e.g., all 4th year college).
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBulkActions(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={applyBulkStatusChange}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Update {selectedIds.size} Patient{selectedIds.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* CSV Import Modal */}
    </div>
  )
}
