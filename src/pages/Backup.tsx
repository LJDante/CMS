import { useState, useEffect } from 'react'
import { Download, FileJson, FileText, Database, Trash2, Upload } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { exportAsExcel, exportAsCSV, exportAsSQL, getBackupFilename, getBackupStats } from '../utils/backupExport'
import { supabase } from '../lib/supabaseClient'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface StoredBackup {
  id: string
  filename: string
  format: 'excel' | 'csv' | 'sql'
  date: Date
  totalRecords: number
  totalTables: number
}

export function Backup() {
  const [backups, setBackups] = useState<StoredBackup[]>([])
  const [exporting, setExporting] = useState<'excel' | 'csv' | 'sql' | null>(null)
  const [importing, setImporting] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string>('patients')
  const [patientUploadCategory, setPatientUploadCategory] = useState<'k-12' | 'college' | 'personnel'>('k-12')

  useEffect(() => {
    loadBackups()
  }, [])

  const loadBackups = () => {
    const stored = localStorage.getItem('clinic_backups')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setBackups(parsed.map((b: any) => ({ 
          ...b, 
          date: new Date(b.date),
          totalRecords: b.totalRecords ?? 0,
          totalTables: b.totalTables ?? 0
        })))
      } catch (error) {
        console.error('Error loading backups:', error)
      }
    }
  }

  const handleExcelBackup = async () => {
    setExporting('excel')
    try {
      const filename = getBackupFilename('excel')
      const stats = await getBackupStats()
      await exportAsExcel(filename)
      const newBackup: StoredBackup = {
        id: Date.now().toString(),
        filename,
        format: 'excel',
        date: new Date(),
        totalRecords: stats.totalRecords,
        totalTables: stats.totalTables
      }
      saveBackupInfo(newBackup)
    } catch (error) {
      console.error('Excel backup error:', error)
    } finally {
      setExporting(null)
    }
  }

  const handleCSVBackup = async () => {
    setExporting('csv')
    try {
      const filename = getBackupFilename('csv')
      const stats = await getBackupStats()
      await exportAsCSV(filename)
      const newBackup: StoredBackup = {
        id: Date.now().toString(),
        filename,
        format: 'csv',
        date: new Date(),
        totalRecords: stats.totalRecords,
        totalTables: stats.totalTables
      }
      saveBackupInfo(newBackup)
    } catch (error) {
      console.error('CSV backup error:', error)
    } finally {
      setExporting(null)
    }
  }

  const handleSQLBackup = async () => {
    setExporting('sql')
    try {
      const filename = getBackupFilename('sql')
      const stats = await getBackupStats()
      await exportAsSQL(filename)
      const newBackup: StoredBackup = {
        id: Date.now().toString(),
        filename,
        format: 'sql',
        date: new Date(),
        totalRecords: stats.totalRecords,
        totalTables: stats.totalTables
      }
      saveBackupInfo(newBackup)
    } catch (error) {
      console.error('SQL backup error:', error)
    } finally {
      setExporting(null)
    }
  }

  const saveBackupInfo = (backup: StoredBackup) => {
    const updated = [backup, ...backups].slice(0, 20)
    localStorage.setItem('clinic_backups', JSON.stringify(updated))
    setBackups(updated)
  }

  const handleDeleteBackup = (backupId: string) => {
    const updated = backups.filter(b => b.id !== backupId)
    localStorage.setItem('clinic_backups', JSON.stringify(updated))
    setBackups(updated)
    toast.success('Backup deleted successfully')
  }

  const handleTableSelect = (value: string) => {
    if (value === 'k-12' || value === 'college' || value === 'personnel') {
      setSelectedTable('patients')
      setPatientUploadCategory(value as 'k-12' | 'college' | 'personnel')
    } else {
      setSelectedTable(value)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      // Use default headers for templates to ensure consistency
      const headers = getDefaultHeadersForTable(selectedTable)

      if (headers.length === 0) {
        toast.error('No columns found for this table')
        return
      }

      // Create Excel template with proper formatting
      const ws = XLSX.utils.aoa_to_sheet([headers])

      // Add a sample data row for tables with quantity columns or patients to ensure proper formatting
      if (selectedTable === 'inventory' || selectedTable === 'supply_request_items' || selectedTable === 'patients') {
        const sampleRow = new Array(headers.length).fill('')
        if (selectedTable === 'inventory') {
          const qtyIndex = headers.indexOf('quantity_on_hand')
          const reorderIndex = headers.indexOf('reorder_level')
          if (qtyIndex !== -1) sampleRow[qtyIndex] = '0'
          if (reorderIndex !== -1) sampleRow[reorderIndex] = '0'
        } else if (selectedTable === 'supply_request_items') {
          const qtyIndex = headers.indexOf('quantity')
          if (qtyIndex !== -1) sampleRow[qtyIndex] = '0'
        } else if (selectedTable === 'patients') {
          const studentIdIndex = headers.indexOf('Student ID')
          if (studentIdIndex !== -1) sampleRow[studentIdIndex] = '012345'

          const addressIndex = headers.indexOf('Address')
          if (addressIndex !== -1) sampleRow[addressIndex] = 'Block 39A Lot 6A Dumaguete Street South City Homes'

          const dobIndex = headers.indexOf('Date of Birth')
          if (dobIndex !== -1) sampleRow[dobIndex] = 'July 27, 2003'

          const ageIndex = headers.indexOf('Age')
          if (ageIndex !== -1) sampleRow[ageIndex] = '17'

          const educationLevelIndex = headers.indexOf('Education Level')
          if (educationLevelIndex !== -1) {
            sampleRow[educationLevelIndex] = patientUploadCategory === 'college' ? 'college' : patientUploadCategory === 'k-12' ? 'k-12' : ''
          }

          const yearLevelIndex = headers.indexOf('Year Level')
          if (yearLevelIndex !== -1 && patientUploadCategory === 'college') {
            sampleRow[yearLevelIndex] = '1st'
          }

          const programIndex = headers.indexOf('Program')
          if (programIndex !== -1 && patientUploadCategory === 'college') {
            sampleRow[programIndex] = 'Program Name'
          }

          const lastNameIndex = headers.indexOf('Last Name')
          if (lastNameIndex !== -1) {
            sampleRow[lastNameIndex] = 'Doe'
          }

          const firstNameIndex = headers.indexOf('First Name')
          if (firstNameIndex !== -1) {
            sampleRow[firstNameIndex] = 'John'
          }

          const middleNameIndex = headers.indexOf('Middle Name')
          if (middleNameIndex !== -1) {
            sampleRow[middleNameIndex] = 'A'
          }

          const sexIndex = headers.indexOf('Sex')
          if (sexIndex !== -1) {
            sampleRow[sexIndex] = 'M'
          }

          const suffixIndex = headers.indexOf('Suffix')
          if (suffixIndex !== -1) sampleRow[suffixIndex] = 'Jr.'

          const fatherSuffixIndex = headers.indexOf('Father Suffix')
          if (fatherSuffixIndex !== -1) sampleRow[fatherSuffixIndex] = 'Jr.'

          const guardianEmailIndex = headers.indexOf('Guardian Email')
          if (guardianEmailIndex !== -1) sampleRow[guardianEmailIndex] = 'guardian@example.com'

          const enrollmentStatusIndex = headers.indexOf('Enrollment Status')
          if (enrollmentStatusIndex !== -1) sampleRow[enrollmentStatusIndex] = 'active'

          const adviserIndex = headers.indexOf('Adviser')
          if (adviserIndex !== -1) sampleRow[adviserIndex] = 'Mrs. Smith'

          const contactColumns = ['Contact Number', 'Emergency Contact', 'Guardian Contact']
          contactColumns.forEach((colName) => {
            const contactIndex = headers.indexOf(colName)
            if (contactIndex !== -1) {
              sampleRow[contactIndex] = '09123456789'
            }
          })
        }
        XLSX.utils.sheet_add_aoa(ws, [sampleRow], { origin: 1 })

        if (selectedTable === 'patients') {
          const contactColumns = ['Contact Number', 'Emergency Contact', 'Guardian Contact']
          contactColumns.forEach((colName) => {
            const colIndex = headers.indexOf(colName)
            if (colIndex === -1) return

            for (let row = 0; row <= 100; row++) {
              const cellRef = XLSX.utils.encode_cell({ r: row, c: colIndex })
              if (!ws[cellRef]) {
                ws[cellRef] = { t: 's', v: '' }
              } else {
                ws[cellRef].t = 's'
                ws[cellRef].v = String(ws[cellRef].v || '')
              }
            }

            const headerCellRef = XLSX.utils.encode_cell({ r: 0, c: colIndex })
            if (!ws[headerCellRef]) ws[headerCellRef] = { t: 's', v: colName }
            if (!ws['!cols']) ws['!cols'] = []
            ws['!cols'][colIndex] = {
              ...(ws['!cols'][colIndex] || {}),
              wch: 15
            }
          })
        }
      }

      // Format quantity columns as text to preserve leading zeros
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col < headers.length; col++) {
          const header = headers[col]
          if ((selectedTable === 'inventory' && (header === 'quantity_on_hand' || header === 'reorder_level')) ||
              (selectedTable === 'supply_request_items' && header === 'quantity') ||
              (selectedTable === 'patients' && (header === 'student_id' || header === 'Contact Number' || header === 'Emergency Contact' || header === 'Guardian Contact'))) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col })
            if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }
            ws[cellRef].t = 's' // Force as string/text
            ws[cellRef].v = String(ws[cellRef].v || '')
          }
        }
      }

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, selectedTable)
      XLSX.writeFile(wb, `${selectedTable}_template.xlsx`)

      toast.success(`Template downloaded for ${selectedTable}`)
    } catch (error) {
      console.error('Template download error:', error)
      toast.error(`Failed to download template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getDefaultHeadersForTable = (table: string): string[] => {
    const tableHeaders: { [key: string]: string[] } = {
      patients: ['Student ID', 'Grade Level', 'Section', 'Last Name', 'First Name', 'Middle Name', 'Address', 'Date of Birth', 'Age', 'Sex', 'Suffix', 'Father Suffix', 'Contact Number', 'Guardian Contact', 'Guardian Email', 'Mother\'s Name', 'Mother First Name', 'Mother Middle Name', 'Mother Last Name', 'Father\'s Name', 'Father First Name', 'Father Middle Name', 'Father Last Name', 'Guardian\'s Name', 'Person to Notify', 'Emergency Contact', 'Voucher Type', 'Patient Type', 'Program', 'Year Level', 'SHS Track', 'Education Level', 'Enrollment Status', 'Adviser', 'Barangay', 'City', 'Province', 'Zip Code', 'Allergies', 'Diagnosed Diseases'],
      inventory: ['id', 'name', 'category', 'unit', 'quantity_on_hand', 'reorder_level', 'expiration_date', 'remarks', 'created_at', 'updated_at'],
      profiles: ['id', 'user_id', 'email', 'full_name', 'role', 'created_at', 'updated_at'],
      medical_records: ['id', 'patient_id', 'record_date', 'diagnosis', 'treatment', 'medications', 'notes', 'created_at', 'updated_at'],
      consultations: ['id', 'patient_id', 'staff_id', 'consultation_date', 'consultation_time', 'chief_complaint', 'findings', 'diagnosis', 'treatment_plan', 'prescription', 'follow_up_date', 'status', 'created_at', 'updated_at'],
      clinic_visits: ['id', 'patient_id', 'visit_date', 'visit_time', 'purpose', 'assigned_staff', 'type', 'notes', 'created_at', 'updated_at'],
      staff_schedules: ['id', 'staff_id', 'schedule_date', 'start_time', 'end_time', 'is_available', 'notes', 'created_at', 'updated_at'],
      supply_requests: ['id', 'requested_by', 'request_date', 'status', 'notes', 'approved_by', 'approved_at', 'created_at', 'updated_at'],
      supply_request_items: ['id', 'request_id', 'inventory_id', 'quantity', 'created_at', 'updated_at'],
      dental_repository: ['id', 'patient_id', 'procedure_date', 'procedure_type', 'tooth_number', 'findings', 'treatment', 'notes', 'created_at', 'updated_at'],
      accident_report_repository: ['id', 'patient_id', 'incident_date', 'incident_time', 'location', 'description', 'injuries', 'treatment', 'witnesses', 'reported_by', 'created_at', 'updated_at']
    }
    return tableHeaders[table] || []
  }

  const parseDateOfBirth = (input: string): string | null => {
    if (!input) return null
    try {
      let date: Date
      const dateMatch = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(input)
      if (dateMatch) {
        const year = Number(dateMatch[1])
        const month = Number(dateMatch[2])
        const day = Number(dateMatch[3])
        date = new Date(year, month - 1, day)
      } else {
        date = new Date(input)
      }
      if (!isNaN(date.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      }
      return null
    } catch {
      return null
    }
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false
      })

      if (parsed.errors.length > 0) {
        throw new Error(`CSV parsing error: ${parsed.errors[0].message}`)
      }

      let data = parsed.data as any[]

      if (data.length === 0) {
        toast.error('No data found in CSV file')
        return
      }

      // Clean data: remove rows with no valid data and clean column names
      data = data
        .filter(row => Object.values(row).some(value => value !== null && value !== ''))
        .map(row => {
          const cleaned: any = {}
          for (const [key, value] of Object.entries(row)) {
            const trimmedKey = key.trim()
            if (trimmedKey) {
              cleaned[trimmedKey] = value
            }
          }
          return cleaned
        })

      if (data.length === 0) {
        toast.error('No valid data found in CSV file after cleaning')
        return
      }

      // Transform data for patients table
      let transformedData = data
      let skippedRows: { row: number, reason: string }[] = []
      let contactNumberReport: string[] = []
      let guardianContactReport: string[] = []
      let emergencyContactReport: string[] = []
      let contactNumberSavedCount = 0
      let contactNumberNullCount = 0
      let guardianContactSavedCount = 0
      let guardianContactNullCount = 0
      let emergencyContactSavedCount = 0
      let emergencyContactNullCount = 0

      if (selectedTable === 'patients') {
        const getCSVValue = (row: any, ...keys: string[]) => {
          for (const key of keys) {
            const value = row[key]
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              return String(value)
            }
          }
          return ''
        }

        const parseFullName = (fullName: string) => {
          const value = String(fullName || '').trim()
          if (!value) {
            return { first: null, middle: null, last: null }
          }

          if (value.includes(',')) {
            const parts = value.split(',')
            const last = parts[0].trim() || null
            const remaining = parts[1]?.trim() || ''
            const names = remaining.split(/\s+/).filter(Boolean)
            const first = names[0] || null
            const middle = names.length > 1 ? names.slice(1).join(' ') : null
            return { first, middle, last }
          }

          const parts = value.split(/\s+/).filter(Boolean)
          if (parts.length === 1) {
            return { first: parts[0], middle: null, last: parts[0] }
          }
          if (parts.length === 2) {
            return { first: parts[0], middle: null, last: parts[1] }
          }

          return {
            first: parts[0] || null,
            middle: parts.slice(1, -1).join(' ') || null,
            last: parts[parts.length - 1] || null
          }
        }

        const normalizeRow = (rawRow: any) => {
          const lookup: Record<string, any> = {}
          Object.keys(rawRow).forEach((key) => {
            const normalizedKey = String(key || '').toLowerCase().trim().replace(/\s+/g, '_')
            lookup[normalizedKey] = rawRow[key]
          })

          const get = (...keys: string[]) => {
            for (const key of keys) {
              const normalizedKey = String(key || '').toLowerCase().trim().replace(/\s+/g, '_')
              const val = lookup[normalizedKey]
              if (val !== undefined && val !== '') return val
            }
            return null
          }

          return {
            patient_id: get('patient_id', 'id_number', 'student_id'),
            first_name: get('first_name', 'firstname', 'first name'),
            middle_name: get('middle_name', 'middlename', 'middle name'),
            last_name: get('last_name', 'lastname', 'last name'),
            suffix: get('suffix') || null,
            sex: normalizeSex(get('sex', 'gender')),
            age: parseInt(String(get('age'))) || null,
            date_of_birth: parseDate(get('date_of_birth', 'birthday', 'dob', 'birthdate', 'date of birth')),
            contact_number: normalizePhone(get('contact_number', 'contact number', 'contact', 'phone', 'mobile', 'cellphone')),
            patient_type: get('patient_type', 'type') || 'student',
            education_level: normalizeEducationLevel(get('education_level', 'education level')),
            grade_level: get('grade_level', 'grade level', 'grade', 'gradelevel') || null,
            section: get('section') || null,
            shs_track: normalizeSHSTrack(get('shs_track', 'track', 'strand', 'shs track')),
            year_level: get('year_level', 'year level', 'year') || null,
            program: get('program', 'course', 'degree') || null,
            guardian_name: get('guardian_name', 'guardian name', 'guardian') || null,
            guardian_contact: normalizePhone(get('guardian_contact', 'guardian contact', 'guardian_contact_number', 'guardian phone')),
            guardian_email: get('guardian_email', 'guardian email') || null,
            mother_first_name: get('mother_first_name', 'mother first name', "mother's first name") || null,
            mother_middle_name: get('mother_middle_name', 'mother middle name') || null,
            mother_last_name: get('mother_last_name', 'mother last name') || null,
            father_first_name: get('father_first_name', 'father first name') || null,
            father_middle_name: get('father_middle_name', 'father middle name') || null,
            father_last_name: get('father_last_name', 'father last name') || null,
            father_suffix: normalizeFatherSuffix(get('father_suffix', 'father suffix')),
            person_to_notify: get('person_to_notify', 'person to notify') || null,
            emergency_contact: normalizePhone(get('emergency_contact', 'emergency contact', 'emergency_contact_number', 'emergency phone', 'person_to_notify_contact')),
            voucher_type: get('voucher_type', 'voucher type') || null,
            address_field: get('address_field', 'address') || null,
            barangay: get('barangay') || null,
            city: get('city') || null,
            province: get('province') || null,
            zip_code: normalizeZip(get('zip_code', 'zip', 'zipcode')),
            enrollment_status: get('enrollment_status', 'enrollment status') || 'active',
            allergies: get('allergies') || null,
            diagnosed_diseases: get('diagnosed_diseases', 'diagnosed diseases', 'diseases') || null,
            adviser: get('adviser') || null
          }
        }

        const normalizePatientId = (value: any) => {
          const raw = String(value || '').trim()
          if (/^\d{2}-\d{5}$/.test(raw)) return raw
          const digits = raw.replace(/\D/g, '')
          if (/^\d{7}$/.test(digits)) {
            return `${digits.slice(0, 2)}-${digits.slice(2)}`
          }
          return null
        }

        const normalizeSex = (val: any) => {
          if (val == null) return null
          const v = String(val).trim().toUpperCase()
          if (v === 'M' || v === 'MALE') return 'M'
          if (v === 'F' || v === 'FEMALE') return 'F'
          return null
        }

        const normalizePhone = (val: any) => {
          if (!val) return null
          let digits = val.toString().trim().replace(/\D/g, '')

          // +639XXXXXXXXX or 639XXXXXXXXX → 09XXXXXXXXX
          if (digits.startsWith('63') && digits.length === 12) {
            digits = '0' + digits.slice(2)
          }

          // 9XXXXXXXXX → 09XXXXXXXXX
          if (digits.length === 10 && digits.startsWith('9')) {
            digits = '0' + digits
          }

          if (digits.length === 11 && digits.startsWith('0')) {
            return digits
          }

          console.log(`Unparseable phone number: ${val} → digits: ${digits}`)
          return null
        }

        const normalizeZip = (val: any) => {
          if (val == null) return null
          const digits = String(val).replace(/\D/g, '')
          return digits.length === 4 ? digits : null
        }

        const normalizeSHSTrack = (val: any) => {
          if (val == null) return null
          const v = String(val).trim().toUpperCase()
          return ['ABM', 'HUMSS', 'STEM'].includes(v) ? v : null
        }

        const normalizeFatherSuffix = (val: any) => {
          if (!val) return null
          const v = String(val).trim()
          const valid = ['Jr.', 'Sr.', 'II', 'III', 'IV']
          if (valid.includes(v)) return v
          const match = valid.find((s) => s.toLowerCase() === v.toLowerCase())
          if (match) return match
          return null
        }

        const normalizeEducationLevel = (val: any) => {
          if (val == null) return null
          const v = String(val).trim().toLowerCase()
          const map: Record<string, string> = {
            kindergarten: 'kindergarten',
            kinder: 'kindergarten',
            'k-12': 'k-12',
            k12: 'k-12',
            elementary: 'k-12',
            'junior high': 'k-12',
            jhs: 'k-12',
            shs: 'shs',
            'senior high': 'shs',
            college: 'college',
            'n/a': 'n/a'
          }
          return map[v] || null
        }

        const parseDate = (value: any) => {
          if (!value) return null
          const str = String(value).trim()

          // Excel serial number
          if (/^\d{5}$/.test(str)) {
            const excelEpoch = new Date(1899, 11, 30)
            const date = new Date(excelEpoch.getTime() + parseInt(str, 10) * 86400000)
            return date.toISOString().split('T')[0]
          }

          // DD/MM/YYYY
          const dmySlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
          if (dmySlash) {
            const [, d, m, y] = dmySlash
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
          }

          // DD-MM-YYYY
          const dmyDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
          if (dmyDash) {
            const [, d, m, y] = dmyDash
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
          }

          // YYYY-MM-DD (already correct)
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

          const parsed = new Date(str)
          if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0]
          }

          console.log(`Unparseable date_of_birth: ${str}`)
          return null
        }

        const parseStudentName = (row: any) => {
          const first_name = String(getCSVValue(row, 'First Name', 'first_name') || '').trim() || null
          const middle_name = String(getCSVValue(row, 'Middle Name', 'middle_name') || '').trim() || null
          const last_name = String(getCSVValue(row, 'Last Name', 'last_name') || '').trim() || null

          if ((first_name && last_name) || (first_name && middle_name) || (last_name && middle_name)) {
            return { first_name, middle_name, last_name }
          }

          const studentName = String(getCSVValue(row, 'Student Name', 'student_name') || '').trim()
          if (!studentName) {
            return { first_name: first_name || last_name || 'Unknown', middle_name, last_name: last_name || first_name || 'Unknown' }
          }

          const cleanName = studentName.replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, '')
          if (cleanName.includes(',')) {
            const parts = cleanName.split(',')
            const last = parts[0].trim()
            const remaining = parts[1]?.trim() || ''
            const names = remaining.split(/\s+/).filter(Boolean)
            return {
              first_name: names[0] || null,
              middle_name: names.length > 1 ? names.slice(1).join(' ') : null,
              last_name: last || null
            }
          }

          const parts = cleanName.split(/\s+/).filter(Boolean)
          if (parts.length === 1) {
            return { first_name: parts[0], middle_name: null, last_name: parts[0] }
          }
          if (parts.length === 2) {
            return { first_name: parts[0], middle_name: null, last_name: parts[1] }
          }

          return {
            first_name: parts[0] || null,
            middle_name: parts.slice(1, -1).join(' ') || null,
            last_name: parts[parts.length - 1] || null
          }
        }

        transformedData = []
        const patientIdPattern = /^\d{2}-\d{5}$/

        data.forEach((row, index) => {
          const normalized = normalizeRow(row)
          const rawPatientId = String(normalized.patient_id || '').trim()
          const patientId = normalizePatientId(rawPatientId)

          const rawContactNumber = String(getCSVValue(row, 'contact_number', 'contact number', 'contact', 'phone', 'mobile', 'cellphone') || '').trim()
          if (normalized.contact_number) {
            contactNumberSavedCount++
          } else {
            contactNumberNullCount++
            contactNumberReport.push(`row ${index + 2}: raw contact_number='${rawContactNumber}'`)
          }

          const rawGuardianContact = String(getCSVValue(row, 'guardian_contact', 'guardian contact', 'guardian_contact_number', 'guardian phone') || '').trim()
          if (normalized.guardian_contact) {
            guardianContactSavedCount++
          } else {
            guardianContactNullCount++
            guardianContactReport.push(`row ${index + 2}: raw guardian_contact='${rawGuardianContact}'`)
          }

          const rawEmergencyContact = String(getCSVValue(row, 'emergency_contact', 'emergency contact', 'emergency_contact_number', 'emergency phone', 'person_to_notify_contact') || '').trim()
          if (normalized.emergency_contact) {
            emergencyContactSavedCount++
          } else {
            emergencyContactNullCount++
            emergencyContactReport.push(`row ${index + 2}: raw emergency_contact='${rawEmergencyContact}'`)
          }

          if (!patientId || !patientIdPattern.test(patientId)) {
            skippedRows.push({ row: index + 2, reason: `Invalid Student ID / patient_id format: ${rawPatientId}` })
            return
          }

          const nameParts = parseStudentName(row)
          let first_name = normalized.first_name || nameParts.first_name
          let middle_name = normalized.middle_name || nameParts.middle_name
          let last_name = normalized.last_name || nameParts.last_name

          if (!first_name) first_name = last_name || 'Unknown'
          if (!last_name) last_name = first_name || 'Unknown'

          const calculatedDateOfBirth = normalized.date_of_birth
          if (String(getCSVValue(row, 'Date of Birth', 'date_of_birth') || '').trim() && calculatedDateOfBirth == null) {
            console.warn(`Unparseable date_of_birth for row ${index + 2}:`, getCSVValue(row, 'Date of Birth', 'date_of_birth'))
          }

          const calculateAge = (dob: string | null): number | null => {
            if (!dob) return null
            const birth = new Date(dob)
            const today = new Date()
            let age = today.getFullYear() - birth.getFullYear()
            const m = today.getMonth() - birth.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
            return age
          }

          const transformedRow = {
            patient_id: String(patientId),
            first_name,
            middle_name,
            last_name,
            suffix: normalized.suffix,
            sex: normalized.sex,
            age: normalized.age != null ? normalized.age : calculateAge(calculatedDateOfBirth),
            date_of_birth: calculatedDateOfBirth,
            contact_number: normalized.contact_number,
            patient_type: normalized.patient_type,
            education_level: normalized.education_level,
            grade_level: normalized.grade_level,
            section: normalized.section,
            program: normalized.program,
            year_level: normalized.year_level,
            shs_track: normalized.shs_track,
            address_field: normalized.address_field,
            barangay: normalized.barangay,
            city: normalized.city,
            province: normalized.province,
            zip_code: normalized.zip_code,
            guardian_name: normalized.guardian_name,
            guardian_contact: normalized.guardian_contact,
            guardian_email: normalized.guardian_email,
            person_to_notify: normalized.person_to_notify,
            emergency_contact: normalized.emergency_contact,
            voucher_type: normalized.voucher_type,
            enrollment_status: normalized.enrollment_status,
            mother_last_name: normalized.mother_last_name,
            mother_first_name: normalized.mother_first_name,
            mother_middle_name: normalized.mother_middle_name,
            father_last_name: normalized.father_last_name,
            father_first_name: normalized.father_first_name,
            father_middle_name: normalized.father_middle_name,
            father_suffix: normalized.father_suffix,
            allergies: normalized.allergies,
            diagnosed_diseases: normalized.diagnosed_diseases,
            adviser: normalized.adviser || String(getCSVValue(row, 'Adviser', 'adviser') || '').trim() || null
          }

          transformedData.push(transformedRow)
        })

        const imported = transformedData.length
        const skipped = skippedRows.length
        if (skipped > 0) {
          console.log('Skipped rows:', skippedRows)
          toast(`${imported} students imported, ${skipped} rows skipped`, {
            icon: '⚠️'
          })
        } else {
          toast.success(`${imported} students imported`)
        }
      }

      // Insert data into selected table
      if (selectedTable === 'patients') {
        let successCount = 0
        const failedRows: { row: any; error: string }[] = []

        for (const row of transformedData) {
          const { error } = await supabase
            .from('patients')
            .upsert(row, { onConflict: 'patient_id' })

          if (error) {
            failedRows.push({ row, error: error.message })
          } else {
            successCount++
          }
        }

        console.log(`Import complete: ${successCount} success, ${failedRows.length} failed`)
        console.log('Phone import summary:')
        console.log(`  contact_number saved: ${contactNumberSavedCount}, null: ${contactNumberNullCount}`)
        if (contactNumberReport.length > 0) console.log('    contact_number invalid rows:', contactNumberReport)
        console.log(`  guardian_contact saved: ${guardianContactSavedCount}, null: ${guardianContactNullCount}`)
        if (guardianContactReport.length > 0) console.log('    guardian_contact invalid rows:', guardianContactReport)
        console.log(`  emergency_contact saved: ${emergencyContactSavedCount}, null: ${emergencyContactNullCount}`)
        if (emergencyContactReport.length > 0) console.log('    emergency_contact invalid rows:', emergencyContactReport)
        if (failedRows.length > 0) {
          console.log('Failed rows:', failedRows)
          toast(`${successCount} rows imported successfully. ${failedRows.length} rows failed.`, {
            icon: '⚠️'
          })
        } else {
          toast.success(`${successCount} students imported`)
        }
      } else {
        const { error } = await supabase
          .from(selectedTable)
          .upsert(transformedData, { onConflict: undefined })
        if (error) {
          console.error(`Error importing to ${selectedTable}:`, error)
          toast.error(`Failed to import to ${selectedTable}: ${error.message}`)
        } else {
          toast.success(`Successfully imported ${transformedData.length} records to ${selectedTable}`)
        }
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Failed to import CSV')
    } finally {
      setImporting(false)
      // Reset the input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Backup & Restore</h1>
        <p className="text-slate-600 mt-2">Manage clinic data backups in multiple formats</p>
      </div>

      {/* Database Tables Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Database className="w-5 h-5 text-blue-600 mr-3" />
          <div>
            <p className="font-semibold text-blue-900">14 Database Tables (100% Coverage)</p>
            <p className="text-sm text-blue-700 mt-1">
              Each backup includes: Patients, Profiles, Medical Records, Consultations, Consultation Notes, Clinic Visits, Physical Examinations, Staff Schedules, Recurring Schedules, Inventory, Supply Requests, Supply Request Items, Dental Repository, Accident Reports
            </p>
          </div>
        </div>
      </div>

      {/* 3 Export Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Excel Backup */}
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-3 rounded-lg mr-3">
              <FileJson className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Excel Format</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Human-readable report format. Perfect for sharing and reviewing data in spreadsheet applications.
          </p>
          <button
            onClick={handleExcelBackup}
            disabled={exporting === 'excel'}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {exporting === 'excel' ? 'Generating...' : 'Backup as Excel'}
          </button>
        </div>

        {/* CSV Backup */}
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-lg mr-3">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">CSV Format</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Lightweight data export. Ideal for data analysis, import/export workflows, and integration with other systems.
          </p>
          <button
            onClick={handleCSVBackup}
            disabled={exporting === 'csv'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {exporting === 'csv' ? 'Generating...' : 'Backup as CSV'}
          </button>
        </div>

        {/* SQL Backup */}
        <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 p-3 rounded-lg mr-3">
              <Database className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">SQL Format</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Full database dump. Use for complete database restoration, migration, or creating exact backups for disaster recovery.
          </p>
          <button
            onClick={handleSQLBackup}
            disabled={exporting === 'sql'}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            {exporting === 'sql' ? 'Generating...' : 'Backup as SQL'}
          </button>
        </div>
      </div>

      {/* Stored Backups */}
      <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Stored Backups</h2>
        {backups.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No backups created yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Filename</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Format</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Records</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Tables</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr key={backup.id} className="border-b border-slate-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{backup.filename}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          backup.format === 'excel'
                            ? 'bg-green-100 text-green-700'
                            : backup.format === 'csv'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {backup.format.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {backup.totalRecords ? backup.totalRecords.toLocaleString() : '0'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {backup.totalTables ?? 0}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {backup.date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Import Data from CSV</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Table to Import</label>
          <select
            value={selectedTable === 'patients' ? patientUploadCategory : selectedTable}
            onChange={(e) => handleTableSelect(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="k-12">K to 12</option>
            <option value="college">College</option>
            <option value="personnel">Personnel</option>
            <option value="inventory">Inventory</option>
            <option value="profiles">Profiles</option>
            <option value="medical_records">Medical Records</option>
            <option value="consultations">Consultations</option>
            <option value="clinic_visits">Clinic Visits</option>
            <option value="staff_schedules">Staff Schedules</option>
            <option value="supply_requests">Supply Requests</option>
            <option value="dental_repository">Dental Repository</option>
            <option value="accident_report_repository">Accident Reports</option>
          </select>
        </div>
        <div className="flex flex-col gap-4 mb-4">
          <button
            onClick={handleDownloadTemplate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Excel Template
          </button>
        </div>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">Download an Excel template, fill it out, then upload a CSV file to import data to {selectedTable === 'patients' ? (patientUploadCategory === 'k-12' ? 'K to 12 Students' : patientUploadCategory === 'college' ? 'College Students' : 'Personnel') : selectedTable.replace('_', ' ')}</p>
          <label className="inline-block">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={importing}
              className="hidden"
            />
            <span className={`font-medium py-2 px-6 rounded-lg cursor-pointer inline-block transition ${importing ? 'bg-gray-400 text-gray-200' : 'bg-slate-600 hover:bg-slate-700 text-white'}`}>
              {importing ? 'Importing...' : 'Choose CSV File'}
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
