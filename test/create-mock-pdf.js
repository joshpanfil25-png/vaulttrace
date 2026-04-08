import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const EMPLOYERS = [
  { name: 'Acme Corp',         ein: '12-3456789', years: '2018–2020' },
  { name: 'TechStart LLC',     ein: '98-7654321', years: '2020–2022' },
  { name: 'Global Retail Inc', ein: '45-6789012', years: '2022–2023' },
]

async function createMockTranscript() {
  const pdfDoc = await PDFDocument.create()
  const page    = pdfDoc.addPage([612, 792]) // US Letter
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const black = rgb(0, 0, 0)
  const gray  = rgb(0.4, 0.4, 0.4)
  const line  = rgb(0.8, 0.8, 0.8)

  const { height } = page.getSize()
  const L = 72   // left margin
  const R = 540  // right edge
  let y = height - 60

  // ── Header ──────────────────────────────────────────────────────────
  page.drawText('DEPARTMENT OF THE TREASURY', { x: L, y, font: bold, size: 10, color: black })
  y -= 14
  page.drawText('INTERNAL REVENUE SERVICE', { x: L, y, font: bold, size: 10, color: black })
  y -= 22

  page.drawText('Wage & Income Transcript', { x: L, y, font: bold, size: 16, color: black })
  y -= 18

  page.drawText('Tax Year: 2018 – 2023', { x: L, y, font: regular, size: 11, color: gray })
  y -= 10

  // divider
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: line })
  y -= 20

  // ── Taxpayer info ────────────────────────────────────────────────────
  page.drawText('Taxpayer Name:',  { x: L,       y, font: bold,    size: 10, color: black })
  page.drawText('JOHN Q. SAMPLE', { x: L + 105,  y, font: regular, size: 10, color: black })
  y -= 14
  page.drawText('SSN:',            { x: L,       y, font: bold,    size: 10, color: black })
  page.drawText('XXX-XX-1234',     { x: L + 105, y, font: regular, size: 10, color: black })
  y -= 14
  page.drawText('Transcript Date:', { x: L,      y, font: bold,    size: 10, color: black })
  page.drawText('01/15/2024',       { x: L + 105,y, font: regular, size: 10, color: black })
  y -= 20

  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: line })
  y -= 24

  // ── Section heading ──────────────────────────────────────────────────
  page.drawText('EMPLOYER WAGE & WITHHOLDING INFORMATION', {
    x: L, y, font: bold, size: 11, color: black,
  })
  y -= 8
  page.drawText(
    'The following employers submitted W-2 wage and tax statements for the taxpayer.',
    { x: L, y, font: regular, size: 9, color: gray }
  )
  y -= 24

  // ── Employer cards ───────────────────────────────────────────────────
  for (const [i, emp] of EMPLOYERS.entries()) {
    // card background (light gray rect)
    page.drawRectangle({
      x: L, y: y - 92,
      width: R - L, height: 100,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5,
    })

    const ty = y - 14
    page.drawText(`Employer ${i + 1}`, { x: L + 8, y: ty, font: bold, size: 9, color: gray })

    page.drawText('Employer Name:', { x: L + 8, y: ty - 16, font: bold,    size: 10, color: black })
    page.drawText(emp.name,         { x: L + 110, y: ty - 16, font: regular, size: 10, color: black })

    page.drawText('EIN:',  { x: L + 8,   y: ty - 32, font: bold,    size: 10, color: black })
    page.drawText(emp.ein, { x: L + 110,  y: ty - 32, font: regular, size: 10, color: black })

    page.drawText('Years Employed:', { x: L + 8,    y: ty - 48, font: bold,    size: 10, color: black })
    page.drawText(emp.years,          { x: L + 110,  y: ty - 48, font: regular, size: 10, color: black })

    page.drawText('Total Wages Reported:', { x: L + 8,   y: ty - 64, font: bold,    size: 10, color: black })
    page.drawText('See attached W-2 forms', { x: L + 145, y: ty - 64, font: regular, size: 10, color: gray })

    y -= 116
  }

  // ── Footer ───────────────────────────────────────────────────────────
  y -= 10
  page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: line })
  y -= 14

  page.drawText(
    'This transcript is provided for informational purposes only. Handle with care — contains sensitive tax information.',
    { x: L, y, font: regular, size: 8, color: gray }
  )
  y -= 12
  page.drawText(
    'Form 4506-T  |  IRS.gov  |  1-800-829-1040',
    { x: L, y, font: regular, size: 8, color: gray }
  )

  const pdfBytes = await pdfDoc.save()
  const outPath = join(__dirname, 'mock-transcript.pdf')
  writeFileSync(outPath, pdfBytes)
  console.log(`✓ Saved mock transcript to ${outPath}`)
}

createMockTranscript().catch((err) => {
  console.error('Failed to create PDF:', err)
  process.exit(1)
})
