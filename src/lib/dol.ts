// DOL EFAST2 Form 5500 lookup
//
// Old endpoint (dead — DNS no longer resolves):
//   https://efts.dol.gov/EFAST2/search  (Elasticsearch)
//
// Current endpoint (Amazon CloudSearch, discovered from efast.dol.gov/5500Search/main.js):
//   https://www.efast.dol.gov/services/afs?q.parser=lucene&q=...&size=N&sort=planyear+desc
//
// Key differences from the old API:
//   - Response shape: hits.hit[]  (not hits.hits[])
//   - Fields:         hit.fields.planname / plansponsor / planyear  (not _source.plan_name)
//   - EIN format:     no dashes — "710415188" not "71-0415188"
//   - Sort param:     sort=planyear+desc  (no dateRange param)

const BASE = 'https://www.efast.dol.gov/services/afs'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; VaultTrace/1.0)',
  Referer: 'https://www.efast.dol.gov/5500Search/',
}

export interface DolResult {
  filed5500: boolean
  planName: string | null
  mostRecentFilingYear: number | null
}

// Retirement-plan keywords used to prefer 401(k)/pension hits over health/welfare plans
const RETIREMENT_RE = /401\s*\(?k\)?|pension|profit.?shar|retirement|deferred.?comp|esop|employee.?stock/i

interface CloudSearchHit {
  id: string
  fields: Record<string, string>
}

interface CloudSearchResponse {
  hits?: {
    found: number
    start: number
    hit: CloudSearchHit[]
  }
  error?: { message: string }
  message?: string
}

function pickBestHit(hits: CloudSearchHit[]): CloudSearchHit | null {
  if (hits.length === 0) return null
  // Prefer a retirement plan; fall back to whatever is most recent (hits already sorted desc)
  return hits.find((h) => RETIREMENT_RE.test(h.fields.planname ?? '')) ?? hits[0]
}

async function queryEfast2(q: string): Promise<DolResult | null> {
  const url =
    `${BASE}?q.parser=lucene` +
    `&q=${encodeURIComponent(q)}` +
    `&size=20` +
    `&sort=planyear+desc`

  let data: CloudSearchResponse
  try {
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 86400 } })
    if (!res.ok) return null
    data = (await res.json()) as CloudSearchResponse
  } catch {
    return null
  }

  if (data.error || !data.hits || data.hits.found === 0) {
    return { filed5500: false, planName: null, mostRecentFilingYear: null }
  }

  const best = pickBestHit(data.hits.hit)
  if (!best) return { filed5500: false, planName: null, mostRecentFilingYear: null }

  const year = parseInt(best.fields.planyear ?? '', 10)

  return {
    filed5500: true,
    planName: best.fields.planname ?? best.fields.plansponsor ?? null,
    mostRecentFilingYear: isNaN(year) ? null : year,
  }
}

/** Look up Form 5500 filings by EIN (dashes are stripped automatically). */
export async function checkDolFiling(ein: string): Promise<DolResult | null> {
  const bare = ein.replace(/-/g, '')
  return queryEfast2(`ein:${bare}`)
}

/** Look up Form 5500 filings by employer name (used when EIN is redacted). */
export async function checkDolFilingByName(employerName: string): Promise<DolResult | null> {
  return queryEfast2(employerName)
}
