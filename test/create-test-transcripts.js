// test/create-test-transcripts.js
// Generates three mock IRS Wage & Income Transcript PDFs for testing the parser.
// Run with:  node test/create-test-transcripts.js

'use strict'

const PDFDocument = require('pdfkit')
const fs          = require('fs')
const path        = require('path')

const OUT_DIR = path.join(__dirname)

// ─── Layout constants (match real IRS transcript geometry) ───────────────────
const PAGE_W      = 612   // letter width  (points)
const PAGE_H      = 792   // letter height (points)
const MARGIN_L    = 54
const MARGIN_R    = PAGE_W - 54
const COL2        = 320   // right-column x for value fields

const FONT_MONO   = 'Courier'
const FONT_BOLD   = 'Courier-Bold'
const FONT_NORMAL = 'Courier'

const SZ_TITLE    = 11
const SZ_SECTION  = 10
const SZ_BODY     = 9
const SZ_SMALL    = 8

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Move cursor down by `pts` points and return new y. */
function gap(doc, pts = 6) {
  doc.moveDown(0)
  return (doc.y += pts)
}

/** Draw a full-width horizontal rule. */
function rule(doc, y, weight = 0.5) {
  doc.save()
    .moveTo(MARGIN_L, y)
    .lineTo(MARGIN_R, y)
    .lineWidth(weight)
    .strokeColor('#000000')
    .stroke()
    .restore()
}

/** Print a label:value pair on one line (left + right columns). */
function labelValue(doc, label, value, y) {
  doc
    .font(FONT_NORMAL).fontSize(SZ_BODY)
    .text(label, MARGIN_L, y, { continued: false })
    .text(value,  COL2,    y, { continued: false })
  return y + 13
}

/** Print a bold section heading with an underline. */
function sectionHead(doc, text, y) {
  gap(doc, 4)
  y = doc.y
  doc.font(FONT_BOLD).fontSize(SZ_SECTION).text(text, MARGIN_L, y)
  rule(doc, y + 13, 0.75)
  doc.y = y + 19
  return doc.y
}

// ─── Page header (appears on every transcript) ───────────────────────────────

function writePageHeader(doc, requestDate, taxYear, taxpayerName, ssn) {
  const centerX = PAGE_W / 2

  // IRS seal placeholder (circle)
  doc.save()
    .circle(MARGIN_L + 20, 52, 20)
    .lineWidth(1.5)
    .strokeColor('#000')
    .stroke()
    .font(FONT_BOLD).fontSize(6).fillColor('#000')
    .text('IRS', MARGIN_L + 12, 49)
    .restore()

  // Department header
  doc.font(FONT_BOLD).fontSize(SZ_TITLE)
    .text('DEPARTMENT OF THE TREASURY — INTERNAL REVENUE SERVICE', MARGIN_L + 46, 38, {
      width: PAGE_W - MARGIN_L - 46 - 54,
      align: 'center',
    })

  doc.font(FONT_BOLD).fontSize(SZ_TITLE + 1)
    .text('WAGE AND INCOME TRANSCRIPT', MARGIN_L + 46, 52, {
      width: PAGE_W - MARGIN_L - 46 - 54,
      align: 'center',
    })

  doc.font(FONT_NORMAL).fontSize(SZ_BODY)
    .text(`Tax Period:  ${taxYear}`, MARGIN_L + 46, 67, { continued: false })

  rule(doc, 82, 1.5)
  rule(doc, 84)

  // Taxpayer identification block
  let y = 92
  y = labelValue(doc, 'TAXPAYER NAME:', taxpayerName.toUpperCase(), y)
  y = labelValue(doc, 'SOCIAL SECURITY NUMBER:', ssn, y)
  y = labelValue(doc, 'REQUEST DATE:', requestDate, y)
  y = labelValue(doc, 'RESPONSE DATE:', requestDate, y)
  y = labelValue(doc, 'TRACKING NUMBER:', Math.floor(Math.random() * 9e11 + 1e11).toString(), y)

  rule(doc, y + 4, 1)
  doc.y = y + 12

  return doc.y
}

// ─── W-2 wage record block ───────────────────────────────────────────────────

function writeW2Block(doc, employer, ein, wages, fedWithheld, stateCode, yearRange) {
  let y = doc.y

  // Enough room for a block? If not, new page handled by pdfkit automatically.
  y = sectionHead(doc, 'FORM W-2 WAGE AND TAX STATEMENT', doc.y)

  y = labelValue(doc, 'EMPLOYER NAME:',           employer,        y)
  y = labelValue(doc, 'EMPLOYER EIN:',             ein,             y)
  y = labelValue(doc, 'PERIOD OF EMPLOYMENT:',     yearRange,       y)
  y = labelValue(doc, 'WAGES, TIPS, OTHCOMP:',     wages,           y)
  y = labelValue(doc, 'FEDERAL TAX WITHHELD:',     fedWithheld,     y)
  y = labelValue(doc, 'STATE:',                    stateCode,       y)
  y = labelValue(doc, 'SOCIAL SECURITY WAGES:',    wages,           y)
  y = labelValue(doc, 'SOCIAL SECURITY TAX W/H:',
    `$${(parseFloat(wages.replace(/[$,]/g, '')) * 0.062).toFixed(2)}`, y)
  y = labelValue(doc, 'MEDICARE WAGES AND TIPS:',  wages,           y)
  y = labelValue(doc, 'MEDICARE TAX WITHHELD:',
    `$${(parseFloat(wages.replace(/[$,]/g, '')) * 0.0145).toFixed(2)}`, y)

  doc.y = y
  gap(doc, 8)
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function writeFooter(doc, pageNum) {
  const y = PAGE_H - 36
  rule(doc, y - 4, 0.5)
  doc.font(FONT_NORMAL).fontSize(SZ_SMALL).fillColor('#000')
    .text(
      'This Product Contains Sensitive Taxpayer Data',
      MARGIN_L, y, { width: PAGE_W - MARGIN_L * 2, align: 'center' },
    )
  doc.text(`Page ${pageNum}`, MARGIN_R - 40, y)
}

// ─── Closing boilerplate ─────────────────────────────────────────────────────

function writeClosing(doc) {
  gap(doc, 16)
  rule(doc, doc.y, 1)
  gap(doc, 8)
  doc.font(FONT_NORMAL).fontSize(SZ_SMALL)
    .text(
      '*** END OF TRANSCRIPT ***',
      MARGIN_L, doc.y, { width: PAGE_W - MARGIN_L * 2, align: 'center' },
    )
  gap(doc, 6)
  doc.font(FONT_NORMAL).fontSize(SZ_SMALL)
    .text(
      'CAUTION: THIS TRANSCRIPT SHOWS INFORMATION AS REPORTED TO IRS. ' +
      'TRANSCRIPT INFORMATION DOES NOT NECESSARILY REFLECT CHANGES MADE AFTER THE RETURN WAS PROCESSED.',
      MARGIN_L, doc.y, { width: PAGE_W - MARGIN_L * 2, align: 'justify' },
    )
}

// ─── Transcript 1 — multi_job_transcript.pdf ─────────────────────────────────

function createMultiJobTranscript() {
  const filePath = path.join(OUT_DIR, 'multi_job_transcript.pdf')
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 30, bottom: 30, left: 54, right: 54 }, autoFirstPage: true })
  doc.pipe(fs.createWriteStream(filePath))

  writePageHeader(doc, '04/15/2024', '2015–2023', 'JOHN A TESTPERSON', '***-**-4321')

  // Four real large employers with genuine EINs
  const employers = [
    {
      name:        'WALMART INC',
      ein:         '71-0415188',
      wages:       '$42,150.00',
      withheld:    '$4,320.00',
      state:       'AR',
      years:       '2015-2018',
    },
    {
      name:        'AMAZON.COM SERVICES LLC',
      ein:         '82-0544687',
      wages:       '$78,400.00',
      withheld:    '$9,870.00',
      state:       'WA',
      years:       '2018-2020',
    },
    {
      name:        'JPMORGAN CHASE BANK NA',
      ein:         '13-4994650',
      wages:       '$95,200.00',
      withheld:    '$14,560.00',
      state:       'NY',
      years:       '2020-2022',
    },
    {
      name:        'STARBUCKS CORPORATION',
      ein:         '91-1325671',
      wages:       '$62,800.00',
      withheld:    '$7,900.00',
      state:       'WA',
      years:       '2022-2023',
    },
  ]

  for (const emp of employers) {
    writeW2Block(doc, emp.name, emp.ein, emp.wages, emp.withheld, emp.state, emp.years)
  }

  writeClosing(doc)
  writeFooter(doc, 1)
  doc.end()
  console.log('  ✓  multi_job_transcript.pdf')
}

// ─── Transcript 2 — single_job_transcript.pdf ────────────────────────────────

function createSingleJobTranscript() {
  const filePath = path.join(OUT_DIR, 'single_job_transcript.pdf')
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 30, bottom: 30, left: 54, right: 54 }, autoFirstPage: true })
  doc.pipe(fs.createWriteStream(filePath))

  writePageHeader(doc, '04/15/2024', '2019–2023', 'JANE B SAMPLEUSER', '***-**-8765')

  writeW2Block(
    doc,
    "MCDONALD'S CORPORATION",
    '36-3119200',
    '$38,900.00',
    '$3,720.00',
    'IL',
    '2019-2023',
  )

  writeClosing(doc)
  writeFooter(doc, 1)
  doc.end()
  console.log('  ✓  single_job_transcript.pdf')
}

// ─── Transcript 3 — redacted_ein_transcript.pdf ──────────────────────────────
// Mirrors real IRS redaction: EIN becomes XX-XXX#### (last 4 digits visible).
// Employer names are truncated at 35 characters as the IRS W-2 field allows.

function createRedactedEinTranscript() {
  const filePath = path.join(OUT_DIR, 'redacted_ein_transcript.pdf')
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 30, bottom: 30, left: 54, right: 54 }, autoFirstPage: true })
  doc.pipe(fs.createWriteStream(filePath))

  writePageHeader(doc, '04/15/2024', '2016–2023', 'ROBERT C REDACTEDTEST', '***-**-9999')

  // Names intentionally truncated at ≤35 chars; EINs in XX-XXX#### format
  const employers = [
    {
      // "TARGET CORPORATION" → fits; EIN 33-0079610 → redacted XX-XXX9610
      name:     'TARGET CORPORATION',
      ein:      'XX-XXX9610',
      wages:    '$31,200.00',
      withheld: '$3,010.00',
      state:    'MN',
      years:    '2016-2018',
    },
    {
      // "HOME DEPOT U.S.A. INC" truncated to 35 chars is "HOME DEPOT U.S.A. INC" (fine); EIN XX-XXX8557
      name:     'HOME DEPOT U.S.A. INC',
      ein:      'XX-XXX8557',
      wages:    '$44,700.00',
      withheld: '$4,950.00',
      state:    'GA',
      years:    '2018-2021',
    },
    {
      // Long name truncated: "UNITED PARCEL SERVICE OF AME" (35 chars from "UNITED PARCEL SERVICE OF AMERICA INC")
      name:     'UNITED PARCEL SERVICE OF AME',
      ein:      'XX-XXX6083',
      wages:    '$58,100.00',
      withheld: '$7,200.00',
      state:    'GA',
      years:    '2021-2023',
    },
  ]

  gap(doc, 6)
  doc.font(FONT_NORMAL).fontSize(SZ_SMALL)
    .text(
      'NOTE: Employer Identification Numbers have been masked per IRC § 6103(c). ' +
      'Employer names are shown as reported and may be truncated.',
      MARGIN_L, doc.y, { width: PAGE_W - MARGIN_L * 2, align: 'justify' },
    )
  gap(doc, 10)

  for (const emp of employers) {
    writeW2Block(doc, emp.name, emp.ein, emp.wages, emp.withheld, emp.state, emp.years)
  }

  writeClosing(doc)
  writeFooter(doc, 1)
  doc.end()
  console.log('  ✓  redacted_ein_transcript.pdf')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`Writing test transcripts to: ${OUT_DIR}\n`)
createMultiJobTranscript()
createSingleJobTranscript()
createRedactedEinTranscript()
console.log('\nDone.')
