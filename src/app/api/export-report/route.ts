// pdfkit reads AFM font files from the filesystem; keep Node.js runtime.
// next.config.ts marks pdfkit as serverExternalPackages so it is not bundled.
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
// pdfkit ships its own TypeScript types since v0.12
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit')

import type { EmployerResult } from '@/components/ResultsDashboard'

// ─── Request shape ────────────────────────────────────────────────────────────

interface ReportRequest {
  results: EmployerResult[]
  email?: string
  scanned_at?: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  amber:      '#F59E0B',
  amberDark:  '#B45309',
  text:       '#18181B',
  textMid:    '#52525B',
  textMuted:  '#A1A1AA',
  border:     '#D4D4D8',
  rowAlt:     '#F4F4F5',
  green:      '#15803D',
  yellow:     '#B45309',
  red:        '#B91C1C',
  white:      '#FFFFFF',
  headerBg:   '#1C1917',   // table header row
  headerText: '#F5F5F4',
}

const PAGE_W   = 612
const ML       = 54          // left margin
const MR       = 558         // right margin  (612 − 54)
const CW       = 504         // content width (MR − ML)

// Table column x-positions and widths (all within ML…MR = 504pt)
const COL = {
  num:  { x: ML,       w: 20  },   // row #
  emp:  { x: ML + 20,  w: 140 },   // employer name
  ein:  { x: ML + 160, w: 82  },   // EIN
  sta:  { x: ML + 242, w: 52  },   // status
  plan: { x: ML + 294, w: 114 },   // plan name
  year: { x: ML + 408, w: 44  },   // last filing year
  conf: { x: ML + 452, w: 52  },   // confidence score
  //  right edge = 452 + 52 = 504 → 54 + 504 = 558 = MR  ✓
}

const ROW_H    = 20   // data row height (pts)
const HEAD_H   = 22   // table header row height
const FOOT_Y   = 740  // footer starts here (leaving 52pt at bottom)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function fmt(n: number | null | undefined): string {
  return n != null ? String(n) : '—'
}

function confColor(score: number): string {
  if (score >= 70) return C.green
  if (score >= 40) return C.yellow
  return C.red
}

function hRule(doc: InstanceType<typeof PDFDocument>, y: number, color = C.border, weight = 0.5) {
  doc.save()
    .moveTo(ML, y).lineTo(MR, y)
    .lineWidth(weight).strokeColor(color).stroke()
    .restore()
}

// ─── PDF builder ─────────────────────────────────────────────────────────────

async function buildPDF(req: ReportRequest): Promise<Buffer> {
  const { results, email, scanned_at } = req

  const scanDate  = scanned_at
    ? new Date(scanned_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const found      = results.filter((r) => r.has_401k)
  const totalFound = found.length
  const totalEmp   = results.length
  const aum        = totalFound * 66_000
  const fmtAUM     = aum >= 1_000_000
    ? `$${(aum / 1_000_000).toFixed(2)}M`
    : `$${aum.toLocaleString()}`

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 0,
      info: {
        Title: 'VaultTrace Retirement Benefits Report',
        Author: 'VaultTrace',
        Subject: 'Retirement Account Discovery Report',
        CreationDate: new Date(),
      },
    })

    const chunks: Buffer[] = []
    doc.on('data',  (c: Buffer) => chunks.push(c))
    doc.on('end',   () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 68).fill(C.amber)

    // Logo mark (small circle)
    doc.save()
      .circle(ML + 14, 34, 12)
      .lineWidth(2).strokeColor(C.amberDark).stroke()
      .restore()
    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.amberDark)
      .text('VT', ML + 9, 31, { lineBreak: false })

    // Brand name
    doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white)
      .text('VaultTrace', ML + 34, 22, { lineBreak: false })

    // Report subtitle
    doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.75)')
      .text('Retirement Benefits Report', ML + 34, 46, { lineBreak: false })

    // Date — right-aligned in header
    doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.7)')
      .text(scanDate, 0, 28, { width: MR, align: 'right', lineBreak: false })

    // ── Client info block ─────────────────────────────────────────────────────
    let y = 84

    if (email) {
      doc.font('Helvetica').fontSize(8).fillColor(C.textMuted)
        .text('PREPARED FOR', ML, y, { lineBreak: false })
      doc.font('Helvetica').fontSize(8).fillColor(C.textMuted)
        .text('SCAN DATE', 0, y, { width: MR, align: 'right', lineBreak: false })

      y += 12
      doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text)
        .text(email, ML, y, { lineBreak: false })
      doc.font('Helvetica').fontSize(11).fillColor(C.textMid)
        .text(scanDate, 0, y, { width: MR, align: 'right', lineBreak: false })
      y += 18
    } else {
      doc.font('Helvetica').fontSize(8).fillColor(C.textMuted)
        .text('SCAN DATE', ML, y, { lineBreak: false })
      y += 12
      doc.font('Helvetica').fontSize(11).fillColor(C.textMid)
        .text(scanDate, ML, y, { lineBreak: false })
      y += 18
    }

    hRule(doc, y)
    y += 14

    // ── Summary stat boxes ────────────────────────────────────────────────────
    const BOX_W = 160
    const BOX_H = 56
    const boxes = [
      { label: 'EMPLOYERS ANALYZED', value: String(totalEmp) },
      { label: '401(k) ACCOUNTS FOUND', value: String(totalFound), accent: totalFound > 0 },
      { label: 'ESTIMATED AUM', value: fmtAUM, accent: totalFound > 0 },
    ]
    const boxGap = (CW - BOX_W * 3) / 2  // equal spacing

    boxes.forEach(({ label, value, accent }, idx) => {
      const bx = ML + idx * (BOX_W + boxGap)
      // Box background
      doc.roundedRect(bx, y, BOX_W, BOX_H, 6)
        .fillAndStroke(accent ? '#FFFBEB' : '#FAFAFA', accent ? '#FDE68A' : C.border)

      // Value
      doc.font('Helvetica-Bold').fontSize(22).fillColor(accent ? C.amber : C.text)
        .text(value, bx + 12, y + 10, { width: BOX_W - 24, lineBreak: false })

      // Label
      doc.font('Helvetica').fontSize(7.5).fillColor(C.textMuted)
        .text(label, bx + 12, y + 36, { width: BOX_W - 24, lineBreak: false })
    })

    y += BOX_H + 20

    // ── Employer details table ─────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.textMid)
      .text('EMPLOYER DETAILS', ML, y, { lineBreak: false })
    y += 14

    // Table header row
    doc.rect(ML, y, CW, HEAD_H).fill(C.headerBg)

    const headers: [keyof typeof COL, string][] = [
      ['num',  '#'],
      ['emp',  'EMPLOYER NAME'],
      ['ein',  'EIN'],
      ['sta',  'STATUS'],
      ['plan', 'PLAN NAME'],
      ['year', 'FILED'],
      ['conf', 'CONFIDENCE'],
    ]

    doc.font('Helvetica-Bold').fontSize(7).fillColor(C.headerText)
    headers.forEach(([key, label]) => {
      const col = COL[key]
      doc.text(label, col.x + 4, y + 7, { width: col.w - 8, lineBreak: false })
    })
    y += HEAD_H

    // Data rows
    results.forEach((emp, i) => {
      // Page break guard
      if (y + ROW_H > FOOT_Y - 20) {
        doc.addPage({ size: 'LETTER', margin: 0 })
        y = 30
        // Redraw mini header
        doc.rect(ML, y, CW, HEAD_H).fill(C.headerBg)
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.headerText)
        headers.forEach(([key, label]) => {
          const col = COL[key]
          doc.text(label, col.x + 4, y + 7, { width: col.w - 8, lineBreak: false })
        })
        y += HEAD_H
      }

      const isAlt = i % 2 === 1
      doc.rect(ML, y, CW, ROW_H).fill(isAlt ? C.rowAlt : C.white)

      const ty = y + 5   // text y (vertically centered in row)
      const score = emp.confidence_score ?? 0

      // #
      doc.font('Helvetica').fontSize(8).fillColor(C.textMuted)
        .text(String(i + 1), COL.num.x + 4, ty, { width: COL.num.w - 8, lineBreak: false })

      // Employer name
      doc.font('Helvetica').fontSize(8).fillColor(C.text)
        .text(trunc(emp.employer_name, 22), COL.emp.x + 4, ty, { width: COL.emp.w - 8, lineBreak: false })

      // EIN
      doc.font('Helvetica').fontSize(8).fillColor(emp.has_redacted_ein ? C.textMuted : C.textMid)
        .text(emp.ein ?? '—', COL.ein.x + 4, ty, { width: COL.ein.w - 8, lineBreak: false })

      // Status
      if (emp.has_401k) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.green)
          .text('✓ Found', COL.sta.x + 4, ty, { width: COL.sta.w - 8, lineBreak: false })
      } else {
        doc.font('Helvetica').fontSize(8).fillColor(C.textMuted)
          .text('✗  None', COL.sta.x + 4, ty, { width: COL.sta.w - 8, lineBreak: false })
      }

      // Plan name
      doc.font('Helvetica').fontSize(8).fillColor(C.textMid)
        .text(trunc(emp.plan_name ?? '—', 19), COL.plan.x + 4, ty, { width: COL.plan.w - 8, lineBreak: false })

      // Last filing year
      doc.font('Helvetica').fontSize(8).fillColor(C.textMid)
        .text(fmt(emp.last_filing_year), COL.year.x + 4, ty, { width: COL.year.w - 8, lineBreak: false })

      // Confidence score
      doc.font('Helvetica-Bold').fontSize(8).fillColor(confColor(score))
        .text(`${score}%`, COL.conf.x + 4, ty, { width: COL.conf.w - 8, lineBreak: false })

      y += ROW_H
    })

    // Bottom border of table
    hRule(doc, y, C.border, 0.5)
    y += 20

    // ── PBGC callout (if any) ─────────────────────────────────────────────────
    const pbgcFound = results.filter((r) => r.pbgc_plans && r.pbgc_plans.length > 0)
    if (pbgcFound.length > 0) {
      doc.rect(ML, y, CW, 30).fillAndStroke('#EFF6FF', '#BFDBFE')
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1D4ED8')
        .text('PBGC PENSION PLANS FOUND', ML + 10, y + 6, { lineBreak: false })
      doc.font('Helvetica').fontSize(8).fillColor('#1E40AF')
        .text(
          pbgcFound.map((r) => `${r.employer_name} (${r.pbgc_plans!.length} plan${r.pbgc_plans!.length !== 1 ? 's' : ''})`).join('  ·  '),
          ML + 10, y + 17, { width: CW - 20, lineBreak: false },
        )
      y += 42
    }

    // ── Next steps ────────────────────────────────────────────────────────────
    if (y + 150 > FOOT_Y) {
      doc.addPage({ size: 'LETTER', margin: 0 })
      y = 40
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.textMid)
      .text('NEXT STEPS', ML, y, { lineBreak: false })
    y += 14
    hRule(doc, y, C.border)
    y += 12

    const steps = [
      'Contact each plan administrator directly using the EIN and plan name listed above. Request a participant statement confirming your account balance and vesting status.',
      'If a plan has terminated, file a claim through the DOL Abandoned Plan Program at dol.gov or the PBGC Missing Participants Program at pbgc.gov.',
      'Search state unclaimed property databases for each employer. Links are provided in your online results at vaulttrace.com.',
      'Consider consolidating located accounts into your current employer\'s plan or a rollover IRA to simplify management.',
    ]

    steps.forEach((step, i) => {
      if (y + 30 > FOOT_Y) {
        doc.addPage({ size: 'LETTER', margin: 0 })
        y = 40
      }
      // Number badge
      doc.circle(ML + 7, y + 7, 7).fill(C.amber)
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
        .text(String(i + 1), ML + 4, y + 3, { lineBreak: false })

      // Step text
      doc.font('Helvetica').fontSize(9).fillColor(C.text)
        .text(step, ML + 20, y, { width: CW - 20 })
      y = doc.y + 8
    })

    // ── Footer ────────────────────────────────────────────────────────────────
    // Draw footer on current page (and only current page — multi-page edge case
    // is handled by placing Next Steps content above FOOT_Y)
    hRule(doc, FOOT_Y, C.border)

    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMuted)
      .text(
        'Results based on DOL Form 5500 public filings. Confirmation required from plan administrator. ' +
        'This report does not constitute legal or financial advice.',
        ML, FOOT_Y + 8, { width: CW * 0.72, lineBreak: true },
      )

    // VaultTrace brand — right side of footer
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.amber)
      .text('VaultTrace', MR - 60, FOOT_Y + 8, { lineBreak: false })
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMuted)
      .text('vaulttrace.com', MR - 60, FOOT_Y + 19, { lineBreak: false })

    doc.end()
  })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientIp(req))
  if (limited) return limited

  let body: ReportRequest
  try {
    body = (await req.json()) as ReportRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(body.results) || body.results.length === 0) {
    return NextResponse.json({ error: 'results array is required' }, { status: 400 })
  }

  try {
    const pdf = await buildPDF(body)

    const clientSlug = body.email
      ? body.email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()
      : 'client'
    const dateSlug = new Date().toISOString().slice(0, 10)
    const filename = `vaulttrace-${clientSlug}-${dateSlug}.pdf`

    // TypeScript 5.x tightened Uint8Array<ArrayBufferLike> generics so Buffer
    // no longer satisfies BodyInit directly.  Slice the underlying ArrayBuffer
    // (Buffer.concat always starts at byteOffset 0, so this is zero-copy).
    const ab = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer

    return new Response(ab, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.byteLength),
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
