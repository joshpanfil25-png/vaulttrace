// src/lib/unclaimed.ts
//
// Searches the 10 most-populated-state unclaimed property portals for
// retirement accounts held (reported) by a given employer name.
//
// API landscape (confirmed 2026-04):
//   - No state exposes an official public JSON API for holder searches.
//   - CA, PA, GA use the Great Plains SaaS platform (/en/Property/SearchIndex)
//     — its backend REST API is queried directly.
//   - FL uses a Java ControlServlet that returns server-rendered HTML.
//   - NY, TX, IL, OH, NC, MI all use JS-heavy SPAs that cannot be scraped
//     server-side; these states return a pre-filled URL only (searched: false).
//
// Every state always returns a `search_url` so the user can verify results
// in-browser regardless of whether automated search succeeded.

export interface UnclaimedProperty {
  owner_name: string | null
  holder_name: string
  property_type: string          // may be a NAUPA code (IR01) or a label
  amount_if_known: string | null
  report_date: string | null
}

export interface StateSearchResult {
  state: string
  state_abbr: string
  search_url: string      // pre-filled deep-link for manual verification
  properties: UnclaimedProperty[]
  searched: boolean       // true only when we actually parsed a response
}

export interface UnclaimedSearchResult {
  states: StateSearchResult[]
  total_found: number
}

// ─── Shared constants ────────────────────────────────────────────────────────

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; VaultTrace/1.0)',
  Accept: 'application/json, text/html, */*',
}

// NAUPA-standard retirement property type codes
const RETIREMENT_CODES = new Set(['IR01', 'IR02', 'IR03', 'IR04', 'IR05', 'IR06', 'MS14'])

// Keyword fallback when the portal returns a text label rather than a NAUPA code
const RETIREMENT_RE =
  /\b(ira|individual retirement|roth|401\(k\)|401k|403\(b\)|pension|profit.?shar|annuity|keogh|deferred.?comp|retirement)\b/i

function isRetirementType(propertyType: string): boolean {
  const upper = propertyType.trim().toUpperCase()
  if (RETIREMENT_CODES.has(upper)) return true
  return RETIREMENT_RE.test(propertyType)
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

// ─── Great Plains SaaS platform (CA, PA, GA) ─────────────────────────────────
//
// These three states all license the same Great Plains unclaimed-property SaaS.
// The portal renders at /en/Property/SearchIndex but calls a REST backend at
// /api/Property/Search.  Results are JSON; property objects include holderName,
// propertyType (NAUPA code), amount, reportDate, and ownerName.

interface GpProperty {
  ownerName?: string
  holderName?: string
  propertyType?: string
  amount?: string | number
  reportDate?: string
  reportedDate?: string
}

interface GpResponse {
  properties?: GpProperty[]
  results?: GpProperty[]
  data?: GpProperty[]
  totalCount?: number
}

async function searchGreatPlains(
  apiBase: string,
  holderName: string,
): Promise<UnclaimedProperty[] | null> {
  const params = new URLSearchParams({
    holderName: holderName.trim(),
    propertyTypes: 'IR01,IR02,IR03,IR04,IR05,IR06,MS14',
    page: '1',
    pageSize: '50',
  })

  let json: GpResponse
  try {
    const res = await fetch(`${apiBase}/api/Property/Search?${params}`, {
      headers: { ...FETCH_HEADERS, Accept: 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('json')) return null
    json = (await res.json()) as GpResponse
  } catch {
    return null
  }

  const rows: GpProperty[] =
    json.properties ?? json.results ?? json.data ?? []

  return rows
    .filter((p) => isRetirementType(p.propertyType ?? ''))
    .map((p) => ({
      owner_name: p.ownerName ?? null,
      holder_name: p.holderName ?? holderName,
      property_type: p.propertyType ?? 'Retirement Account',
      amount_if_known: p.amount != null ? String(p.amount) : null,
      report_date: p.reportDate ?? p.reportedDate ?? null,
    }))
}

// ─── Florida ─────────────────────────────────────────────────────────────────
//
// Florida's FLTreasureHunt runs on a Java ControlServlet that server-renders
// HTML result tables.  The holder search form POSTs to the same ControlServlet
// with ActionForm=SearchResults and HolderName in the body.

async function searchFlorida(holderName: string): Promise<UnclaimedProperty[] | null> {
  const body = new URLSearchParams({
    ActionForm:  'SearchResults',
    SearchBy:    'H',              // H = holder / company name
    HolderName:  holderName.trim(),
    PropertyType: '',              // empty = all types
    PageSize:    '50',
    CurrentPage: '1',
  })

  let html: string
  try {
    const res = await fetch('https://www.fltreasurehunt.gov/ControlServlet', {
      method: 'POST',
      headers: {
        ...FETCH_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    html = await res.text()
  } catch {
    return null
  }

  // Results are in a <table> with rows: owner name | holder name | property type | amount | date
  const properties: UnclaimedProperty[] = []
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let m: RegExpExecArray | null

  while ((m = rowRe.exec(html)) !== null) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripTags(c[1]),
    )
    if (cells.length < 3) continue
    // Skip header rows (all caps or empty first cell)
    if (!cells[0] || cells[0].toUpperCase() === cells[0]) continue

    const propertyType = cells[2] ?? ''
    if (!isRetirementType(propertyType)) continue

    properties.push({
      owner_name: cells[0] || null,
      holder_name: cells[1] || holderName,
      property_type: propertyType,
      amount_if_known: cells[3] || null,
      report_date: cells[4] || null,
    })
  }

  return properties
}

// ─── State configuration ─────────────────────────────────────────────────────

interface StateConfig {
  name: string
  abbr: string
  /** Returns a pre-filled URL for manual holder-name search in-browser. */
  manualUrl: (h: string) => string
  /**
   * Attempts automated search.  Returns an array of matching properties, an
   * empty array (no matches), or null (automation not possible / failed).
   */
  search: (h: string) => Promise<UnclaimedProperty[] | null>
}

const STATES: StateConfig[] = [
  // ── Great Plains SaaS platform ──────────────────────────────────────────
  {
    name: 'California',
    abbr: 'CA',
    manualUrl: (h) =>
      `https://ucpi.sco.ca.gov/en/Property/SearchIndex?HolderName=${encodeURIComponent(h)}`,
    search: (h) => searchGreatPlains('https://ucpi.sco.ca.gov', h),
  },
  {
    name: 'Pennsylvania',
    abbr: 'PA',
    manualUrl: (h) =>
      `https://unclaimedproperty.patreasury.gov/en/property/searchindex?HolderName=${encodeURIComponent(h)}`,
    search: (h) => searchGreatPlains('https://unclaimedproperty.patreasury.gov', h),
  },
  {
    name: 'Georgia',
    abbr: 'GA',
    manualUrl: (h) =>
      `https://gaclaims.unclaimedproperty.com/en/Property/SearchIndex?HolderName=${encodeURIComponent(h)}`,
    search: (h) => searchGreatPlains('https://gaclaims.unclaimedproperty.com', h),
  },

  // ── Florida (server-rendered Java servlet) ───────────────────────────────
  {
    name: 'Florida',
    abbr: 'FL',
    manualUrl: (h) =>
      `https://www.fltreasurehunt.gov/ControlServlet?ActionForm=GotoNewPublicSearch&HolderName=${encodeURIComponent(h)}`,
    search: searchFlorida,
  },

  // ── SPA-only portals (deep-link only; searched: false) ───────────────────
  {
    name: 'New York',
    abbr: 'NY',
    manualUrl: (h) =>
      `https://ouf.osc.ny.gov/app/claim-search#holderName=${encodeURIComponent(h)}`,
    search: () => Promise.resolve(null),
  },
  {
    name: 'Texas',
    abbr: 'TX',
    manualUrl: (h) =>
      `https://www.claimittexas.gov/app/claim-search#holderName=${encodeURIComponent(h)}`,
    search: () => Promise.resolve(null),
  },
  {
    name: 'Illinois',
    abbr: 'IL',
    manualUrl: (h) =>
      `https://icash.illinoistreasurer.gov/app/claim-search#holderName=${encodeURIComponent(h)}`,
    search: () => Promise.resolve(null),
  },
  {
    name: 'Ohio',
    abbr: 'OH',
    manualUrl: (h) =>
      `https://unclaimedfunds.ohio.gov/app/claim-search#holderName=${encodeURIComponent(h)}`,
    search: () => Promise.resolve(null),
  },
  {
    name: 'North Carolina',
    abbr: 'NC',
    manualUrl: (h) =>
      `https://unclaimed.nccash.gov/app/claim-search#holderName=${encodeURIComponent(h)}`,
    search: () => Promise.resolve(null),
  },
  {
    name: 'Michigan',
    abbr: 'MI',
    manualUrl: (h) =>
      `https://unclaimedproperty.michigan.gov/app/claim-search#holderName=${encodeURIComponent(h)}`,
    search: () => Promise.resolve(null),
  },
]

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Searches the top-10-populated-state unclaimed property portals for
 * retirement accounts reported by the given employer (holder) name.
 *
 * All 10 states are queried in parallel.  Each result includes a pre-filled
 * `search_url` the user can open to manually verify / search further.
 * `searched: true` means we successfully queried and parsed the portal;
 * `searched: false` means the portal uses a client-side SPA we cannot scrape
 * and the user should follow the `search_url` to check manually.
 */
export async function searchUnclaimedByEmployer(
  employerName: string,
): Promise<UnclaimedSearchResult> {
  const trimmed = employerName.trim()
  if (!trimmed) {
    return { states: [], total_found: 0 }
  }

  const settled = await Promise.allSettled(
    STATES.map(async (cfg): Promise<StateSearchResult> => {
      const [searchResult] = await Promise.allSettled([cfg.search(trimmed)])
      const properties =
        searchResult.status === 'fulfilled' && searchResult.value !== null
          ? searchResult.value
          : []
      const searched =
        searchResult.status === 'fulfilled' && searchResult.value !== null

      return {
        state: cfg.name,
        state_abbr: cfg.abbr,
        search_url: cfg.manualUrl(trimmed),
        properties,
        searched,
      }
    }),
  )

  const states: StateSearchResult[] = settled
    .filter((r): r is PromiseFulfilledResult<StateSearchResult> => r.status === 'fulfilled')
    .map((r) => r.value)

  const total_found = states.reduce((n, s) => n + s.properties.length, 0)

  return { states, total_found }
}
