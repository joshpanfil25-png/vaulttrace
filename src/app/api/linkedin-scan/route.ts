import { NextRequest, NextResponse } from 'next/server'
import { checkDolFilingByName } from '@/lib/dol'
import { searchPBGC } from '@/lib/registry'
import { searchUnclaimedByEmployer } from '@/lib/unclaimed'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitizeEmail, sanitizeEmployerName, sanitizeYear } from '@/lib/sanitize'
import type { EmployerResult } from '@/components/ResultsDashboard'

interface IncomingEmployer {
  name: string
  years_from: string
  years_to: string
}

interface RequestBody {
  employers?: IncomingEmployer[]
  email?: string
}

function parseYear(s: string): number | null {
  const m = s.match(/(\d{4})/)
  return m ? parseInt(m[1]) : null
}

/**
 * Confidence score for name-only DOL searches.
 * Same signals as lookup-employers, but capped at 80 and with a -15 name-only penalty.
 *
 *   DOL 5500 found                        +40
 *   └─ last filing year ≥ 2020            +10
 *   └─ filing year within employment span +10
 *   PBGC match found                      +15
 *   State unclaimed property match        +10
 *   Employer name > 20 chars              −10
 *   Name-only search penalty              −15
 *   Cap                                    80
 */
function computeConfidenceScore(
  emp: IncomingEmployer,
  result: Omit<EmployerResult, 'confidence_score'>,
): number {
  let score = 0

  if (result.has_401k) {
    score += 40
    if (result.last_filing_year && result.last_filing_year >= 2020) score += 10

    const from = parseYear(emp.years_from)
    const to   = parseYear(emp.years_to)
    if (result.last_filing_year && from !== null) {
      const end = to ?? from
      if (result.last_filing_year >= from && result.last_filing_year <= end + 3) score += 10
    }
  }

  if (result.pbgc_plans && result.pbgc_plans.length > 0)                        score += 15
  if (result.unclaimed_states?.some((s) => s.properties.length > 0))            score += 10
  if (emp.name.trim().length > 20)                                               score -= 10

  // Name-only penalty — no EIN available so match precision is lower
  score -= 15

  return Math.max(0, Math.min(score, 80))
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientIp(req))
  if (limited) return limited

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = sanitizeEmail(body.email)
  const raw   = body.employers

  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: 'employers array is required' }, { status: 400 })
  }

  // Sanitize and filter out rows with empty names
  const employers = raw
    .map((e) => ({
      name:       sanitizeEmployerName(e.name),
      years_from: sanitizeYear(e.years_from),
      years_to:   sanitizeYear(e.years_to),
    }))
    .filter((e) => e.name.length > 0)
  if (employers.length === 0) {
    return NextResponse.json({ error: 'At least one employer name is required' }, { status: 400 })
  }

  const results: EmployerResult[] = await Promise.all(
    employers.map(async (emp): Promise<EmployerResult> => {
      const [dol, pbgc, unclaimed] = await Promise.all([
        checkDolFilingByName(emp.name.trim()),
        searchPBGC(emp.name.trim()),
        searchUnclaimedByEmployer(emp.name.trim()),
      ])

      const partial: Omit<EmployerResult, 'confidence_score'> = {
        employer_name:      emp.name.trim(),
        ein:                null,
        has_401k:           dol?.filed5500 ?? false,
        has_redacted_ein:   false,
        plan_name:          dol?.planName ?? null,
        last_filing_year:   dol?.mostRecentFilingYear ?? null,
        registry_confirmed: false,
        pbgc_plans:         pbgc.plans,
        unclaimed_states:   unclaimed.states,
      }

      return { ...partial, confidence_score: computeConfidenceScore(emp, partial) }
    }),
  )

  // Persist to Supabase — non-blocking
  if (email) {
    const pbgcMatches     = results.flatMap((r) => r.pbgc_plans ?? [])
    const unclaimedMatches = results.flatMap(
      (r) => (r.unclaimed_states ?? []).flatMap((s) => s.properties),
    )
    const { error: dbError } = await supabase.from('scans').insert({
      email,
      employers: employers.map((e) => ({
        employer_name: e.name.trim(),
        ein: null,
        years_employed: [e.years_from, e.years_to].filter(Boolean).join('–'),
      })),
      matches:          results.filter((r) => r.has_401k),
      registry_matches: [],
      registry_urls:    [],
      pbgc_matches:     pbgcMatches,
      unclaimed_matches: unclaimedMatches,
      linkedin_import:  true,
      scan_type:        'quick',
      scanned_at:       new Date().toISOString(),
    })
    if (dbError) console.error('Supabase insert error:', dbError.message)
  }

  return NextResponse.json({ results, scan_type: 'quick' })
}
