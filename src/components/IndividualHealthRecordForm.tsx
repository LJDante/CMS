import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Download, X, Printer } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'
import type { MedicalRecord, Student } from '../types'

interface IndividualHealthRecordFormProps {
  patient: Student
  medicalRecord: Partial<MedicalRecord>
  onClose: () => void
}

/** Left-column labels, top to bottom — exact school form order */
const MAIN_TABLE_ROWS = [
  'Date',
  'Has pupil had',
  'Grade/Yr',
  'Age',
  'Measles',
  'Height',
  'Mumps',
  'Weight',
  'Diphtheria',
  'Nutrition',
  'Whooping cough',
  'Posture',
  'Malaria',
  'Deformities',
  'Chickenpox',
  'Vision R/L',
  'Typhoid',
  'Hearing R/L',
  'H-Fever',
  'Speech',
  'Nasal breathing',
  'Pediculosis',
  'Has history of',
  'Eye',
  'Bronchial Asthma',
  'Ear',
  'Convulsion',
  'Nose',
  'Migraine',
  'Teeth',
  'Allergy',
  'Mouth',
  'Hygiene',
  'Tonsils',
  'Immunization',
  'Adenoid',
  'Throat',
  'Cervical Glands',
  'Thyroid',
  'Lungs',
  'Heart',
  'Spleen',
  'Liver',
  'Skin',
  'Temp',
  'BP',
  'Signature of Examiner',
] as const

type MainRowLabel = (typeof MAIN_TABLE_ROWS)[number]

const COLS = 6
const PAIRS = 3

const PUPIL_HAD_KEYS = [
  'Measles',
  'Mumps',
  'Diphtheria',
  'Whooping cough',
  'Malaria',
  'Chickenpox',
  'Typhoid',
  'H-Fever',
] as const

const HISTORY_KEYS = ['Bronchial Asthma', 'Convulsion', 'Migraine', 'Allergy'] as const

function buildPatientDisplayName(p: Student): string {
  const parts = [p.first_name, p.middle_name, p.last_name].filter(Boolean)
  if (parts.length) return parts.join(' ')
  return p.patient_id || ''
}

function buildPatientAddress(p: Student): string {
  return [p.address_field, p.barangay, p.city, p.province, p.zip_code].filter((x) => x && String(x).trim()).join(', ')
}

function formatDob(d?: string | null): string {
  if (!d) return ''
  return d.includes('T') ? d.split('T')[0] : d
}

function formatSexDisplay(s?: string | null): string {
  if (!s) return ''
  const v = String(s).trim().toUpperCase()
  if (v === 'M') return 'M'
  if (v === 'F') return 'F'
  return String(s).trim()
}

function tokensFromDiagnosed(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(/[,;]/g)
    .map((t) => t.trim())
    .filter(Boolean)
}

function tokenMatchesKey(token: string, key: string): boolean {
  const a = token.toLowerCase()
  const b = key.toLowerCase()
  if (key === 'H-Fever') {
    return /h[-\s]?fever|hemorrhagic/.test(a)
  }
  return a === b || a.includes(b) || b.includes(a)
}

function filterTokensForKeys(tokens: string[], keys: readonly string[]): string {
  const hits = tokens.filter((t) => keys.some((k) => tokenMatchesKey(t, k)))
  return hits.length ? hits.join(', ') : ''
}

function emptyGrid(): string[][] {
  return MAIN_TABLE_ROWS.map(() => Array(COLS).fill(''))
}

function numToCell(n: unknown): string {
  if (n === null || n === undefined || n === '') return ''
  if (typeof n === 'number' && Number.isFinite(n)) return String(n)
  if (typeof n === 'string') return n.trim()
  return String(n)
}

function writePair(g: string[][], row: number, pairIndex: number, value: string) {
  if (pairIndex < 0 || pairIndex >= PAIRS) return
  const c0 = pairIndex * 2
  if (!g[row]) return
  g[row][c0] = value
  g[row][c0 + 1] = value
}

const IndividualHealthRecordForm: React.FC<IndividualHealthRecordFormProps> = ({ patient, medicalRecord, onClose }) => {
  const [name, setName] = useState('')
  const [sex, setSex] = useState('')
  const [nationality, setNationality] = useState('')
  const [address, setAddress] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [parentGuardian, setParentGuardian] = useState('')
  const [telephone, setTelephone] = useState('')
  const [previousSurgery, setPreviousSurgery] = useState('')
  const [dateOfSurgery, setDateOfSurgery] = useState('')
  const [allergyHistory, setAllergyHistory] = useState('')

  const [grid, setGrid] = useState<string[][]>(() => emptyGrid())

  const rowIndex = useMemo(() => {
    const m: Record<string, number> = {}
    MAIN_TABLE_ROWS.forEach((label, i) => {
      m[label] = i
    })
    return m
  }, [])

  const ri = useCallback((label: MainRowLabel) => rowIndex[label], [rowIndex])

  const setCell = useCallback((row: number, col: number, value: string) => {
    setGrid((g) => {
      const next = g.map((r) => [...r])
      if (next[row]) next[row][col] = value
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!patient?.id) return

      const { data: fullRow } = await supabase.from('patients').select('*').eq('id', patient.id).maybeSingle()
      const p = (fullRow ?? patient) as Student
      if (cancelled) return

      setName(buildPatientDisplayName(p))
      setSex(formatSexDisplay(p.sex))
      setAddress(buildPatientAddress(p))
      setDateOfBirth(formatDob(p.date_of_birth))
      setParentGuardian((p.guardian_name || '').trim())
      setTelephone((p.contact_number || p.guardian_contact || '').trim())
      const allergies = (medicalRecord.allergies ?? p.allergies ?? '').trim()
      setAllergyHistory(allergies)

      const ext = medicalRecord as Record<string, unknown>
      if (typeof ext.parent_guardian === 'string' && ext.parent_guardian.trim()) {
        setParentGuardian(ext.parent_guardian.trim())
      }
      if (typeof ext.telephone === 'string' && ext.telephone.trim()) {
        setTelephone(ext.telephone.trim())
      }
      if (typeof ext.previous_surgery === 'string') setPreviousSurgery(ext.previous_surgery)
      if (typeof ext.date_of_surgery === 'string') setDateOfSurgery(ext.date_of_surgery)
      if (typeof ext.allergy_history === 'string' && ext.allergy_history.trim()) {
        setAllergyHistory(ext.allergy_history.trim())
      }

      const g = emptyGrid()
      const r = (label: MainRowLabel) => ri(label)

      const diagnosed = medicalRecord.diagnosed_diseases || p.diagnosed_diseases || ''
      const tokens = tokensFromDiagnosed(diagnosed)
      const imm = (medicalRecord.immunization_history || '').trim()

      const pupilSummary = filterTokensForKeys(tokens, PUPIL_HAD_KEYS) || diagnosed.trim()
      const histSummary = filterTokensForKeys(tokens, HISTORY_KEYS) || ''

      if (pupilSummary) {
        const row = r('Has pupil had')
        for (let c = 0; c < COLS; c++) g[row][c] = pupilSummary
      }

      if (histSummary) {
        const row = r('Has history of')
        for (let c = 0; c < COLS; c++) g[row][c] = histSummary
      }

      if (imm) {
        const row = r('Immunization')
        for (let c = 0; c < COLS; c++) g[row][c] = imm
      }

      for (const key of PUPIL_HAD_KEYS) {
        const match = tokens.some((t) => tokenMatchesKey(t, key))
        if (match) {
          const row = r(key as MainRowLabel)
          if (!g[row].some((x) => x.trim())) g[row][0] = 'Yes'
        }
      }
      for (const key of HISTORY_KEYS) {
        const match = tokens.some((t) => tokenMatchesKey(t, key))
        if (match) {
          const row = r(key as MainRowLabel)
          if (!g[row].some((x) => x.trim())) g[row][0] = 'Yes'
        }
      }

      const gradeBits = [p.grade_level, p.section, p.year_level].filter((x) => x && String(x).trim())
      const gradeStr = gradeBits.join(' / ')
      const ageStr = p.age != null ? String(p.age) : ''

      const { data, error } = await supabase
        .from('physical_examinations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('exam_date', { ascending: true })
        .limit(PAIRS)

      if (!cancelled && !error && data?.length) {
        data.forEach((raw: Record<string, unknown>, pairIdx: number) => {
          if (pairIdx >= PAIRS) return
          const examDate = raw.exam_date ? String(raw.exam_date).split('T')[0] : ''
          writePair(g, r('Date'), pairIdx, examDate)
          writePair(g, r('Height'), pairIdx, numToCell(raw.height_cm))
          writePair(g, r('Weight'), pairIdx, numToCell(raw.weight_kg))
          writePair(g, r('BP'), pairIdx, raw.blood_pressure != null ? String(raw.blood_pressure) : '')
          const tempVal = raw.temperature ?? raw.temp
          writePair(g, r('Temp'), pairIdx, numToCell(tempVal))
          if (gradeStr) writePair(g, r('Grade/Yr'), pairIdx, gradeStr)
          if (ageStr) writePair(g, r('Age'), pairIdx, ageStr)
        })
      }

      if (!cancelled) setGrid(g)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [patient.id, medicalRecord, ri])

  const escapeHtml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

  const buildPrintableHtml = () => {
    const headerBlock = `
      <div class="hdr">
        <div class="school">La Consolacion College</div>
        <div class="addr">Sto. Tomas, Biñan City, Laguna, Philippines</div>
        <div class="unit">HEALTH SERVICES UNIT</div>
        <div class="title">INDIVIDUAL HEALTH RECORD</div>
      </div>`

    const top = `
      <table class="top">
        <tr>
          <td class="lbl">Name:</td><td class="val" colspan="2">${escapeHtml(name)}</td>
          <td class="lbl">Sex:</td><td class="val">${escapeHtml(sex)}</td>
          <td class="lbl">Nationality:</td><td class="val">${escapeHtml(nationality)}</td>
        </tr>
        <tr>
          <td class="lbl">Address:</td><td class="val" colspan="4">${escapeHtml(address)}</td>
          <td class="lbl">Date of Birth:</td><td class="val">${escapeHtml(dateOfBirth)}</td>
        </tr>
        <tr>
          <td class="lbl">Parent/Guardian:</td><td class="val" colspan="4">${escapeHtml(parentGuardian)}</td>
          <td class="lbl">Telephone:</td><td class="val">${escapeHtml(telephone)}</td>
        </tr>
        <tr>
          <td class="lbl">Previous Surgical Operation:</td><td class="val" colspan="4">${escapeHtml(previousSurgery)}</td>
          <td class="lbl">Date of Operation:</td><td class="val">${escapeHtml(dateOfSurgery)}</td>
        </tr>
        <tr>
          <td class="lbl">History of Allergy to:</td><td class="val" colspan="6">${escapeHtml(allergyHistory)}</td>
        </tr>
      </table>`

    let main = '<table class="main"><thead><tr><th class="c-label"></th>'
    main += '<th>Nurse</th><th>Doctor</th><th>Nurse</th><th>Doctor</th><th>Nurse</th><th>Doctor</th></tr></thead><tbody>'
    MAIN_TABLE_ROWS.forEach((label, rowIdx) => {
      main += `<tr><td class="c-label">${escapeHtml(label)}</td>`
      for (let c = 0; c < COLS; c++) {
        main += `<td class="cell">${escapeHtml(grid[rowIdx][c] || '')}</td>`
      }
      main += '</tr>'
    })
    main += '</tbody></table>'

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Individual Health Record</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 16px; }
        .hdr { text-align: center; margin-bottom: 14px; }
        .school { font-weight: bold; font-size: 14px; }
        .addr { font-size: 11px; margin-top: 2px; }
        .unit { font-weight: bold; margin-top: 6px; }
        .title { font-weight: bold; margin-top: 4px; text-decoration: underline; }
        table.top { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.top td { border: 1px solid #333; padding: 4px 6px; vertical-align: top; }
        table.top td.lbl { font-weight: bold; white-space: nowrap; }
        table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.main th, table.main td { border: 1px solid #333; padding: 3px 4px; word-wrap: break-word; }
        table.main th { background: #f0f0f0; font-weight: bold; text-align: center; font-size: 10px; }
        table.main td.c-label { font-weight: bold; background: #fafafa; width: 22%; font-size: 10px; }
        table.main td.cell { font-size: 10px; }
        @media print { body { margin: 8px; } }
      </style></head><body>${headerBlock}${top}${main}
      <script>window.onload=function(){window.print();}</script>
      </body></html>`
  }

  const handlePrint = () => {
    const html = buildPrintableHtml()
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const generateDocx = async () => {
    const thin = {
      top: { style: 'single' as const, size: 1, color: '000000' },
      bottom: { style: 'single' as const, size: 1, color: '000000' },
      left: { style: 'single' as const, size: 1, color: '000000' },
      right: { style: 'single' as const, size: 1, color: '000000' },
    }

    const cell = (text: string, opts?: { bold?: boolean; center?: boolean; colSpan?: number }) =>
      new TableCell({
        borders: thin,
        columnSpan: opts?.colSpan,
        children: [
          new Paragraph({
            children: [new TextRun({ text: text ?? '', bold: opts?.bold })],
            alignment: opts?.center ? AlignmentType.CENTER : undefined,
          }),
        ],
      })

    const rows: TableRow[] = []

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 7,
            borders: thin,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'La Consolacion College', bold: true })] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Sto. Tomas, Biñan City, Laguna, Philippines' })],
              }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HEALTH SERVICES UNIT', bold: true })] }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'INDIVIDUAL HEALTH RECORD', bold: true, underline: {} })],
              }),
            ],
          }),
        ],
      })
    )

    rows.push(
      new TableRow({
        children: [
          cell('Name:', { bold: true }),
          cell(name, { colSpan: 2 }),
          cell('Sex:', { bold: true }),
          cell(sex),
          cell('Nationality:', { bold: true }),
          cell(nationality),
        ],
      })
    )

    rows.push(
      new TableRow({
        children: [
          cell('Address:', { bold: true }),
          cell(address, { colSpan: 4 }),
          cell('Date of Birth:', { bold: true }),
          cell(dateOfBirth),
        ],
      })
    )

    rows.push(
      new TableRow({
        children: [
          cell('Parent/Guardian:', { bold: true }),
          cell(parentGuardian, { colSpan: 4 }),
          cell('Telephone:', { bold: true }),
          cell(telephone),
        ],
      })
    )

    rows.push(
      new TableRow({
        children: [
          cell('Previous Surgical Operation:', { bold: true }),
          cell(previousSurgery, { colSpan: 4 }),
          cell('Date of Operation:', { bold: true }),
          cell(dateOfSurgery),
        ],
      })
    )

    rows.push(
      new TableRow({
        children: [cell('History of Allergy to:', { bold: true }), cell(allergyHistory, { colSpan: 6 })],
      })
    )

    rows.push(
      new TableRow({
        children: [
          cell('', { bold: true }),
          cell('Nurse', { bold: true, center: true }),
          cell('Doctor', { bold: true, center: true }),
          cell('Nurse', { bold: true, center: true }),
          cell('Doctor', { bold: true, center: true }),
          cell('Nurse', { bold: true, center: true }),
          cell('Doctor', { bold: true, center: true }),
        ],
      })
    )

    MAIN_TABLE_ROWS.forEach((label, ri) => {
      rows.push(
        new TableRow({
          children: [
            cell(label, { bold: true }),
            ...Array.from({ length: COLS }, (_, ci) => cell(grid[ri][ci] || '')),
          ],
        })
      )
    })

    try {
      const doc = new Document({
        sections: [
          {
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [2400, 1100, 1100, 1100, 1100, 1100, 1100],
                rows,
              }),
            ],
          },
        ],
      })
      const blob = await Packer.toBlob(doc)
      const safe = `IHR_${(name || 'patient').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`
      saveAs(blob, safe)
    } catch (e) {
      console.error('DOCX export failed', e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="flex max-h-[95vh] w-full max-w-6xl flex-col rounded-lg bg-white shadow-lg">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={() => void generateDocx()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Download as .docx
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Printer className="h-4 w-4" />
            Print/Export as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div id="printable-form" className="mx-auto max-w-[900px] bg-white text-black">
            <div className="mb-4 text-center leading-tight">
              <div className="text-base font-bold">La Consolacion College</div>
              <div className="text-xs sm:text-sm">Sto. Tomas, Biñan City, Laguna, Philippines</div>
              <div className="mt-2 text-sm font-bold">HEALTH SERVICES UNIT</div>
              <div className="mt-1 text-sm font-bold underline">INDIVIDUAL HEALTH RECORD</div>
            </div>

            <table className="mb-4 w-full border-collapse border border-black text-xs sm:text-sm">
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1 font-bold">Name:</td>
                  <td className="border border-black px-1 py-0" colSpan={2}>
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={name} onChange={(e) => setName(e.target.value)} />
                  </td>
                  <td className="border border-black px-2 py-1 font-bold">Sex:</td>
                  <td className="border border-black px-1 py-0">
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={sex} onChange={(e) => setSex(e.target.value)} />
                  </td>
                  <td className="border border-black px-2 py-1 font-bold">Nationality:</td>
                  <td className="border border-black px-1 py-0">
                    <input
                      className="w-full bg-transparent px-1 py-1 outline-none"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 font-bold">Address:</td>
                  <td className="border border-black px-1 py-0" colSpan={4}>
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </td>
                  <td className="border border-black px-2 py-1 font-bold">Date of Birth:</td>
                  <td className="border border-black px-1 py-0">
                    <input className="w-full bg-transparent px-1 py-1 outline-none" type="text" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 font-bold">Parent/Guardian:</td>
                  <td className="border border-black px-1 py-0" colSpan={4}>
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={parentGuardian} onChange={(e) => setParentGuardian(e.target.value)} />
                  </td>
                  <td className="border border-black px-2 py-1 font-bold">Telephone:</td>
                  <td className="border border-black px-1 py-0">
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 font-bold">Previous Surgical Operation:</td>
                  <td className="border border-black px-1 py-0" colSpan={4}>
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={previousSurgery} onChange={(e) => setPreviousSurgery(e.target.value)} />
                  </td>
                  <td className="border border-black px-2 py-1 font-bold">Date of Operation:</td>
                  <td className="border border-black px-1 py-0">
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={dateOfSurgery} onChange={(e) => setDateOfSurgery(e.target.value)} />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-1 font-bold">History of Allergy to:</td>
                  <td className="border border-black px-1 py-0" colSpan={6}>
                    <input className="w-full bg-transparent px-1 py-1 outline-none" value={allergyHistory} onChange={(e) => setAllergyHistory(e.target.value)} />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse border border-black text-[10px] sm:text-xs">
                <thead>
                  <tr>
                    <th className="w-[22%] border border-black bg-slate-100 px-1 py-1" />
                    <th className="border border-black bg-slate-100 px-1 py-1 font-bold">Nurse</th>
                    <th className="border border-black bg-slate-100 px-1 py-1 font-bold">Doctor</th>
                    <th className="border border-black bg-slate-100 px-1 py-1 font-bold">Nurse</th>
                    <th className="border border-black bg-slate-100 px-1 py-1 font-bold">Doctor</th>
                    <th className="border border-black bg-slate-100 px-1 py-1 font-bold">Nurse</th>
                    <th className="border border-black bg-slate-100 px-1 py-1 font-bold">Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {MAIN_TABLE_ROWS.map((label, rowIdx) => (
                    <tr key={label}>
                      <td className="border border-black bg-slate-50 px-1 py-0.5 font-bold">{label}</td>
                      {Array.from({ length: COLS }, (_, ci) => (
                        <td key={ci} className="border border-black p-0">
                          <input
                            className="box-border w-full min-h-[26px] bg-transparent px-1 py-1 outline-none"
                            value={grid[rowIdx][ci]}
                            onChange={(e) => setCell(rowIdx, ci, e.target.value)}
                            aria-label={`${label} column ${ci + 1}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndividualHealthRecordForm
