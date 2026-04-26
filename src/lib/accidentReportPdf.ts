import { jsPDF } from 'jspdf'
import type { StudentAccidentReport, Student } from '../types'

// Use inches as units throughout the layout
function drawUnderline(doc: jsPDF, x: number, y: number, length: number) {
  doc.setLineWidth(0.002) // thin line (inches)
  doc.line(x, y, x + length, y)
}

function drawCheckbox(doc: jsPDF, x: number, y: number) {
  // draws a 0.1in square with its top-left at (x,y-0.08) per prompt
  doc.setLineWidth(0.003)
  doc.rect(x, y - 0.08, 0.1, 0.1)
}

function formatTime(militaryTime?: string) {
  if (!militaryTime) return { time: '', period: '' }
  const [hoursStr = '0', minutes = '00'] = militaryTime.split(':')
  const hour = parseInt(hoursStr, 10) || 0
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return { time: `${displayHour}:${minutes}`, period }
}

function addText(doc: jsPDF, x: number, y: number, text: string, size = 10, opts?: { align?: 'left' | 'center' | 'right'; style?: 'normal' | 'bold' }) {
  doc.setFont('helvetica', opts?.style === 'bold' ? 'bold' : 'normal')
  doc.setFontSize(size)
  if (opts?.align === 'center') doc.text(text, x, y, { align: 'center' })
  else if (opts?.align === 'right') doc.text(text, x, y, { align: 'right' })
  else doc.text(text, x, y)
}

export function generateAccidentReportPdf(student: Student, report: StudentAccidentReport, reporterName?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'legal' })

  // HEADER
  addText(doc, 4.25, 0.5, 'Biñan Campus', 12, { align: 'center' })
  addText(doc, 4.25, 0.7, 'School Year 20___-to-20__', 10, { align: 'center' })
  addText(doc, 4.25, 1.0, 'STUDENT ACCIDENT REPORT FORM', 16, { align: 'center', style: 'bold' })
  addText(doc, 4.25, 1.2, 'Health Services Unit', 10, { align: 'center' })

  // SECTION 1 - BASIC INFO
  // 1. Name, Age, Sex
  const line1BaseY = 1.6
  addText(doc, 0.5, line1BaseY, '1. Name :', 10)
  const nameUnderlineY = line1BaseY + 0.02
  drawUnderline(doc, 1.0, nameUnderlineY, 3.5)
  const nameStr = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
  if (nameStr) addText(doc, 1.02, line1BaseY, nameStr, 10)
  addText(doc, 4.7, line1BaseY, 'Age :', 10)
  drawUnderline(doc, 5.0, line1BaseY + 0.02, 0.4)
  if (typeof student.age !== 'undefined') addText(doc, 5.02, line1BaseY, String(student.age), 10)
  addText(doc, 5.6, line1BaseY, 'Sex :', 10)
  drawUnderline(doc, 5.9, line1BaseY + 0.02, 0.4)
  if (student.sex) addText(doc, 5.92, line1BaseY, student.sex, 10)

  // 2. Home Address / Grade
  addText(doc, 0.5, 2.0, '2. Home Address :', 10)
  // underline should be below text to avoid crossing it
  const addrUnderlineY = 2.0 + 0.14
  drawUnderline(doc, 2.0, addrUnderlineY, 3.0)
  // Preferred formatted address: Barangay, City, Postal Code, Province
  const addressField = (student.address_field || '').trim()
  const barangay = (student.barangay || '').trim()
  const city = (student.city || '').trim()
  const province = (student.province || '').trim()
  const zip = (student.zip_code || '').trim()
  const street = (student.street || '').trim()
  let formattedAddr = ''
  if (addressField) {
    formattedAddr = addressField
  } else if (barangay) {
    const parts: string[] = [barangay]
    if (city) parts.push(city)
    if (zip) parts.push(zip)
    if (province) parts.push(province)
    formattedAddr = parts.join(', ')
  } else if (street) {
    const parts: string[] = [street]
    if (city) parts.push(city)
    if (zip) parts.push(zip)
    if (province) parts.push(province)
    formattedAddr = parts.join(', ')
  } else {
    const parts = [student.house_unit, student.subdivision, student.barangay, student.city, student.province, student.zip_code]
      .filter(Boolean)
    formattedAddr = parts.join(', ')
  }
  // Clean non-ascii / unusual characters and collapse whitespace
  try {
    formattedAddr = formattedAddr.normalize('NFKD').replace(/[^\x00-\x7F]/g, '')
  } catch (e) {
    formattedAddr = formattedAddr.replace(/[^\x00-\x7F]/g, '')
  }
  formattedAddr = formattedAddr.replace(/[^A-Za-z0-9,\.\-\/\'\(\) ]+/g, '')
  formattedAddr = formattedAddr.replace(/\s+/g, ' ').trim()
  // Truncate intelligently to fit available space
  const MAX_ADDR_LEN = 100
  if (formattedAddr.length > MAX_ADDR_LEN) formattedAddr = formattedAddr.slice(0, MAX_ADDR_LEN - 3) + '...'
  if (formattedAddr) addText(doc, 2.02, 2.0, formattedAddr, 10)
  addText(doc, 5.2, 2.0, 'Gr. / Yr./ Section :', 10)
  // draw underline at same baseline offset as address underline so both sit on the same line
  drawUnderline(doc, 6.5, 2.0 + 0.02, 1.3)
  const gradeSection = [student.grade_level, student.year_level, student.section].filter(Boolean).join(' / ')
  if (gradeSection) addText(doc, 6.52, 2.0, gradeSection, 10)

  // 3. Time and Date
  addText(doc, 0.5, 2.4, '3. Time of Accident Occurred : A.M.', 10)
  drawUnderline(doc, 3.2, 2.4, 0.8)
  addText(doc, 4.2, 2.4, 'P.M.', 10)
  drawUnderline(doc, 4.6, 2.4, 0.8)
  addText(doc, 5.6, 2.4, 'Date :', 10)
  drawUnderline(doc, 6.0, 2.4, 1.8)
  const { time, period } = formatTime(report.time_of_accident)
  if (period === 'AM') addText(doc, 3.22, 2.4, time, 10)
  else if (period === 'PM') addText(doc, 4.62, 2.4, time, 10)
  if (report.accident_date) addText(doc, 6.02, 2.4, report.accident_date, 10)

  // 4. Place of Accident
  addText(doc, 0.5, 2.8, '4. Place of Accident (Specify)', 10)
  drawUnderline(doc, 2.8, 2.8, 5.0)
  if (report.location) addText(doc, 2.82, 2.8, report.location, 10)

  // 5. Nature of Injury label
  addText(doc, 0.5, 3.2, '5. Nature of Injury (Please check)', 10)

  // SECTION 2 - CHECKBOXES (5 columns)
  const checkboxCols = [0.5, 1.8, 3.1, 4.4, 5.7]
  const rows = [
    ['Abrasion', 'Asphyxiation', 'Bite', 'Cut', 'Dislocation', 'Sprain', 'Bruise'],
    ['Fracture', 'Poisoning', 'Puncture', 'Scalds', 'Scratches', 'Shock', ''],
    ['Abdomen', 'Leg', 'Arm', 'Back', 'Chest', 'Ear', ''],
    ['Eye', 'Finger', 'Foot', 'Hand', 'Head', 'Knee', ''],
    ['Leg', 'Mouth', 'Nose', 'Scalp', 'Wrist', 'Chin', ''],
  ]
  const startY = 3.5
  const rowInc = 0.2
  for (let c = 0; c < checkboxCols.length; c++) {
    const x = checkboxCols[c]
    for (let r = 0; r < rows[c].length; r++) {
      const label = rows[c][r]
      if (!label) continue
      const y = startY + r * rowInc
      drawCheckbox(doc, x, y)
      addText(doc, x + 0.12, y, label, 9)
      const checked = (report.body_parts_affected || '').split(',').map(s => s.trim()).includes(label)
      if (checked) {
        // draw an X inside checkbox
        doc.setLineWidth(0.01)
        doc.line(x + 0.02, y - 0.06, x + 0.08, y + 0.02)
        doc.line(x + 0.02, y + 0.02, x + 0.08, y - 0.06)
      }
    }
  }

  // DESCRIPTION
  addText(doc, 0.5, 5.0, 'Description of Accident :', 10)
  doc.rect(0.5, 5.2, 7.3, 1.8)
  if (report.description) {
    const descLines = doc.splitTextToSize(report.description, 7.1)
    let ly = 5.4
    for (let i = 0; i < descLines.length && ly < 7.0; i++) {
      addText(doc, 0.6, ly, descLines[i], 10)
      ly += 0.18
    }
  }

  // Final Diagnosis
  addText(doc, 0.5, 7.3, 'Final Diagnosis :', 10)
  drawUnderline(doc, 1.8, 7.3, 6.0)
  if (report.type_of_injury) addText(doc, 1.82, 7.3, report.type_of_injury, 10)

  // TEACHER INFO
  addText(doc, 0.5, 7.7, '6. Teacher In Charge when the accident occurred; Enter Name :', 10)
  drawUnderline(doc, 5.0, 7.7, 2.8)
  addText(doc, 0.5, 8.0, 'Present at the scene of accident : No :', 10)
  drawUnderline(doc, 3.3, 8.0, 0.8)
  addText(doc, 4.3, 8.0, 'Yes :', 10)
  drawUnderline(doc, 4.6, 8.0, 0.8)

  // IMMEDIATE ACTION
  addText(doc, 0.5, 8.4, '7. Immediate Action Taken :', 10)
  const actions = [
    'First Aid Treatment',
    'Sent to School Nurse',
    'Sent Home',
    'Sent to Physician',
    "Physician's Name",
    'Sent to Hospital',
    'Name of Hospital',
  ]
  for (let i = 0; i < actions.length; i++) {
    const y = 8.7 + i * 0.3
    addText(doc, 0.5, y, `${actions[i]} :`, 10)
    drawUnderline(doc, 2.5, y, 2.5)
    if (actions[i] !== "Physician's Name" && actions[i] !== 'Name of Hospital') {
      addText(doc, 5.2, y, 'By ( Name ) :', 10)
      drawUnderline(doc, 6.2, y, 1.6)
    }
  }

  // NOTIFICATIONS
  addText(doc, 0.5, 10.9, '8. Was significant others notified ? No', 10)
  drawUnderline(doc, 4.4, 10.9, 0.8)
  addText(doc, 5.4, 10.9, 'Yes', 10)
  drawUnderline(doc, 5.7, 10.9, 0.8)
  addText(doc, 0.5, 11.2, 'Name of Notified significant others', 10)
  drawUnderline(doc, 3.2, 11.2, 2.3)
  addText(doc, 5.7, 11.2, 'By whom', 10)
  drawUnderline(doc, 6.5, 11.2, 1.3)

  // WITNESSES
  addText(doc, 0.5, 11.6, '9. Witness : 1. Name', 10)
  drawUnderline(doc, 2.2, 11.6, 2.0)
  addText(doc, 4.4, 11.6, 'Address', 10)
  drawUnderline(doc, 5.2, 11.6, 2.6)
  addText(doc, 0.9, 11.9, '2. Name', 10)
  drawUnderline(doc, 2.2, 11.9, 2.0)
  addText(doc, 4.4, 11.9, 'Address', 10)
  drawUnderline(doc, 5.2, 11.9, 2.6)

  // FINAL QUESTIONS
  addText(doc, 0.5, 12.3, '10. In what location did accident occur ? Specify', 10)
  drawUnderline(doc, 4.2, 12.3, 3.6)
  addText(doc, 0.5, 12.6, '11. Number of days pupil / student was out of school', 10)
  drawUnderline(doc, 4.5, 12.6, 3.3)

  // SIGNATURES
  addText(doc, 0.5, 13.2, 'Signed :', 10)
  drawUnderline(doc, 1.2, 13.2, 2.5)
  addText(doc, 4.5, 13.2, 'Teacher / Adviser', 10)
  drawUnderline(doc, 6.0, 13.2, 1.8)

  // Populate some fields with report data when available
  // Place time/date already handled above; fill a few others
  if (report.location) addText(doc, 2.82, 2.8, report.location, 10)
  if (report.description) {
    /* already added */
  }

  const filename = `AccidentReport_${student.student_id ?? 'student'}_${report.accident_date ?? 'report'}.pdf`
  doc.save(filename)
}

export default generateAccidentReportPdf
