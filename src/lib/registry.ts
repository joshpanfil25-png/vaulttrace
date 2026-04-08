export interface RegistryMatch {
  plan_name: string
  account_type: string
  state: string
  amount_if_known: string | null
}

export interface RegistryResult {
  matches: RegistryMatch[]
  registry_urls: string[]
  found: boolean
}

const STATE_REGISTRY_URLS: string[] = [
  'https://ucpd.sco.ca.gov/uidb-web/search.xhtml',           // California
  'https://www.osc.state.ny.us/unclaimed-funds',              // New York
  'https://www.claimittexas.org',                             // Texas
  'https://www.fltreasurehunt.gov',                           // Florida
  'https://icash.illinoistreasurer.gov',                      // Illinois
]

function extractTextBetween(html: string, start: string, end: string): string | null {
  const si = html.indexOf(start)
  if (si === -1) return null
  const ei = html.indexOf(end, si + start.length)
  if (ei === -1) return null
  return html.slice(si + start.length, ei).replace(/<[^>]+>/g, '').trim()
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()
}

function parseRetirementBenefitsHtml(html: string): RegistryMatch[] {
  const matches: RegistryMatch[] = []

  // The site lists results in rows/cards; attempt to find repeated result blocks.
  // Common patterns: table rows, divs with class "result", "match", "account", etc.
  const rowPattern = /<tr[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  let m: RegExpExecArray | null

  while ((m = rowPattern.exec(html)) !== null) {
    const row = m[1]
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripTags(c[1]),
    )
    if (cells.length >= 2) {
      matches.push({
        plan_name: cells[0] || 'Unknown Plan',
        account_type: cells[1] || 'Retirement Account',
        state: cells[2] || '',
        amount_if_known: cells[3] || null,
      })
    }
  }

  if (matches.length > 0) return matches

  // Fallback: look for card/div-based result listings
  const cardPattern =
    /<div[^>]*class="[^"]*(?:result|match|account|plan|benefit)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi

  while ((m = cardPattern.exec(html)) !== null) {
    const card = m[1]

    const planName =
      extractTextBetween(card, 'plan-name">', '<') ||
      extractTextBetween(card, 'plan_name">', '<') ||
      extractTextBetween(card, '<h', '>') ||
      null

    if (!planName) continue

    const accountType =
      extractTextBetween(card, 'account-type">', '<') ||
      extractTextBetween(card, 'account_type">', '<') ||
      'Retirement Account'

    const state =
      extractTextBetween(card, 'state">', '<') ||
      extractTextBetween(card, 'State:</span>', '<') ||
      ''

    const amount =
      extractTextBetween(card, 'amount">', '<') ||
      extractTextBetween(card, 'Amount:</span>', '<') ||
      null

    matches.push({
      plan_name: planName,
      account_type: accountType ?? 'Retirement Account',
      state: state ?? '',
      amount_if_known: amount,
    })
  }

  return matches
}

export interface PbgcPlan {
  plan_name: string
  employer_name: string
  plan_number: string | null
  state: string | null
  status: string | null
}

export interface PbgcResult {
  plans: PbgcPlan[]
  found: boolean
}

const PBGC_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; VaultTrace/1.0)',
  Accept: 'text/html,application/xhtml+xml',
}

// Identifies a PBGC search result block as pension-plan related
const PLAN_BLOCK_RE =
  /pension\s+plan|trusteed\s+plan|defined[\s-]benefit|retirement\s+plan|pbgc.*plan|plan.*terminated/i

/**
 * Parses Drupal-generated PBGC site-search HTML.
 * Results page at /search-all?key=QUERY renders <li class="search-result"> blocks,
 * each containing an <h3><a> title and a <p class="search-snippet"> description.
 */
function parsePbgcSearchHtml(html: string, employerName: string): PbgcPlan[] {
  const plans: PbgcPlan[] = []

  // Match individual search-result list items
  const itemRe = /<li[^>]*class="[^"]*search-result[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
  let m: RegExpExecArray | null

  while ((m = itemRe.exec(html)) !== null) {
    const block = m[1]
    if (!PLAN_BLOCK_RE.test(block)) continue

    // Title lives in <h3><a href="...">Title Text</a></h3>
    const titleMatch = block.match(/<h[23][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : null
    if (!title) continue

    // Snippet gives us context for status inference
    const snippetMatch = block.match(/<p[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/p>/i)
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : ''

    const status = /terminat/i.test(snippet)
      ? 'Terminated'
      : /trustee/i.test(snippet)
        ? 'Trusteed by PBGC'
        : null

    plans.push({
      plan_name: title,
      employer_name: employerName,
      plan_number: null,
      state: null,
      status,
    })
  }

  return plans
}

/**
 * Searches the PBGC public site for terminated/trusteed defined-benefit pension
 * plans associated with the given employer name.
 *
 * PBGC only covers defined-benefit pensions it has taken over — not 401(k)s.
 * Uses the PBGC Drupal site-search (/search-all?key=) and filters results to
 * plan-related pages. Returns an empty result rather than throwing on any error.
 */
export async function searchPBGC(employerName: string): Promise<PbgcResult> {
  const empty: PbgcResult = { plans: [], found: false }
  if (!employerName.trim()) return empty

  const url = `https://www.pbgc.gov/search-all?key=${encodeURIComponent(employerName.trim())}`

  let html: string
  try {
    const res = await fetch(url, {
      headers: PBGC_HEADERS,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return empty
    html = await res.text()
  } catch {
    return empty
  }

  const plans = parsePbgcSearchHtml(html, employerName)
  return { plans, found: plans.length > 0 }
}

export async function searchBySSN(ssn: string): Promise<RegistryResult> {
  const empty: RegistryResult = { matches: [], registry_urls: STATE_REGISTRY_URLS, found: false }

  const searchUrl = `https://www.unclaimedretirementbenefits.com/search?ssn=${encodeURIComponent(ssn)}`

  let html: string
  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VaultTrace/1.0)',
        Accept: 'text/html',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return empty
    html = await res.text()
  } catch {
    return empty
  }

  const matches = parseRetirementBenefitsHtml(html)

  return {
    matches,
    registry_urls: STATE_REGISTRY_URLS,
    found: matches.length > 0,
  }
}
