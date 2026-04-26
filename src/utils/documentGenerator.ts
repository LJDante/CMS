import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType } from 'docx'
import type { EndingInventoryItem } from '../types/inventory'

export function generateInventoryDocument(endingItems: EndingInventoryItem[], signature?: string): Document {
  return new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          children: [
            new TextRun({
              text: "La Consolacion College",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Sto. Tomas, Biñan City, Laguna",
              size: 20,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "ENDING INVENTORY SY 2022-2023",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),

        // Table
        new Paragraph({ text: "" }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Quantity")] }),
                new TableCell({ children: [new Paragraph("Description/S")] }),
                new TableCell({ children: [new Paragraph("Remarks")] }),
              ],
            }),
            ...endingItems.map(item => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(item.quantity.toString())] }),
                new TableCell({ children: [new Paragraph(item.description)] }),
                new TableCell({ children: [new Paragraph(item.remarks)] }),
              ],
            })),
          ],
        }),

        // Signatory section
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [new TextRun({ text: "Submitted by\t\t\t\t\t\t\t Checked by:" })],
        }),
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [new TextRun({ text: "School Nurse\t\t\t\t\t\t\t\t\t\t\t\tProperty Custodian" })],
        }),
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [new TextRun({ text: "Noted by :\t\t\t\t\t\t\t\t\t\tApproved by:" })],
        }),
        new Paragraph({ text: "" }),
        new Paragraph({
          children: [new TextRun({ text: "Unit / Department Head\t\t\t\t\t\t\t\t\tChancellor" })],
        }),        new Paragraph({ text: "" }),
        new Paragraph({
          children: [new TextRun({ text: "Electronic Signature: " + (signature || "___________________________") })],
        }),      ],
    }],
  })
}

export async function exportToWord(endingItems: EndingInventoryItem[], signature?: string): Promise<void> {
  const doc = generateInventoryDocument(endingItems, signature)
  const blob = await Packer.toBlob(doc)

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Ending_Inventory_SY_2022-2023.docx'
  a.click()
  URL.revokeObjectURL(url)
}