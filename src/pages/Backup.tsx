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

          const patientTypeIndex = headers.indexOf('Patient Type')
          if (patientTypeIndex !== -1) {
            sampleRow[patientTypeIndex] = patientUploadCategory === 'personnel' ? 'personnel' : 'student'
          }

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
        }
        XLSX.utils.sheet_add_aoa(ws, [sampleRow], { origin: 1 })
      }

      // Format quantity columns as text to preserve leading zeros
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col < headers.length; col++) {
          const header = headers[col]
          if ((selectedTable === 'inventory' && (header === 'quantity_on_hand' || header === 'reorder_level')) ||
              (selectedTable === 'supply_request_items' && header === 'quantity') ||
              (selectedTable === 'patients' && header === 'student_id')) {
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
      patients: ['Student ID', 'Grade Level', 'Section', 'Last Name', 'First Name', 'Middle Name', 'Address', 'Date of Birth', 'Contact Number', 'Mother\'s Name', 'Father\'s Name', 'Guardian\'s Name', 'Person to Notify', 'Emergency Contact', 'Voucher Type', 'Patient Type', 'Program', 'Year Level', 'SHS Track', 'Education Level'],
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

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
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

      if (selectedTable === 'patients') {
        transformedData = []
        data.forEach((row, index) => {
          const studentId = String(row['Student ID'] || '').trim()

          // Skip rows where Student ID is not numeric
          if (!studentId || !/^\d+$/.test(studentId)) {
            skippedRows.push({ row: index + 2, reason: 'Invalid or missing Student ID' })
            return
          }

          // Transform student name - use separate columns or fallback to parsing Student Name
          let first_name = String(row['First Name'] || '').trim() || null
          let middle_name = String(row['Middle Name'] || '').trim() || null
          let last_name = String(row['Last Name'] || '').trim() || null

          // Fallback to parsing Student Name if separate columns are not provided
          if ((!first_name && !last_name) || (first_name === '' && last_name === '')) {
            const studentName = String(row['Student Name'] || '').trim()
            if (studentName) {
              // Strip suffixes
              let cleanName = studentName.replace(/\s+(Jr\.?|Sr\.?|II|III)$/i, '')

              if (cleanName.includes(',')) {
                const parts = cleanName.split(',')
                last_name = parts[0].trim()
                const remaining = parts[1].trim()

                if (remaining) {
                  const nameParts = remaining.split(/\s+/)
                  first_name = nameParts[0]
                  if (nameParts.length > 1) {
                    middle_name = nameParts.slice(1).join(' ')
                  }
                }
              } else {
                last_name = cleanName
              }
            }
          }

          // Ensure first_name and last_name are not null
          if (!first_name) first_name = last_name || 'Unknown'
          if (!last_name) last_name = first_name || 'Unknown'

          // Detect education level and grade level
          const gradeLevelInput = String(row['Grade Level'] || '').trim()
          let grade_level = null
          let education_level = null
          let year_level = null
          let program = null
          let shs_track = null

          if (gradeLevelInput) {
            if (gradeLevelInput.match(/^(Kindergarten|Kinder|K)$/i)) {
              grade_level = 'K'
              education_level = 'kindergarten'
            } else if (/^\d+$/.test(gradeLevelInput)) {
              const level = parseInt(gradeLevelInput)
              if (level >= 1 && level <= 10) {
                grade_level = gradeLevelInput
                education_level = 'k-12'
              } else if (level === 11 || level === 12) {
                grade_level = gradeLevelInput
                education_level = 'shs'
                shs_track = String(row['SHS Track'] || '').trim() || null
              }
            } else if (gradeLevelInput.match(/^(1st|2nd|3rd|4th)$/i)) {
              year_level = gradeLevelInput
              program = String(row['Section'] || '').trim()
              education_level = 'college'
            }
          }

          // Transform date of birth
          let date_of_birth = null
          const dobInput = String(row['Date of Birth'] || '').trim()
          if (dobInput) {
            try {
              const date = new Date(dobInput)
              if (!isNaN(date.getTime())) {
                date_of_birth = date.toISOString().split('T')[0]
              }
            } catch (e) {
              // Invalid date, leave as null
            }
          }

          // Clean contact numbers
          const cleanContactNumber = (input: string) => {
            if (!input) return null
            const cleaned = input.replace(/\D/g, '')
            return cleaned.length === 11 ? cleaned : null
          }

          const patientTypeValue = String(row['Patient Type'] || '').trim() || null
          const defaultPatientType = patientUploadCategory === 'personnel' ? 'personnel' : 'student'

          const sexInput = String(row['Sex'] || '').trim().toUpperCase()
          const sex = sexInput === 'M' || sexInput === 'MALE' ? 'M'
            : sexInput === 'F' || sexInput === 'FEMALE' ? 'F'
            : null

          const transformedRow = {
            patient_id: studentId.padStart(7, '0'),
            grade_level,
            section: education_level !== 'college' ? String(row['Section'] || '').trim() : null,
            first_name,
            middle_name,
            last_name,
            address_field: String(row['Address'] || '').trim() || null,
            date_of_birth,
            contact_number: cleanContactNumber(String(row['Contact Number'] || '')),
            mother_name: String(row['Mother\'s Name'] || '').trim() || null,
            father_name: String(row['Father\'s Name'] || '').trim() || null,
            guardian_name: String(row['Guardian\'s Name'] || '').trim() || null,
            person_to_notify: String(row['Person to Notify'] || '').trim() || null,
            emergency_contact: cleanContactNumber(String(row['Emergency Contact'] || '')),
            voucher_type: String(row['Voucher Type'] || '').trim() || null,
            // Defaults
            patient_type: patientTypeValue || defaultPatientType,
            enrollment_status: 'active',
            barangay: null,
            city: null,
            province: null,
            zip_code: null,
            sex,
            // SHS fields
            shs_track: education_level === 'shs' ? shs_track : null,
            // College fields
            year_level,
            program: education_level === 'college' ? program : null,
            education_level
          }

          transformedData.push(transformedRow)
        })

        // Show import summary
        const imported = transformedData.length
        const skipped = skippedRows.length
        if (skipped > 0) {
          console.log('Skipped rows:', skippedRows)
          toast.success(`${imported} students imported, ${skipped} rows skipped`)
        } else {
          toast.success(`${imported} students imported`)
        }
      }

      // Insert data into selected table
      const { error } = await supabase
        .from(selectedTable)
        .upsert(transformedData, { onConflict: selectedTable === 'patients' ? 'patient_id' : undefined })
      if (error) {
        console.error(`Error importing to ${selectedTable}:`, error)
        toast.error(`Failed to import to ${selectedTable}: ${error.message}`)
      } else if (selectedTable !== 'patients') {
        toast.success(`Successfully imported ${transformedData.length} records to ${selectedTable}`)
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
