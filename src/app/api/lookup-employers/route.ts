import { NextRequest, NextResponse } from 'next/server'
import { checkDolFiling, checkDolFilingByName } from '@/lib/dol'
import { searchBySSN, searchPBGC, RegistryResult } from '@/lib/registry'
import { searchUnclaimedByEmployer } from '@/lib/unclaimed'
import { lookupEINByName, extractEINSuffix } from '@/lib/ein-lookup'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitizeEmail, sanitizeEmployerName, sanitizeString } from '@/lib/sanitize'
import type { EmployerResult } from '@/components/ResultsDashboard'

interface IncomingEmployer {
  employer_name: string
  ein: string | null
  has_redacted_ein?: boolean
  years_employed?: string
}

interface RequestBody {
  email?: string
  employers?: IncomingEmployer[]
  ssn?: string
  /** When true, employers came from LinkedIn (no EINs). Use name-only DOL search. */
  linkedin_import?: boolean
}

/**
 * Parses a years-employed string ("2018-2022", "2019–2023", or bare "2021")
 * into an inclusive [start, end] tuple, or null if unparseable.
 */
function parseYearRange(s: string | undefined): [number, number] | null {
  if (!s) return null
  const range = s.match(/(\d{4})\s*[-–]\s*(\d{4})/)
  if (range) return [parseInt(range[1]), parseInt(range[2])]
  const single = s.match(/(\d{4})/)
  if (single) { const y = parseInt(single[1]); return [y, y] }
  return null
}

/**
 * Confidence score (0–95) based on data quality signals.
 *
 *   DOL 5500 found                        +40
 *   └─ last filing year ≥ 2020            +10 (plan still recent/active)
 *   └─ filing year within employment span +10 (confirms participant eligibility)
 *   EIN not redacted                      +20
 *   PBGC match found                      +15
 *   SSN registry confirmed                +15
 *   State unclaimed property match        +10
 *   Employer name > 20 chars              −10 (IRS W-2 truncation risk)
 *   Cap                                    95
 */
function computeConfidenceScore(
  emp: IncomingEmployer,
  result: Omit<EmployerResult, 'confidence_score'>,
): number {
  let score = 0

  if (result.has_401k) {
    score += 40
    // Recent filing: plan was still active in the modern era
    if (result.last_filing_year && result.last_filing_year >= 2020) score += 10
    // Employment overlap: the plan was filing during the person's tenure
    // (allow +3-year lag because Form 5500 filings trail the plan year)
    const span = parseYearRange(emp.years_employed)
    if (result.last_filing_year && span) {
      const [start, end] = span
      if (result.last_filing_year >= start && result.last_filing_year <= end + 3) score += 10
    }
  }

  if (emp.ein && !emp.has_redacted_ein)                          score += 20
  if (result.pbgc_plans && result.pbgc_plans.length > 0)        score += 15
  if (result.registry_confirmed)                                  score += 15
  if (result.unclaimed_states?.some((s) => s.properties.length > 0)) score += 10
  // IRS W-2 employer name field truncates at 35 chars; names > 20 chars
  // are long enough to have been silently cut, reducing name-match confidence
  if (emp.employer_name.trim().length > 20)                      score -= 10

  return Math.min(score, 95)
}

/** Returns true if the registry plan name is plausibly linked to the employer. */
function planMatchesEmployer(planName: string, employerName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const plan = norm(planName)
  const emp  = norm(employerName)
  // Accept if either contains the other (handles "Acme Corp 401(k) Plan" ↔ "Acme Corp")
  return plan.includes(emp) || emp.includes(plan)
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

  const email          = sanitizeEmail(body.email)
  const ssn            = sanitizeString(body.ssn, 11)
  const linkedin_import = body.linkedin_import === true
  const rawEmployers   = body.employers

  if (!Array.isArray(rawEmployers) || rawEmployers.length === 0) {
    return NextResponse.json({ error: 'employers array is required' }, { status: 400 })
  }

  // Sanitize each employer record
  const employers: IncomingEmployer[] = rawEmployers.map((e) => ({
    employer_name:    sanitizeEmployerName(e.employer_name),
    ein:              e.ein ? sanitizeString(e.ein, 20) : null,
    has_redacted_ein: e.has_redacted_ein === true,
    years_employed:   sanitizeString(e.years_employed, 20),
  })).filter((e) => e.employer_name.length > 0)

  // Run DOL + PBGC lookups per employer and optional SSN registry search — all in parallel
  const [dolResults, registryResult] = await Promise.all([
    Promise.all(
      employers.map(async (emp): Promise<EmployerResult> => {
        // LinkedIn imports have no EINs; skip EIN recovery entirely.
        // IRS imports: attempt local EIN recovery for redacted EINs before hitting DOL API.
        let resolvedEin = emp.ein
        if (!linkedin_import && emp.has_redacted_ein) {
          const suffix = emp.ein ? extractEINSuffix(emp.ein) : null
          const match  = lookupEINByName(emp.employer_name, suffix ?? undefined)
          if (match) resolvedEin = match.ein
        }

        // Choose DOL strategy:
        //   linkedin_import → name-only search (no EIN available)
        //   clear/recovered EIN     → precise EIN lookup
        //   redacted EIN, no match  → name fallback
        //   no EIN, not linkedin    → skip (plan lookup would be noise)
        const dolPromise = linkedin_import
          ? checkDolFilingByName(emp.employer_name)
          : resolvedEin && (!emp.has_redacted_ein || resolvedEin !== emp.ein)
            ? checkDolFiling(resolvedEin)
            : emp.has_redacted_ein
              ? checkDolFilingByName(emp.employer_name)
              : Promise.resolve(null)

        // DOL, PBGC, and state unclaimed property all run concurrently per employer
        const [dol, pbgc, unclaimed] = await Promise.all([
          dolPromise,
          searchPBGC(emp.employer_name),
          searchUnclaimedByEmployer(emp.employer_name),
        ])

        // No-EIN, non-LinkedIn employers: DOL search would be unreliable; skip result.
        if (!emp.ein && !emp.has_redacted_ein && !linkedin_import) {
          return {
            employer_name: emp.employer_name,
            ein: null,
            has_401k: false,
            has_redacted_ein: false,
            plan_name: null,
            last_filing_year: null,
            registry_confirmed: false,
            confidence_score: 0,
            pbgc_plans: pbgc.plans,
            unclaimed_states: unclaimed.states,
          }
        }

        return {
          employer_name: emp.employer_name,
          ein: emp.ein,
          has_401k: dol?.filed5500 ?? false,
          has_redacted_ein: emp.has_redacted_ein ?? false,
          plan_name: dol?.planName ?? null,
          last_filing_year: dol?.mostRecentFilingYear ?? null,
          registry_confirmed: false,
          confidence_score: 0, // recalculated below after registry annotation
          pbgc_plans: pbgc.plans,
          unclaimed_states: unclaimed.states,
        }
      }),
    ),
    ssn ? searchBySSN(ssn) : Promise.resolve<RegistryResult>({ matches: [], registry_urls: [], found: false }),
  ])

  // Annotate registry_confirmed then compute final confidence score
  const results: EmployerResult[] = dolResults.map((r, i) => {
    const emp = employers[i]
    const confirmed =
      registryResult.found &&
      registryResult.matches.some((m) => planMatchesEmployer(m.plan_name, r.employer_name))
    const annotated = confirmed ? { ...r, registry_confirmed: true } : r
    return { ...annotated, confidence_score: computeConfidenceScore(emp, annotated) }
  })

  // Persist to Supabase — non-blocking; don't fail the request on DB errors
  if (email) {
    const pbgcMatches = results.flatMap((r) => r.pbgc_plans ?? [])
    const unclaimedMatches = results.flatMap(
      (r) => (r.unclaimed_states ?? []).flatMap((s) => s.properties),
    )
    const { error: dbError } = await supabase.from('scans').insert({
      email,
      employers,
      matches: results.filter((r) => r.has_401k),
      registry_matches: registryResult.matches,
      registry_urls: registryResult.registry_urls,
      pbgc_matches: pbgcMatches,
      unclaimed_matches: unclaimedMatches,
      linkedin_import: linkedin_import ?? false,
      scan_type: 'full',
      scanned_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error('Supabase insert error:', dbError.message)
    }
  }

  return NextResponse.json({ results, registry: registryResult, linkedin_import: linkedin_import ?? false })
}
