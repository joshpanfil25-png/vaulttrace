/**
 * Local EIN database for major US employers.
 *
 * All entries verified against the DOL EFAST2 Form 5500 database
 * (www.efast.dol.gov/services/afs) in March 2026 — each EIN confirmed to
 * return active retirement-plan filings for the named sponsor.
 *
 * IMPORTANT NOTES:
 *  • W-2 EINs are the *operating entity*, not always the public parent.
 *    e.g. Amazon W-2s come from "Amazon.com Services LLC" (82-0544687),
 *    not Amazon.com Inc (91-1646860, the SEC registrant).
 *  • Large employers frequently file under multiple EINs for subsidiaries.
 *    The EIN here is for the primary plan sponsor / largest filing entity.
 *  • To expand this list, download the EFAST2 bulk datasets from
 *    dol.gov/agencies/ebsa/about-ebsa/our-activities/public-disclosure/foia/form-5500-datasets
 *    and filter for plans with > 1,000 participants.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EinRecord {
  ein: string
  /** Canonical name as it appears in EFAST2 / SEC filings */
  name: string
  /** Alternative name forms (brand names, former names, common abbreviations) */
  aliases?: string[]
}

export interface EinMatch {
  ein: string
  name: string
  score: number   // 0–1, higher = more confident
}

// ─── Database ─────────────────────────────────────────────────────────────────

const EIN_DB: EinRecord[] = [
  // ── Retail / Consumer ──────────────────────────────────────────────────────
  { ein: '71-0415188', name: 'Walmart Inc',                    aliases: ['Walmart Stores', 'Wal-Mart', 'Walmart'] },
  { ein: '31-0345740', name: 'The Kroger Co',                  aliases: ['Kroger', 'Kroger Company'] },
  { ein: '95-4419041', name: 'The Home Depot Inc',             aliases: ['Home Depot', 'HomeDepot', 'Home Depot USA'] },
  { ein: '41-0215170', name: 'Target Corporation',             aliases: ['Target', 'Target Corp'] },
  { ein: '91-1223280', name: 'Costco Wholesale Corporation',   aliases: ['Costco', 'Costco Wholesale'] },
  { ein: '56-0578072', name: "Lowe's Companies Inc",           aliases: ["Lowe's", 'Lowes'] },
  { ein: '36-2361282', name: "McDonald's Corporation",         aliases: ["McDonald's", 'McDonalds', "McDonald's USA"] },
  { ein: '91-1325671', name: 'Starbucks Corporation',          aliases: ['Starbucks', 'Starbucks Coffee'] },
  { ein: '04-2207613', name: 'The TJX Companies Inc',          aliases: ['TJX', 'TJ Maxx', 'Marshalls', 'HomeGoods'] },
  { ein: '61-0502302', name: 'Dollar General Corporation',     aliases: ['Dollar General', 'DG'] },
  { ein: '54-1387365', name: 'Dollar Tree Stores Inc',         aliases: ['Dollar Tree', 'Family Dollar'] },
  { ein: '93-0584541', name: 'Nike Inc',                       aliases: ['Nike', 'NIKE'] },
  { ein: '59-3305930', name: 'Darden Restaurants Inc',         aliases: ['Darden', 'Olive Garden', 'LongHorn Steakhouse'] },
  { ein: '84-1219301', name: 'Chipotle Mexican Grill Inc',     aliases: ['Chipotle'] },
  { ein: '13-3951308', name: 'Yum Brands Inc',                 aliases: ['Yum!', 'YUM Brands', 'KFC', 'Taco Bell', 'Pizza Hut'] },

  // ── Technology ────────────────────────────────────────────────────────────
  { ein: '91-1144442', name: 'Microsoft Corporation',          aliases: ['Microsoft', 'MSFT'] },
  { ein: '94-2404110', name: 'Apple Inc',                      aliases: ['Apple', 'Apple Computer'] },
  { ein: '82-0544687', name: 'Amazon.com Services LLC',        aliases: ['Amazon', 'Amazon.com', 'Amazon Web Services', 'AWS'] },
  { ein: '20-1665019', name: 'Meta Platforms Inc',             aliases: ['Meta', 'Facebook', 'Instagram', 'WhatsApp'] },
  { ein: '94-1672743', name: 'Intel Corporation',              aliases: ['Intel'] },
  { ein: '77-0059951', name: 'Cisco Systems Inc',              aliases: ['Cisco'] },
  { ein: '94-2605794', name: 'Oracle Corporation',             aliases: ['Oracle'] },
  { ein: '94-3320693', name: 'Salesforce Inc',                 aliases: ['Salesforce', 'Salesforce.com'] },
  { ein: '94-3177549', name: 'Nvidia Corporation',             aliases: ['Nvidia', 'NVIDIA'] },
  { ein: '45-2647441', name: 'Uber Technologies Inc',          aliases: ['Uber'] },
  { ein: '20-8809830', name: 'Lyft Inc',                       aliases: ['Lyft'] },
  { ein: '91-2197729', name: 'Tesla Inc',                      aliases: ['Tesla', 'Tesla Motors'] },

  // ── Financial Services ────────────────────────────────────────────────────
  { ein: '13-4994650', name: 'JPMorgan Chase Bank NA',         aliases: ['JPMorgan Chase', 'JP Morgan', 'JPMorgan', 'Chase Bank', 'Chase'] },
  { ein: '41-0449260', name: 'Wells Fargo & Company',          aliases: ['Wells Fargo', 'Wells Fargo Bank'] },
  { ein: '56-0906609', name: 'Bank of America Corporation',    aliases: ['Bank of America', 'BofA', 'Merrill Lynch'] },
  { ein: '52-1568099', name: 'Citigroup Inc',                  aliases: ['Citigroup', 'Citibank', 'Citi'] },
  { ein: '13-4019460', name: 'The Goldman Sachs Group Inc',    aliases: ['Goldman Sachs', 'Goldman'] },
  { ein: '36-3145972', name: 'Morgan Stanley',                 aliases: ['Morgan Stanley', 'Morgan Stanley Smith Barney'] },
  { ein: '13-4922250', name: 'American Express Company',       aliases: ['American Express', 'Amex'] },
  { ein: '26-0267673', name: 'Visa Inc',                       aliases: ['Visa'] },
  { ein: '41-0518860', name: 'The Travelers Companies Inc',    aliases: ['Travelers', 'Travelers Insurance'] },
  { ein: '34-0963169', name: 'The Progressive Corporation',    aliases: ['Progressive', 'Progressive Insurance'] },

  // ── Healthcare / Insurance ────────────────────────────────────────────────
  { ein: '41-1321939', name: 'UnitedHealth Group Incorporated',aliases: ['UnitedHealth', 'United Health', 'UnitedHealthcare', 'Optum'] },
  { ein: '05-0494040', name: 'CVS Health Corporation',         aliases: ['CVS', 'CVS Pharmacy', 'CVS Health', 'Aetna'] },
  { ein: '36-1924025', name: 'Walgreen Co',                    aliases: ['Walgreens', 'Walgreen', 'Walgreens Boots Alliance'] },
  { ein: '82-4991898', name: 'The Cigna Group',                aliases: ['Cigna', 'Cigna Corporation', 'Express Scripts'] },
  { ein: '61-0647538', name: 'Humana Inc',                     aliases: ['Humana'] },
  { ein: '66-0588600', name: 'Elevance Health Inc',            aliases: ['Elevance', 'Anthem', 'Anthem Inc', 'Blue Cross Blue Shield'] },
  { ein: '75-2497104', name: 'HCA Inc',                        aliases: ['HCA Healthcare', 'HCA', 'Hospital Corporation of America'] },
  { ein: '95-2557091', name: 'Tenet Healthcare Corporation',   aliases: ['Tenet Healthcare', 'Tenet'] },
  { ein: '13-5315170', name: 'Pfizer Inc',                     aliases: ['Pfizer'] },
  { ein: '32-0375147', name: 'AbbVie Inc',                     aliases: ['AbbVie'] },
  { ein: '22-1918501', name: 'Merck & Co Inc',                 aliases: ['Merck', 'Merck Sharp & Dohme', 'MSD'] },
  { ein: '36-0698440', name: 'Abbott Laboratories',            aliases: ['Abbott', 'Abbvie Abbott'] },
  { ein: '22-1024240', name: 'Johnson and Johnson',            aliases: ['Johnson & Johnson', 'J&J', 'JnJ', 'Janssen'] },
  { ein: '36-0781620', name: 'Baxter International Inc',       aliases: ['Baxter'] },
  { ein: '58-1167100', name: 'Aflac Incorporated',             aliases: ['Aflac'] },

  // ── Telecom / Media ───────────────────────────────────────────────────────
  { ein: '43-1301883', name: 'AT&T Inc',                       aliases: ['AT&T', 'ATT', 'AT and T'] },
  { ein: '23-2259884', name: 'Verizon Communications Inc',     aliases: ['Verizon', 'Verizon Wireless'] },
  { ein: '27-0000798', name: 'Comcast Corporation',            aliases: ['Comcast', 'NBCUniversal', 'Xfinity'] },
  { ein: '95-4545390', name: 'The Walt Disney Company',        aliases: ['Disney', 'Walt Disney', 'TWDC'] },

  // ── Transportation / Logistics ────────────────────────────────────────────
  { ein: '95-1732075', name: 'United Parcel Service of America Inc', aliases: ['UPS', 'United Parcel Service'] },
  { ein: '62-1721435', name: 'FedEx Corporation',              aliases: ['FedEx', 'FedEx Ground', 'FedEx Express', 'Federal Express'] },
  { ein: '58-0218548', name: 'Delta Air Lines Inc',            aliases: ['Delta', 'Delta Air Lines'] },
  { ein: '74-1563240', name: 'Southwest Airlines Co',          aliases: ['Southwest', 'Southwest Airlines'] },
  { ein: '13-1502798', name: 'American Airlines Inc',          aliases: ['American Airlines', 'American', 'AA', 'American Airlines Group'] },
  { ein: '74-1648137', name: 'Sysco Corporation',              aliases: ['Sysco'] },
  { ein: '73-1309529', name: 'Waste Management Inc',           aliases: ['Waste Management', 'WM'] },
  { ein: '65-0716904', name: 'Republic Services Inc',          aliases: ['Republic Services', 'Allied Waste'] },

  // ── Aerospace / Defense / Industrial ─────────────────────────────────────
  { ein: '91-0425694', name: 'The Boeing Company',             aliases: ['Boeing'] },
  { ein: '52-1893632', name: 'Lockheed Martin Corporation',    aliases: ['Lockheed Martin', 'Lockheed'] },
  { ein: '13-1673581', name: 'General Dynamics Corporation',   aliases: ['General Dynamics', 'Gulfstream'] },
  { ein: '06-0570975', name: 'RTX Corporation',                aliases: ['RTX', 'Raytheon', 'Raytheon Technologies', 'United Technologies', 'UTC', 'Pratt & Whitney', 'Collins Aerospace'] },
  { ein: '80-0640649', name: 'Northrop Grumman Corporation',   aliases: ['Northrop Grumman', 'Northrop'] },
  { ein: '14-0689340', name: 'General Electric Company',       aliases: ['GE', 'GE Aerospace', 'General Electric'] },
  { ein: '41-0417775', name: '3M Company',                     aliases: ['3M', 'Minnesota Mining', 'MMM'] },
  { ein: '36-6968926', name: 'Honeywell International Inc',    aliases: ['Honeywell'] },
  { ein: '36-1258310', name: 'Illinois Tool Works Inc',        aliases: ['ITW', 'Illinois Tool Works'] },
  { ein: '36-2656023', name: 'Emerson Electric Co',            aliases: ['Emerson Electric', 'Emerson'] },
  { ein: '37-0602744', name: 'Caterpillar Inc',                aliases: ['Caterpillar', 'CAT'] },
  { ein: '36-2382580', name: 'Deere & Company',                aliases: ['Deere', 'John Deere'] },
  { ein: '38-0549190', name: 'Ford Motor Company',             aliases: ['Ford', 'Ford Motor', 'Lincoln'] },
  { ein: '27-0383222', name: 'General Motors LLC',             aliases: ['General Motors', 'GM', 'GMC', 'Chevrolet', 'Buick', 'Cadillac'] },
  { ein: '13-0871985', name: 'International Business Machines Corporation', aliases: ['IBM'] },

  // ── Energy ────────────────────────────────────────────────────────────────
  { ein: '13-0563898', name: 'Exxon Mobil Corporation',        aliases: ['ExxonMobil', 'Exxon', 'Mobil', 'Esso'] },
  { ein: '94-0890210', name: 'Chevron Corporation',            aliases: ['Chevron', 'Texaco'] },
  { ein: '71-0225165', name: 'Tyson Foods Inc',                aliases: ['Tyson', 'Tyson Foods'] },

  // ── Food / Beverage ───────────────────────────────────────────────────────
  { ein: '13-1584302', name: 'PepsiCo Inc',                    aliases: ['PepsiCo', 'Pepsi', 'Frito-Lay'] },
  { ein: '58-0628465', name: 'The Coca-Cola Company',          aliases: ['Coca-Cola', 'Coke', 'Coca Cola'] },
  { ein: '31-0411980', name: 'The Procter and Gamble Company', aliases: ['P&G', 'Procter & Gamble', 'Procter and Gamble'] },

  // ── Hospitality ───────────────────────────────────────────────────────────
  { ein: '52-2055918', name: 'Marriott International Inc',     aliases: ['Marriott', 'Marriott Hotels', 'Sheraton', 'Westin', 'W Hotels'] },
  { ein: '38-4009972', name: 'Hilton Domestic Operating Co Inc', aliases: ['Hilton', 'Hilton Hotels', 'Hilton Worldwide', 'Hampton Inn', 'DoubleTree'] },
  { ein: '20-1480589', name: 'Hyatt Hotels Corporation',       aliases: ['Hyatt'] },
]

// ─── Normalisation ────────────────────────────────────────────────────────────

// Legal suffixes to strip when comparing names
const SUFFIX_RE = /\b(incorporated|corporation|company|companies|limited|enterprises|holdings|group|international|worldwide|services|solutions|systems|technologies|technology|associates|partners|industries|labs|laboratories|corp|inc|llc|ltd|plc|co|lp|na|pc)\b\.?/gi

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[&+]/g, 'and')
    .replace(SUFFIX_RE, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Jaccard similarity on word tokens */
function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter(Boolean))
  const tb = new Set(b.split(' ').filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  return intersection / (ta.size + tb.size - intersection)
}

/** Bonus for one normalised name containing the other (handles IRS truncation) */
function containsBonus(a: string, b: string): number {
  if (a.includes(b) || b.includes(a)) return 0.25
  // partial token prefix bonus (e.g. "amazon" in "amazoncom services")
  const ta = a.split(' ').filter(Boolean)
  const tb = b.split(' ').filter(Boolean)
  if (ta[0] === tb[0]) return 0.15
  return 0
}

// Pre-build a flat list of {norm, ein, name} for each record + each alias
interface IndexEntry {
  norm: string
  ein: string
  name: string
}

const INDEX: IndexEntry[] = EIN_DB.flatMap((rec) => {
  const entries: IndexEntry[] = [{ norm: normalize(rec.name), ein: rec.ein, name: rec.name }]
  for (const alias of rec.aliases ?? []) {
    entries.push({ norm: normalize(alias), ein: rec.ein, name: rec.name })
  }
  return entries
})

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attempts to recover an EIN from an employer name using fuzzy matching.
 *
 * If the partial EIN digits are known (e.g. "XX-XXX4650" from a redacted EIN),
 * pass them as `knownSuffix` (just the visible digits, e.g. "4650") to
 * disambiguate candidates — this dramatically reduces false positives.
 *
 * Returns null if no match exceeds the confidence threshold (0.55).
 */
export function lookupEINByName(
  employerName: string,
  knownSuffix?: string,
): EinMatch | null {
  const query = normalize(employerName)
  if (!query) return null

  let best: EinMatch | null = null

  for (const entry of INDEX) {
    // Exact normalised match
    if (entry.norm === query) {
      const match: EinMatch = { ein: entry.ein, name: entry.name, score: 1.0 }
      // If the caller has visible EIN digits, confirm they match
      if (knownSuffix && !entry.ein.replace(/-/g, '').endsWith(knownSuffix)) continue
      return match
    }

    const sim = tokenSimilarity(query, entry.norm) + containsBonus(query, entry.norm)
    const score = Math.min(sim, 0.99)

    if (score > (best?.score ?? 0)) {
      if (!knownSuffix || entry.ein.replace(/-/g, '').endsWith(knownSuffix)) {
        best = { ein: entry.ein, name: entry.name, score }
      }
    }
  }

  const THRESHOLD = 0.55
  return best && best.score >= THRESHOLD ? best : null
}

/**
 * Extracts the visible trailing digits from a partially-masked EIN.
 * e.g. "XX-XXX4650"  → "4650"
 *      "**-***6789"  → "6789"
 *      "91-1325671"  → null  (not redacted)
 */
export function extractEINSuffix(ein: string): string | null {
  if (!/[xX*]/.test(ein)) return null          // not redacted
  const digits = ein.replace(/-/g, '').replace(/[^0-9]/g, '')
  return digits.length >= 3 ? digits : null
}
