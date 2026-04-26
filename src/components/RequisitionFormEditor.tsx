import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType } from 'docx'
import { Printer, X, Download, Trash2, Plus } from 'lucide-react'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'
import { useInventoryData } from '../hooks/useInventory'
import type { SupplyRequestWithItems } from '../hooks/useSupplyRequests'

interface RequisitionFormEditorProps {
  request: SupplyRequestWithItems
  onClose: () => void
}

interface RequisitionRow {
  inventory_id?: string
  description: string
  quantity: string
}

function getDefaultSchoolYear() {
  const year = new Date().getFullYear()
  return `${year}-${year + 1}`
}

function parseQuantityForDb(value: string) {
  const match = value.trim().match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 1
}

function buildContactNotes(name: string, phone: string, schoolYear: string, existingNotes?: string) {
  const trimmedName = name.trim()
  const trimmedPhone = phone.trim()
  const trimmedNotes = existingNotes?.trim() ?? ''

  if (!trimmedName && !trimmedPhone && !trimmedNotes) {
    return ''
  }

  const lines: string[] = []
  if (trimmedName) {
    lines.push(`Contact Person: ${trimmedName}`)
  }
  if (trimmedPhone) {
    lines.push(`Phone: ${trimmedPhone}`)
  }
  if (trimmedName || trimmedPhone) {
    lines.push('School Nurse')
  }
  if (schoolYear.trim()) {
    lines.push(`School Year: ${schoolYear.trim()}`)
  }
  if (trimmedNotes) {
    lines.push('', `Notes: ${trimmedNotes}`)
  }

  return lines.join('\n')
}

export default function RequisitionFormEditor({ request, onClose }: RequisitionFormEditorProps) {
  const { items: inventoryItems, loading: inventoryLoading } = useInventoryData()
  const [schoolYear, setSchoolYear] = useState(getDefaultSchoolYear())
  const [rows, setRows] = useState<RequisitionRow[]>([])
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonNumber, setContactPersonNumber] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setRows(
      request?.items?.map(item => ({
        inventory_id: item.inventory_item?.id,
        description: item.inventory_item?.name || 'Unknown item',
        quantity: item.quantity.toString()
      })) ?? []
    )
  }, [request])

  const addRow = () => {
    setRows(prev => [...prev, { description: '', quantity: '' }])
  }

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const updateRow = (index: number, field: keyof RequisitionRow, value: string) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const addInventoryItemRow = (inventoryId: string) => {
    const item = inventoryItems.find(inventory => inventory.id === inventoryId)
    if (!item) return
    setRows(prev => [...prev, {
      inventory_id: item.id,
      description: item.name,
      quantity: ''
    }])
  }

  const saveRequisition = async () => {
    if (rows.length === 0) {
      toast.error('Add at least one item before saving.')
      return
    }

    const invalidRow = rows.find(row => !row.description.trim() || !row.quantity.trim())
    if (invalidRow) {
      toast.error('Please fill all description and quantity fields.')
      return
    }

    const payloadItems = rows.map(row => {
      const inventoryId = row.inventory_id || inventoryItems.find(item => item.name === row.description)?.id
      if (!inventoryId) {
        throw new Error('Each row must reference an inventory item. Select an item from the list or match an existing inventory description exactly.')
      }
      return {
        request_id: request.id,
        inventory_id: inventoryId,
        quantity: parseQuantityForDb(row.quantity)
      }
    })

    setIsSaving(true)
    try {
      const { error: deleteError } = await supabase
        .from('supply_request_items')
        .delete()
        .eq('request_id', request.id)

      if (deleteError) {
        console.error('Failed to delete existing request items:', deleteError)
        toast.error('Failed to save requisition.')
        return
      }

      const { error: insertError } = await supabase
        .from('supply_request_items')
        .insert(payloadItems)

      if (insertError) {
        console.error('Failed to insert request items:', insertError)
        toast.error('Failed to save requisition.')
        return
      }

      const notes = buildContactNotes(contactPersonName, contactPersonNumber, schoolYear, request.notes)
      const { error: updateError } = await supabase
        .from('supply_requests')
        .update({ notes })
        .eq('id', request.id)

      if (updateError) {
        console.error('Failed to update request notes:', updateError)
        toast.error('Failed to save requisition.')
        return
      }

      toast.success('Requisition saved successfully')
    } catch (error) {
      console.error('Error saving requisition:', error)
      toast.error('Failed to save requisition')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order of Medicines</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
            .header { text-align: center; margin-bottom: 24px; }
            .header .school { font-size: 20px; font-weight: bold; letter-spacing: 0.04em; }
            .header .location { margin-top: 4px; font-size: 16px; }
            .header .department { margin-top: 4px; font-size: 14px; text-transform: uppercase; }
            .title { text-align: center; margin: 24px 0; font-size: 22px; font-weight: bold; letter-spacing: 0.08em; }
            .school-year { text-align: center; margin-bottom: 24px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
            th, td { border: 1px solid #000; padding: 10px 12px; vertical-align: top; }
            th { background: #f7f7f7; font-weight: 700; }
            .quantity-col { width: 220px; }
            .footer { margin-top: 24px; }
            .contact-label { font-weight: 700; margin-bottom: 8px; }
            .contact-row { margin-bottom: 10px; }
            .contact-box { width: 100%; border: 1px solid #000; padding: 10px; min-height: 36px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school">La Consolacion College</div>
            <div class="location">Biñan, Laguna</div>
            <div class="department">HEALTH SERVICES UNIT</div>
          </div>
          <div class="title">ORDER OF MEDICINES</div>
          <div class="school-year">School Year: ${schoolYear}</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="quantity-col">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td>${row.description || ''}</td>
                  <td>${row.quantity || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div class="contact-label">Contact Person :</div>
            <div class="contact-row"><div class="contact-box">${contactPersonName || ''}</div></div>
            <div class="contact-row"><strong>School Nurse</strong></div>
            <div class="contact-row"><div class="contact-box">${contactPersonNumber || ''}</div></div>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const generateDocx = async () => {
    if (rows.length === 0) {
      toast.error('Add at least one item before exporting.')
      return
    }

    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'La Consolacion College', bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Biñan, Laguna', size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Health Services Unit', size: 22, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [new TextRun({ text: `ORDER OF MEDICINES (${schoolYear})`, bold: true, size: 26 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: '' }),
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Quantity', bold: true })] })] }),
                  ],
                }),
                ...rows.map((row) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(row.description || '')] }),
                    new TableCell({ children: [new Paragraph(row.quantity || '')] }),
                  ],
                })),
              ],
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              children: [new TextRun({ text: `Contact Person: ${contactPersonName || 'N/A'}`, bold: true })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Title: School Nurse` })],
            }),
            new Paragraph({
              children: [new TextRun({ text: `Phone: ${contactPersonNumber || 'N/A'}` })],
            }),
          ],
        }],
      })

      const blob = await Packer.toBlob(doc)
      const safeYear = schoolYear.replace(/[^a-zA-Z0-9_-]/g, '_') || 'requisition'
      saveAs(blob, `order_of_medicines_${safeYear}.docx`)
    } catch (error) {
      console.error('Error exporting DOCX:', error)
      toast.error('Failed to export DOCX')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Order of Medicines</h2>
            <p className="text-sm text-slate-600">Health Services Unit requisition template</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={generateDocx}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download as .docx
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-secondary flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print / Export as PDF
            </button>
            <button
              type="button"
              onClick={saveRequisition}
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>

        <div className="border border-slate-300 p-6 bg-slate-50">
          <div className="text-center mb-6">
            <p className="text-lg font-semibold tracking-[0.1em]">La Consolacion College</p>
            <p className="text-sm text-slate-600">Biñan, Laguna</p>
            <p className="text-sm font-semibold uppercase mt-2">Health Services Unit</p>
          </div>

          <div className="text-center mb-6">
            <p className="text-2xl font-bold tracking-[0.08em]">ORDER OF MEDICINES</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">School Year</label>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="input-field w-full"
                placeholder="2026-2027"
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-slate-700 mb-1">Add item from inventory</label>
              <select
                className="input-field w-full"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addInventoryItemRow(e.target.value)
                    e.target.value = ''
                  }
                }}
                disabled={inventoryLoading}
              >
                <option value="">Choose inventory item</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.category ? `(${item.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Order rows</h3>
              <button
                type="button"
                onClick={addRow}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add new row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em]">Description</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] w-72">Quantity</th>
                    <th className="border border-slate-300 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] w-24">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="odd:bg-white even:bg-slate-50">
                      <td className="border border-slate-300 p-2">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => updateRow(index, 'description', e.target.value)}
                          className="input-field w-full"
                          placeholder="Select or type item description"
                        />
                      </td>
                      <td className="border border-slate-300 p-2">
                        <input
                          type="text"
                          value={row.quantity}
                          onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                          className="input-field w-full"
                          placeholder="e.g. 1 box, 100 tablets, 3 pcs"
                        />
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-500">
                        No items yet. Add one row or choose an inventory item.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-slate-300 pt-6">
            <div className="mb-3 text-sm font-semibold text-slate-700">Contact Person :</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  className="input-field mt-1 w-full"
                  placeholder="Name of School Nurse"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Title</label>
                <div className="mt-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">School Nurse</div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={contactPersonNumber}
                  onChange={(e) => setContactPersonNumber(e.target.value)}
                  className="input-field mt-1 w-full"
                  placeholder="Nurse phone number"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Requisition Form</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .title { text-align: center; margin-bottom: 40px; font-size: 24px; font-weight: bold; }
              .school-year { margin-bottom: 40px; font-size: 18px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th, td { border: 1px solid black; padding: 8px; text-align: left; }
              th { font-weight: bold; }
              .quantity-col { text-align: center; width: 120px; }
              .signatures { margin-top: 60px; }
              .signature-line { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>La Consolacion College, Binan, Laguna</h1>
              <h2>Health Services Unit</h2>
            </div>
            <div class="title">REQUISITION OF MEDICINES${schoolYear ? ` (${schoolYear})` : ''}</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="quantity-col">Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .filter(item => item.description.trim() || item.quantity.trim())
                  .map(item => `
                  <tr>
                    <td>${item.description.trim() || ''}</td>
                    <td class="quantity-col">${item.quantity.trim() || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="signatures">
              <div style="margin-top: 60px;">
                <!-- First row -->
                <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                  <div style="width: 48%;">
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 18px;">Requested by:</div>
                      <div style="font-size: 18px; font-weight: bold;">School Nurse</div>
                    </div>
                    <div style="border-bottom: 1px solid black; width: 100%; margin-bottom: 10px; height: 24px;"></div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 20px;">Signature over Printed Name</div>
                    <div style="font-size: 18px;">Date: ________________________</div>
                  </div>
                  <div style="width: 48%;">
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 18px;">Approved by:</div>
                      <div style="font-size: 18px; font-weight: bold;">School Administrator</div>
                    </div>
                    <div style="border-bottom: 1px solid black; width: 100%; margin-bottom: 10px; height: 24px;"></div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 20px;">Signature over Printed Name</div>
                    <div style="font-size: 18px;">Date: ________________________</div>
                  </div>
                </div>

                <!-- Second row -->
                <div style="display: flex; justify-content: space-between;">
                  <div style="width: 48%;">
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 18px;">Released by:</div>
                      <div style="font-size: 18px; font-weight: bold;">Finance Officer</div>
                    </div>
                    <div style="border-bottom: 1px solid black; width: 100%; margin-bottom: 10px; height: 24px;"></div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 20px;">Signature over Printed Name</div>
                    <div style="font-size: 18px;">Date: ________________________</div>
                  </div>
                  <div style="width: 48%;">
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 18px;">Received by:</div>
                      <div style="font-size: 18px; font-weight: bold;">School President</div>
                    </div>
                    <div style="border-bottom: 1px solid black; width: 100%; margin-bottom: 10px; height: 24px;"></div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 20px;">Signature over Printed Name</div>
                    <div style="font-size: 18px;">Date: ________________________</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

