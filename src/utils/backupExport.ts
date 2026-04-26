import { supabase } from '../lib/supabaseClient'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'

/**
 * Export all clinic data as CSV format
 */
export async function exportAsCSV(filename: string = 'clinic_backup.csv') {
  const loadingToastId = toast.loading('Generating CSV backup...')
  try {

    // Fetch all tables (14 tables - complete coverage)
    const tables = [
      'patients',
      'profiles',
      'medical_records',
      'consultations',
      'consultation_notes',
      'clinic_visits',
      'physical_examinations',
      'staff_schedules',
      'recurring_schedules',
      'inventory',
      'supply_requests',
      'supply_request_items',
      'dental_repository',
      'accident_report_repository'
    ]

    let csvContent = '# Clinic Management System Backup\n'
    csvContent += `# Generated: ${new Date().toISOString()}\n\n`

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) {
        console.error(`Error fetching ${table}:`, error)
        continue
      }

      // Add table header
      csvContent += `\n## Table: ${table}\n`

      if (!data || data.length === 0) {
        csvContent += '# (No data)\n'
        continue
      }

      // Get headers from first row
      const headers = Object.keys(data[0])
      csvContent += headers.map(h => `"${h}"`).join(',') + '\n'

      // Add data rows
      for (const row of data) {
        csvContent += headers
          .map(h => {
            const value = row[h]
            if (value === null || value === undefined) return '""'
            const strValue = String(value).replace(/"/g, '""')
            return `"${strValue}"`
          })
          .join(',') + '\n'
      }
    }

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadFile(blob, filename, 'text/csv')

    toast.dismiss(loadingToastId)
    toast.success('CSV backup downloaded successfully!')
  } catch (error) {
    console.error('CSV export error:', error)
    toast.dismiss(loadingToastId)
    toast.error('Failed to export CSV backup')
  }
}

/**
 * Export all clinic data as SQL format (PostgreSQL dump)
 */
export async function exportAsSQL(filename: string = 'clinic_backup.sql') {
  const loadingToastId = toast.loading('Generating SQL backup...')
  try {

    const tables = [
      'patients',
      'profiles',
      'medical_records',
      'consultations',
      'consultation_notes',
      'clinic_visits',
      'physical_examinations',
      'staff_schedules',
      'recurring_schedules',
      'inventory',
      'supply_requests',
      'supply_request_items',
      'dental_repository',
      'accident_report_repository'
    ]

    let sqlContent = '-- Clinic Management System Backup\n'
    sqlContent += `-- Generated: ${new Date().toISOString()}\n`
    sqlContent += '-- This SQL dump can be used to restore the database\n\n'
    sqlContent += 'SET discard_data = OFF;\n'
    sqlContent += 'SET session_replication_role = replica;\n\n'

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) {
        console.error(`Error fetching ${table}:`, error)
        continue
      }

      sqlContent += `\n-- Data for table: ${table}\n`
      
      if (!data || data.length === 0) {
        sqlContent += `-- (No data in ${table})\n`
        continue
      }

      sqlContent += `DELETE FROM public.${table};\n\n`

      // Get headers from first row
      const headers = Object.keys(data[0])

      for (const row of data) {
        const values = headers.map(h => {
          const value = row[h]
          if (value === null || value === undefined) return 'NULL'
          if (typeof value === 'number') return String(value)
          if (typeof value === 'boolean') return value ? 'true' : 'false'
          if (Array.isArray(value)) return `'${JSON.stringify(value)}'`
          const strValue = String(value).replace(/'/g, "''")
          return `'${strValue}'`
        })

        sqlContent += `INSERT INTO public.${table} (${headers.join(', ')}) VALUES (${values.join(', ')});\n`
      }
    }

    sqlContent += '\n-- End of backup\n'

    // Trigger download
    const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8;' })
    downloadFile(blob, filename, 'text/sql')

    toast.dismiss(loadingToastId)
    toast.success('SQL backup downloaded successfully!')
  } catch (error) {
    console.error('SQL export error:', error)
    toast.dismiss(loadingToastId)
    toast.error('Failed to export SQL backup')
  }
}

/**
 * Export as proper Excel format (.xlsx)
 */
export async function exportAsExcel(filename: string = 'clinic_backup.xlsx') {
  const loadingToastId = toast.loading('Generating Excel backup...')
  try {

    const tables = [
      'patients',
      'profiles',
      'medical_records',
      'consultations',
      'consultation_notes',
      'clinic_visits',
      'physical_examinations',
      'staff_schedules',
      'recurring_schedules',
      'inventory',
      'supply_requests',
      'supply_request_items',
      'dental_repository',
      'accident_report_repository'
    ]

    // Create a new workbook
    const workbook = XLSX.utils.book_new()
    let sheetCount = 0

    // Add each table as a sheet
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) {
        console.error(`Error fetching ${table}:`, error)
        continue
      }

      if (!data || data.length === 0) {
        // Still create sheet for empty tables
        const worksheet = XLSX.utils.json_to_sheet([])
        XLSX.utils.book_append_sheet(workbook, worksheet, table.substring(0, 31))
        continue
      }

      // Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(data)
      
      // Set column widths for better readability
      const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.min(20, Math.max(key.length, 10))
      }))
      worksheet['!cols'] = colWidths

      // Format quantity-related columns as text to preserve leading zeros
      if (table === 'inventory') {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        for (let row = 1; row <= range.e.r; row++) {
          // Find quantity_on_hand and reorder_level columns
          const headers = Object.keys(data[0])
          const qtyIndex = headers.indexOf('quantity_on_hand')
          const reorderIndex = headers.indexOf('reorder_level')

          if (qtyIndex !== -1) {
            const qtyCell = worksheet[XLSX.utils.encode_cell({ r: row, c: qtyIndex })]
            if (qtyCell && qtyCell.v !== undefined) {
              qtyCell.t = 's' // Force as string/text
              qtyCell.v = String(qtyCell.v)
            }
          }

          if (reorderIndex !== -1) {
            const reorderCell = worksheet[XLSX.utils.encode_cell({ r: row, c: reorderIndex })]
            if (reorderCell && reorderCell.v !== undefined && reorderCell.v !== null && reorderCell.v !== '') {
              reorderCell.t = 's' // Force as string/text
              reorderCell.v = String(reorderCell.v)
            }
          }
        }
      } else if (table === 'supply_request_items') {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        for (let row = 1; row <= range.e.r; row++) {
          // Find quantity column
          const headers = Object.keys(data[0])
          const qtyIndex = headers.indexOf('quantity')

          if (qtyIndex !== -1) {
            const qtyCell = worksheet[XLSX.utils.encode_cell({ r: row, c: qtyIndex })]
            if (qtyCell && qtyCell.v !== undefined) {
              qtyCell.t = 's' // Force as string/text
              qtyCell.v = String(qtyCell.v)
            }
          }
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, table.substring(0, 31))
      sheetCount++
    }

    // Write the workbook to file
    XLSX.writeFile(workbook, filename)

    toast.dismiss(loadingToastId)
    toast.success(`Excel backup downloaded successfully! (${sheetCount} tables)`)
  } catch (error) {
    console.error('Excel export error:', error)
    toast.dismiss(loadingToastId)
    toast.error('Failed to export Excel backup')
  }
}

/**
 * Helper function to trigger file download
 */
function downloadFile(blob: Blob, filename: string, mimeType: string) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get formatted backup filename based on format
 */
export function getBackupFilename(format: 'excel' | 'csv' | 'sql'): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const time = new Date().toLocaleTimeString('en-US', { hour12: false }).replace(/:/g, '-')

  switch (format) {
    case 'excel':
      return `clinic_backup_${timestamp}_${time}.xlsx`
    case 'csv':
      return `clinic_backup_${timestamp}_${time}.csv`
    case 'sql':
      return `clinic_backup_${timestamp}_${time}.sql`
  }
}

/**
 * Get backup display name with format
 */
export function getBackupDisplayName(format: 'excel' | 'csv' | 'sql', date?: Date): string {
  const d = date || new Date()
  const dateStr = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const formatLabel = {
    excel: 'Excel',
    csv: 'CSV',
    sql: 'SQL'
  }[format]

  return `Backup from ${dateStr} — ${formatLabel}`
}

/**
 * Get backup statistics (record count and table count)
 */
export async function getBackupStats(): Promise<{
  totalRecords: number
  totalTables: number
  tableDetails: { name: string; recordCount: number }[]
}> {
  const tables = [
    'patients',
    'profiles',
    'medical_records',
    'consultations',
    'consultation_notes',
    'clinic_visits',
    'physical_examinations',
    'staff_schedules',
    'recurring_schedules',
    'inventory',
    'supply_requests',
    'supply_request_items',
    'dental_repository',
    'accident_report_repository'
  ]

  let totalRecords = 0
  let totalTables = 0
  const tableDetails: { name: string; recordCount: number }[] = []

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*', { count: 'exact' })

    if (error || !data) {
      console.error(`Error fetching ${table}:`, error)
      continue
    }

    const recordCount = data.length
    totalTables += 1 // Count all tables, including empty ones
    totalRecords += recordCount
    if (recordCount > 0) {
      tableDetails.push({ name: table, recordCount })
    }
  }

  return { totalRecords, totalTables, tableDetails }
}
