import { supabase } from './supabaseClient'
import * as XLSX from 'xlsx'

export async function backupAllData() {
  try {
    // Define all tables to backup
    const tables = [
      'profiles',
      'patients',
      'clinic_visits',
      'medical_records',
      'physical_examinations',
      'consultations',
      'consultation_notes',
      'staff_schedules',
      'accident_reports',
      'witnesses',
      'notifications',
      'inventory',
      'supply_requests',
      'supply_request_items'
    ]

    // Fetch data from all tables
    const results = await Promise.allSettled(
      tables.map(table => supabase.from(table).select('*'))
    )

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Process results and add sheets
    let totalRecords = 0
    let successfulTables = 0

    results.forEach((result, index) => {
      const tableName = tables[index]
      if (result.status === 'fulfilled' && !result.value.error && result.value.data) {
        const sheetName = tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        const ws = XLSX.utils.json_to_sheet(result.value.data)
        XLSX.utils.book_append_sheet(wb, ws, sheetName.length > 31 ? sheetName.substring(0, 31) : sheetName)
        successfulTables++
        totalRecords += result.value.data.length
      } else {
        console.warn(`Failed to backup ${tableName}:`, result.status === 'rejected' ? result.reason : result.value?.error)
        // Add empty sheet to indicate table exists but failed to backup
        const ws = XLSX.utils.json_to_sheet([])
        XLSX.utils.book_append_sheet(wb, ws, tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
      }
    })

    // Generate Excel file as binary string
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(excelBuffer)))

    // Create backup metadata
    const backupMetadata = {
      id: `backup_${Date.now()}`,
      backup_date: new Date().toISOString(),
      version: '1.0',
      tables_attempted: tables.length,
      tables_successful: successfulTables,
      total_records: totalRecords,
      format: 'excel',
      data: base64Data
    }

    // Save to localStorage
    const existingBackups = JSON.parse(localStorage.getItem('cmis_backups') || '[]')
    existingBackups.push(backupMetadata)

    // Keep only the last 10 backups to prevent localStorage from getting too large
    if (existingBackups.length > 10) {
      existingBackups.shift()
    }

    localStorage.setItem('cmis_backups', JSON.stringify(existingBackups))

    return {
      success: true,
      backupId: backupMetadata.id,
      recordCount: totalRecords,
      tableCount: successfulTables,
      backupDate: backupMetadata.backup_date
    }
  } catch (error) {
    console.error('Backup failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function getStoredBackups() {
  try {
    return JSON.parse(localStorage.getItem('cmis_backups') || '[]')
  } catch (error) {
    console.error('Failed to retrieve backups:', error)
    return []
  }
}

export function downloadBackup(backupId: string) {
  try {
    const backups = getStoredBackups()
    const backup = backups.find((b: any) => b.id === backupId)

    if (!backup || !backup.data) {
      throw new Error('Backup not found')
    }

    // Convert base64 back to binary
    const binaryString = atob(backup.data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create blob and download
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)

    const filename = `CMIS_Backup_${new Date(backup.backup_date).toISOString().split('T')[0]}.xlsx`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { success: true, filename }
  } catch (error) {
    console.error('Download failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function deleteBackup(backupId: string) {
  try {
    const backups = getStoredBackups()
    const filteredBackups = backups.filter((b: any) => b.id !== backupId)
    localStorage.setItem('cmis_backups', JSON.stringify(filteredBackups))
    return { success: true }
  } catch (error) {
    console.error('Delete failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}