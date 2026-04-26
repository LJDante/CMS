import type { Consultation } from '../types'

/**
 * Export consultations to CSV format
 * Includes all vital signs and medical information for Daily Consultation Report
 */
export function exportConsultationsToCSV(consultations: Consultation[], filename: string = 'consultation_report.csv') {
  // Define CSV headers
  const headers = [
    'Consultation ID',
    'Patient ID',
    'Patient Name',
    'Patient Type',
    'Date & Time',
    'Follow-up Date',
    'Reason for Consultation',
    'Intervention',
    'Actions Taken',
    'Diagnosis',
    'Doctor\'s Remarks',
    'Attending Staff',
    'Doctor Name',
    'Blood Pressure',
    'Heart Rate (bpm)',
    'Oxygen Saturation (%)',
    'Temperature (°C)',
    'Height (cm)',
    'Weight (kg)',
    'LMP',
    'Medicines Given',
    'Course/Grade',
    'Year Level',
    'SHS Track',
    'Created By',
    'Created At'
  ]

  // Convert data to CSV rows
  const rows = consultations.map(c => [
    c.id || '',
    c.patient_external_id || c.patient_id || '',
    c.patient_name || '',
    c.patient_type || '',
    c.consultation_date ? new Date(c.consultation_date).toLocaleString() : '',
    c.follow_up_date ? new Date(c.follow_up_date).toLocaleDateString() : '',
    c.reason || '',
    c.intervention || '',
    c.actions_taken || '',
    c.diagnosis_result || '',
    c.doctors_remarks || '',
    c.attending_staff_name || '',
    c.doctor_name || '',
    c.blood_pressure || '',
    c.heart_rate ? String(c.heart_rate) : '',
    c.oxygen_saturation ? String(c.oxygen_saturation) : '',
    c.temperature ? String(c.temperature) : '',
    c.height_cm ? String(c.height_cm) : '',
    c.weight_kg ? String(c.weight_kg) : '',
    c.lmp ? new Date(c.lmp).toLocaleDateString() : '',
    c.medicines || '',
    c.course || c.grade_level || '',
    c.year_level || '',
    c.shs_track || '',
    c.created_by || '',
    c.created_at ? new Date(c.created_at).toLocaleString() : ''
  ])

  // Combine headers and rows
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export consultations to Excel format (JSON format for compatibility)
 * Can be used with libraries like xlsx for true Excel output
 */
export function exportConsultationsToExcel(consultations: Consultation[], filename: string = 'consultation_report.xlsx') {
  // For now, we'll export as CSV since Excel support requires additional libraries
  // In a production app, you'd use a library like xlsx or exceljs
  exportConsultationsToCSV(consultations, filename.replace('.xlsx', '.csv'))
  
  console.warn('Excel export uses CSV format. For true Excel files, install xlsx library and use it instead.')
}

/**
 * Generate a formatted Daily Consultation Report
 */
export function generateDailyConsultationReport(
  consultations: Consultation[],
  reportDate: Date = new Date()
): string {
  const dateStr = reportDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  let report = `DAILY CONSULTATION REPORT\n`
  report += `Date: ${dateStr}\n`
  report += `${'='.repeat(100)}\n\n`

  consultations.forEach((consultation, index) => {
    report += `Consultation ${index + 1}\n`
    report += `${'-'.repeat(100)}\n`
    report += `Patient: ${consultation.patient_name} (ID: ${consultation.patient_external_id || consultation.patient_id})\n`
    report += `Type: ${consultation.patient_type}\n`
    report += `Date: ${new Date(consultation.consultation_date).toLocaleString()}\n\n`

    if (consultation.reason) {
      report += `Reason: ${consultation.reason}\n`
    }

    // Vital Signs Section
    report += `\nVital Signs:\n`
    if (consultation.blood_pressure) report += `  Blood Pressure: ${consultation.blood_pressure}\n`
    if (consultation.heart_rate) report += `  Heart Rate: ${consultation.heart_rate} bpm\n`
    if (consultation.oxygen_saturation) report += `  O2 Saturation: ${consultation.oxygen_saturation}%\n`
    if (consultation.height_cm) report += `  Height: ${consultation.height_cm} cm\n`
    if (consultation.weight_kg) report += `  Weight: ${consultation.weight_kg} kg\n`
    if (consultation.lmp) report += `  LMP: ${new Date(consultation.lmp).toLocaleDateString()}\n`

    if (consultation.intervention) {
      report += `\nIntervention:\n${consultation.intervention}\n`
    }

    if (consultation.medicines) {
      report += `\nMedicines Given:\n${consultation.medicines}\n`
    }

    if (consultation.actions_taken) {
      report += `\nActions Taken:\n${consultation.actions_taken}\n`
    }

    if (consultation.diagnosis_result) {
      report += `\nDiagnosis: ${consultation.diagnosis_result}\n`
    }

    if (consultation.doctors_remarks) {
      report += `\nDoctor's Remarks:\n${consultation.doctors_remarks}\n`
    }

    if (consultation.follow_up_date) {
      report += `\nFollow-up Date: ${new Date(consultation.follow_up_date).toLocaleDateString()}\n`
    }

    report += `\nAttended by: ${consultation.attending_staff_name || 'N/A'}\n`
    report += `Doctor: ${consultation.doctor_name || 'N/A'}\n`
    report += `${'='.repeat(100)}\n\n`
  })

  return report
}
