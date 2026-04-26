import { supabase } from './supabaseClient'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface CSVImportResult {
  success: boolean
  totalRows: number
  successfulInserts: number
  failedInserts: number
  errors: string[]
  tableResults: Record<string, { success: number; failed: number; errors: string[] }>
}

export async function importCSVToDatabase(csvContent: string, tableName: string): Promise<CSVImportResult> {
  const rows = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true
  }).data as any[]

  if (rows.length === 0) {
    return {
      success: false,
      totalRows: 0,
      successfulInserts: 0,
      failedInserts: 0,
      errors: ['No data found in CSV file'],
      tableResults: {}
    }
  }

  return importRowsToDatabase(rows, tableName)
}

export async function importSpreadsheetToDatabase(file: File, tableName: string): Promise<CSVImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext) {
    return {
      success: false,
      totalRows: 0,
      successfulInserts: 0,
      failedInserts: 0,
      errors: ['Could not determine file extension'],
      tableResults: {}
    }
  }

  try {
    if (ext === 'csv') {
      const text = await file.text()
      return importCSVToDatabase(text, tableName)
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: false }) as any[]

      if (rows.length === 0) {
        return {
          success: false,
          totalRows: 0,
          successfulInserts: 0,
          failedInserts: 0,
          errors: ['No data found in spreadsheet file'],
          tableResults: {}
        }
      }

      return importRowsToDatabase(rows, tableName)
    }

    return {
      success: false,
      totalRows: 0,
      successfulInserts: 0,
      failedInserts: 0,
      errors: [`Unsupported file type: ${ext}`],
      tableResults: {}
    }
  } catch (error) {
    return {
      success: false,
      totalRows: 0,
      successfulInserts: 0,
      failedInserts: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      tableResults: {}
    }
  }
}

async function importRowsToDatabase(rawRows: any[], tableName: string): Promise<CSVImportResult> {
  const rows = rawRows.map(normalizeRow)
  const processedData = processDataForTable(rows, tableName)

  let dataToImport: Record<string, any[]> = {}

  if (Array.isArray(processedData)) {
    dataToImport[tableName] = processedData
  } else {
    dataToImport = processedData
  }

  const result: CSVImportResult = {
    success: false,
    totalRows: rows.length,
    successfulInserts: 0,
    failedInserts: 0,
    errors: [],
    tableResults: {}
  }

  // Import data for each table
  for (const [table, data] of Object.entries(dataToImport)) {
    if (!data || data.length === 0) continue

    result.tableResults[table] = { success: 0, failed: 0, errors: [] }

    const batchSize = 50
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)
      try {
        const { data: insertedData, error } = await supabase.from(table).insert(batch).select()
        if (error) {
          result.failedInserts += batch.length
          result.tableResults[table].failed += batch.length
          result.tableResults[table].errors.push(`Batch insert error: ${error.message}`)
          result.errors.push(`${table}: ${error.message}`)
        } else {
          const insertedCount = insertedData?.length ?? batch.length
          result.successfulInserts += insertedCount
          result.tableResults[table].success += insertedCount
        }
      } catch (error) {
        result.failedInserts += batch.length
        result.tableResults[table].failed += batch.length
        const errorMsg = `Batch insert exception: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.tableResults[table].errors.push(errorMsg)
        result.errors.push(`${table}: ${errorMsg}`)
      }
    }
  }

  result.success = result.successfulInserts > 0
  return result
}

function normalizeRow(raw: any) {
  const normalized: Record<string, any> = {}

  Object.keys(raw || {}).forEach((key) => {
    const normalizedKey = key
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')

    let value = raw[key]
    if (typeof value === 'string') {
      value = value.trim()
    }

    normalized[normalizedKey] = value
  })

  return normalized
}

function processDataForTable(data: any[], tableName: string): any[] | Record<string, any[]> {
  switch (tableName) {
    case 'patients':
      return processPatientData(data)
    case 'clinic_visits':
      return processClinicVisitData(data)
    case 'medical_records':
      return processMedicalRecordData(data)
    case 'inventory':
      return processInventoryData(data)
    default:
      return data.map((row) => processGenericData(row))
  }
}

function getValue(row: any, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  return null
}

function generatePatientId() {
  return `P${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
}

function processPatientData(data: any[]): any[] | Record<string, any[]> {
  const patients: any[] = []
  const clinicVisits: any[] = []
  const medicalRecords: any[] = []

  data.forEach((row) => {
    const firstName = getValue(row, ['first_name', 'firstname', 'given_name'])
    const lastName = getValue(row, ['last_name', 'lastname', 'family_name'])
    const patientId = getValue(row, ['patient_id', 'student_id', 'id']) || generatePatientId()

    // Process patient data
    const patient = {
      patient_id: patientId,
      patient_type: getValue(row, ['patient_type', 'patienttype']) || 'student',
      first_name: firstName,
      middle_name: getValue(row, ['middle_name', 'middlename', 'middle']) || null,
      last_name: lastName,
      age: row.age ? Number(row.age) : null,
      grade_level: getValue(row, ['grade_level', 'grade']) || null,
      section: row.section || null,
      education_level: getValue(row, ['education_level', 'educationlevel']) || null,
      program: row.program || null,
      year_level: row.year_level || null,
      date_of_birth: getValue(row, ['date_of_birth', 'dob', 'birthdate']) || null,
      sex: getValue(row, ['sex', 'gender']) || null,
      contact_number: getValue(row, ['contact_number', 'phone', 'mobile']) || null,
      guardian_name: getValue(row, ['guardian_name', 'guardian']) || null,
      guardian_contact: getValue(row, ['guardian_contact']) || null,
      guardian_email: getValue(row, ['guardian_email']) || null,
      address_field: row.address_field || row.address || [row.house_unit, row.street, row.subdivision].filter(Boolean).join(' ').trim() || null,
      barangay: row.barangay || null,
      city: row.city || null,
      zip_code: row.zip_code || null,
      province: row.province || null,
      enrollment_status: row.enrollment_status || 'active'
    }

    if (firstName && lastName && patientId) {
      patients.push(patient)
    }

    // Process medical records if allergies or diagnosed_diseases are present
    if (row.allergies || row.diagnosed_diseases) {
      medicalRecords.push({
        patient_id: patientId,
        diagnosed_diseases: row.diagnosed_diseases || null,
        allergies: row.allergies || null,
        immunization_history: row.immunization_history || null
      })
    }

    // Process clinic visit if visit_date is present
    if (row.visit_date) {
      const visit = {
        patient_id: patientId,
        visit_date: getValue(row, ['visit_date', 'date']),
        complaint: getValue(row, ['complaint', 'reason']),
        assessment: row.assessment || null,
        treatment: row.treatment || null,
        disposition: getValue(row, ['disposition']) || 'other',
        referred_to: row.referred_to || null,
        notes: row.notes || null,
        entrance_time: row.entrance_time || null,
        exit_time: row.exit_time || null,
        entry_type: row.entry_type || null,
        temperature: row.temperature ? Number(row.temperature) : null,
        commuter_status: getValue(row, ['commuter_status', 'commuter']) || null,
        place_name: row.place_name || null
      }

      if (visit.patient_id && visit.visit_date && visit.complaint) {
        clinicVisits.push(visit)
      }
    }
  })

  // If we have data for multiple tables, return an object
  if (clinicVisits.length > 0 || medicalRecords.length > 0) {
    return {
      patients,
      clinic_visits: clinicVisits,
      medical_records: medicalRecords
    }
  }

  // Otherwise, return just patients data
  return patients
}

function processClinicVisitData(data: any[]): any[] {
  return data
    .map((row) => ({
      patient_id: getValue(row, ['patient_id', 'student_id', 'id']),
      visit_date: getValue(row, ['visit_date', 'date']),
      complaint: getValue(row, ['complaint', 'reason']),
      assessment: row.assessment || null,
      treatment: row.treatment || null,
      disposition: getValue(row, ['disposition']) || 'other',
      referred_to: row.referred_to || null,
      notes: row.notes || null,
      entrance_time: row.entrance_time || null,
      exit_time: row.exit_time || null,
      entry_type: row.entry_type || null,
      temperature: row.temperature ? Number(row.temperature) : null,
      commuter_status: getValue(row, ['commuter_status', 'commuter']) || null,
      place_name: row.place_name || null
    }))
    .filter((row) => row.patient_id && row.visit_date && row.complaint)
}

function processMedicalRecordData(data: any[]): any[] {
  return data
    .map((row) => ({
      patient_id: getValue(row, ['patient_id', 'student_id', 'id']),
      diagnosed_diseases: row.diagnosed_diseases || row.diagnosed || null,
      allergies: row.allergies || null,
      immunization_history: row.immunization_history || row.immunizations || null
    }))
    .filter((row) => row.patient_id)
}

function processInventoryData(data: any[]): any[] {
  return data
    .map((row) => {
      const name = getValue(row, ['name', 'item_name', 'item', 'product'])
      const category = getValue(row, ['category', 'type', 'item_category'])
      const unit = getValue(row, ['unit', 'measure', 'uom']) || 'pcs'
      const quantity_on_hand = Number(getValue(row, ['quantity_on_hand', 'quantity', 'qty', 'stock']) || 0)
      const reorder_level = Number(getValue(row, ['reorder_level', 'reorder', 'min_stock']) || 0)
      const expiration_date = getValue(row, ['expiration_date', 'expiry', 'exp_date', 'exp']) || null

      return {
        name,
        category,
        unit,
        quantity_on_hand,
        reorder_level,
        expiration_date
      }
    })
    .filter((row) => row.name && row.category && row.unit)
}


function processGenericData(value: any): any {
  return value
}

export function generateCSVTemplate(tableName: SupportedTable): string {
  const templates = {
    patients: `patient_id,patient_type,first_name,middle_name,last_name,age,grade_level,section,education_level,program,year_level,date_of_birth,sex,contact_number,guardian_name,guardian_contact,guardian_email,allergies,diagnosed_diseases,immunization_history,address_field,barangay,city,zip_code,province,enrollment_status,visit_date,complaint,assessment,treatment,disposition,referred_to,notes,entrance_time,exit_time,entry_type,temperature,commuter_status,place_name
2024001,student,John,Doe,Smith,16,Grade 10,A,k-12,Regular,,2008-05-15,M,09123456789,Jane Smith,09123456788,jane@email.com,None,None,Complete - MMR, DPT, Polio,Blk 4 Lot 12 Purok 3 Greenville Subd.,San Jose,City,1234,Cebu,active,2024-01-15,Headache,Migraine,Rest and hydration,sent_home,,Patient complained of severe headache,08:30:00,09:15:00,entrance,36.5,commuter,Classroom
2024002,student,Maria,,Garcia,15,Grade 9,B,k-12,Regular,,2009-03-22,F,09123456790,Jose Garcia,09123456791,jose@email.com,Shellfish,None,Complete - MMR, DPT, Polio,456 Pine St Brgy. San Isidro,San Jose,City,1234,Cebu,active,,,,,,,`,

    clinic_visits: `patient_id,visit_date,complaint,assessment,treatment,disposition,referred_to,notes,entrance_time,exit_time,entry_type,temperature,commuter_status,place_name
P1680000000000,2024-01-15,Headache,Migraine,Rest and hydration,sent_home,,Patient complained of severe headache,08:30:00,09:15:00,entrance,36.5,commuter,Classroom
P1680000000001,2024-01-16,Stomach pain,Gastritis,Antacids,returned_to_class,,Mild abdominal discomfort,09:00:00,09:30:00,entrance,37.0,non-commuter,Clinic`,

    medical_records: `patient_id,diagnosed_diseases,allergies,immunization_history
P1680000000000,Asthma,Penicillin,Complete - MMR, DPT, Polio
P1680000000001,None,Shellfish,Complete - MMR, DPT, Polio, Hepatitis`,

    inventory: `name,category,unit,quantity_on_hand,reorder_level,expiration_date
Paracetamol,medicine,tablets,150,50,2025-12-31
Bandages,supply,rolls,25,10,
Alcohol,supply,bottles,30,15,2024-06-30
Stethoscope,equipment,pieces,5,2,`
  }

  return templates[tableName]
}

export const SUPPORTED_TABLES = [
  'patients',
  'clinic_visits',
  'medical_records',
  'inventory'
] as const

export type SupportedTable = typeof SUPPORTED_TABLES[number]

export function downloadCSVTemplate(tableName: SupportedTable) {
  const csvContent = generateCSVTemplate(tableName)
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)

  const filename = `${tableName}_template.csv`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}