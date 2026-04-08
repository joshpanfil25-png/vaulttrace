'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, Download, ExternalLink, Layers, Loader2, Mail, Minus, TrendingUp, TriangleAlert } from 'lucide-react'
import { track } from '@vercel/analytics'
import type { PbgcPlan } from '@/lib/registry'
import type { StateSearchResult } from '@/lib/unclaimed'

export interface EmployerResult {
  employer_name: string
  ein: string | null
  has_401k: boolean
  has_redacted_ein: boolean
  plan_name: string | null
  last_filing_year: number | null
  registry_confirmed: boolean
  confidence_score: number
  pbgc_plans?: PbgcPlan[]
  unclaimed_states?: StateSearchResult[]
}

interface ResultsDashboardProps {
  employers: EmployerResult[]
  email?: string
  scannedAt?: string
  linkedinImport?: boolean
  onUpgradeToFullScan?: () => void
}

function dolLostAndFoundUrl(employerName: string, ein: string | null): string {
  const base = 'https://lostandfound.dol.gov'
  const params = new URLSearchParams()
  params.set('employer', employerName)
  if (ein) params.set('ein', ein)
  return `${base}?${params.toString()}`
}

function capitalizeUrl(campaign: 'account_found' | 'consolidate_all', employerName?: string): string {
  const params = new URLSearchParams({
    utm_source:   'vaulttrace',
    utm_medium:   'referral',
    utm_campaign: campaign,
  })
  if (employerName) params.set('utm_content', employerName)
  return `https://www.hicapitalize.com/?${params.toString()}`
}

export default function ResultsDashboard({
  employers,
  email,
  scannedAt,
  linkedinImport,
  onUpgradeToFullScan,
}: ResultsDashboardProps) {
  const accountCount = employers.filter((e) => e.has_401k).length

  // ── Download state ──────────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false)

  // ── Email state ─────────────────────────────────────────────────────────────
  const [emailSending, setEmailSending]   = useState(false)
  const [emailStatus,  setEmailStatus]    = useState<'idle' | 'sent' | 'error'>('idle')

  // ── Checklist state (persisted to localStorage by EIN) ──────────────────────
  type ChecklistItem = { contacted: boolean; confirmed: boolean; rollover: boolean }
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>({})

  function storageKey(emp: EmployerResult): string {
    return `vt_track_${emp.ein ?? emp.employer_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`
  }

  // Hydrate checklist from localStorage on mount
  useEffect(() => {
    const loaded: Record<string, ChecklistItem> = {}
    employers.filter((e) => e.has_401k).forEach((e) => {
      const key = storageKey(e)
      try {
        const raw = localStorage.getItem(key)
        if (raw) loaded[key] = JSON.parse(raw) as ChecklistItem
      } catch { /* ignore */ }
    })
    setChecklist(loaded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employers])

  function toggleCheck(emp: EmployerResult, field: keyof ChecklistItem) {
    const key = storageKey(emp)
    setChecklist((prev) => {
      const current = prev[key] ?? { contacted: false, confirmed: false, rollover: false }
      const updated = { ...current, [field]: !current[field] }
      try { localStorage.setItem(key, JSON.stringify(updated)) } catch { /* ignore */ }
      return { ...prev, [key]: updated }
    })
  }

  async function handleDownload() {
    track('capitalize_clicked', { account_count: accountCount })
    setDownloading(true)
    try {
      const res = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: employers,
          email,
          scanned_at: scannedAt,
        }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = res.headers.get('content-disposition')
        ?.match(/filename="([^"]+)"/)?.[1] ?? 'vaulttrace-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Non-blocking — user can retry
    } finally {
      setDownloading(false)
    }
  }

  async function handleEmailResults() {
    if (!email) return
    setEmailSending(true)
    setEmailStatus('idle')
    try {
      const res = await fetch('/api/email-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: employers, email, scanned_at: scannedAt }),
      })
      setEmailStatus(res.ok ? 'sent' : 'error')
      if (res.ok) setTimeout(() => setEmailStatus('idle'), 4000)
    } catch {
      setEmailStatus('error')
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Summary banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-600/5 border border-amber-500/20 p-5">
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-zinc-100">
              <span className="text-amber-400">{accountCount}</span>
              {' '}potential account{accountCount !== 1 ? 's' : ''} found across{' '}
              <span className="text-amber-400">{employers.length}</span>
              {' '}employer{employers.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Verified against DOL Form 5500 filings</p>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />
              }
              {downloading ? 'Generating…' : 'Download Report'}
            </button>
            {email && (
              <button
                onClick={handleEmailResults}
                disabled={emailSending}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  emailStatus === 'sent'
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : emailStatus === 'error'
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-zinc-700/60 bg-zinc-800/60 text-zinc-400 hover:border-amber-500/40 hover:text-amber-400'
                }`}
              >
                {emailSending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : emailStatus === 'sent'
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : <Mail className="h-3.5 w-3.5" />
                }
                {emailSending ? 'Sending…' : emailStatus === 'sent' ? 'Sent!' : emailStatus === 'error' ? 'Try again' : 'Email My Results'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Consolidate All button — shown when 2+ accounts found */}
      {accountCount >= 2 && (
        <a
          href={capitalizeUrl('consolidate_all')}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('capitalize_clicked', { action: 'consolidate_all', account_count: accountCount })}
          className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-opacity hover:opacity-90"
        >
          <Layers className="h-4 w-4 shrink-0" />
          Consolidate All {accountCount} Found Accounts
          <ArrowRight className="h-4 w-4 shrink-0" />
        </a>
      )}

      {/* Preliminary-scan upgrade banner */}
      {linkedinImport && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
              <TriangleAlert className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100">
                Preliminary Scan — based on employer names only
              </p>
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
                Name-only matching finds roughly 40–50% of eligible accounts.
                Upload your IRS Wage &amp; Income Transcript for a Full Scan with{' '}
                <span className="text-zinc-200 font-medium">higher accuracy</span> using verified EINs.
              </p>
              {onUpgradeToFullScan && (
                <button
                  onClick={onUpgradeToFullScan}
                  className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                >
                  Upgrade to Full Scan
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employer list */}
      <div className="flex flex-col divide-y divide-zinc-800/60 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {employers.map((emp, i) => (
          <div key={emp.ein ?? `${emp.employer_name}-${i}`} className="flex flex-col">

            {/* Main row */}
            <div className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-zinc-800/40">
              {/* Building icon */}
              <div className={`
                mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                ${emp.has_401k
                  ? 'bg-amber-500/10 ring-1 ring-amber-500/20'
                  : 'bg-zinc-800 ring-1 ring-zinc-700/50'
                }
              `}>
                <Building2 className={`h-4 w-4 ${emp.has_401k ? 'text-amber-400' : 'text-zinc-500'}`} />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-zinc-100 truncate">
                    {emp.employer_name}
                  </span>
                  {emp.has_redacted_ein && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-medium text-yellow-400 ring-1 ring-yellow-400/20">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      EIN redacted — searching by name
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {emp.ein && (
                    <span className="text-xs text-zinc-500">EIN {emp.ein}</span>
                  )}
                  {emp.has_401k && emp.plan_name && (
                    <>
                      <span className="text-zinc-700 text-xs">·</span>
                      <span className="text-xs text-zinc-400">{emp.plan_name}</span>
                    </>
                  )}
                  {emp.has_401k && emp.last_filing_year && (
                    <>
                      <span className="text-zinc-700 text-xs">·</span>
                      <span className="text-xs text-zinc-500">Last filed {emp.last_filing_year}</span>
                    </>
                  )}
                  <span className="text-zinc-700 text-xs">·</span>
                  <span className={`text-xs font-medium ${
                    emp.confidence_score >= 70
                      ? 'text-green-400'
                      : emp.confidence_score >= 40
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}>
                    {emp.confidence_score}% confidence
                  </span>
                </div>

                {/* State unclaimed property links */}
                {emp.unclaimed_states && emp.unclaimed_states.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {emp.unclaimed_states.map((s) => (
                      <a
                        key={s.state_abbr}
                        href={s.search_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors ${
                          s.properties.length > 0
                            ? 'bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30 hover:bg-purple-500/25'
                            : 'bg-zinc-800/70 text-zinc-500 ring-1 ring-zinc-700/40 hover:text-zinc-300'
                        }`}
                        title={
                          s.properties.length > 0
                            ? `${s.properties.length} retirement account(s) found — click to verify`
                            : s.searched
                              ? 'No unclaimed property found in this state'
                              : 'Click to search manually'
                        }
                      >
                        {s.state_abbr}
                        {s.properties.length > 0 && (
                          <span className="font-semibold">{s.properties.length}</span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Status badge + PBGC badge + DOL button */}
              <div className="shrink-0 mt-0.5 flex flex-col items-end gap-2">
                {emp.has_401k ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    401(k) found
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-500 ring-1 ring-zinc-700/50">
                    <Minus className="h-3 w-3" />
                    No filing
                  </span>
                )}
                {emp.pbgc_plans && emp.pbgc_plans.length > 0 && (
                  <span
                    className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 ring-1 ring-blue-500/20"
                    title={emp.pbgc_plans.map((p) => p.plan_name).join(', ')}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    PBGC pension found
                  </span>
                )}
                <a
                  href={dolLostAndFoundUrl(emp.employer_name, emp.ein)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:border-amber-500/40 hover:text-amber-400"
                >
                  <ExternalLink className="h-3 w-3" />
                  Gov&apos;t database
                </a>
              </div>
            </div>

            {/* Roll This Over + progress tracker — only for confirmed 401(k) matches */}
            {emp.has_401k && (() => {
              const key   = storageKey(emp)
              const state = checklist[key] ?? { contacted: false, confirmed: false, rollover: false }
              const items: { field: keyof typeof state; label: string }[] = [
                { field: 'contacted', label: 'Contacted plan administrator' },
                { field: 'confirmed', label: 'Confirmed account balance'    },
                { field: 'rollover',  label: 'Rollover initiated'           },
              ]
              return (
                <div className="border-t border-amber-500/10 bg-amber-500/[0.03]">
                  {/* Roll This Over row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <a
                      href={capitalizeUrl('account_found', emp.employer_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track('capitalize_clicked', { action: 'rollover', employer: emp.employer_name })}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-amber-500/20 transition-opacity hover:opacity-90"
                    >
                      Roll This Over
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                    <p className="text-xs text-zinc-600">Powered by Capitalize — free rollover service</p>
                  </div>

                  {/* Progress tracker */}
                  <div className="border-t border-zinc-800/50 px-5 py-3">
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Your progress</p>
                    <div className="flex flex-col gap-2">
                      {items.map(({ field, label }) => {
                        const checked = state[field]
                        return (
                          <button
                            key={field}
                            type="button"
                            onClick={() => toggleCheck(emp, field)}
                            className="flex items-center gap-2.5 text-left group"
                          >
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                              checked
                                ? 'bg-amber-500 border-amber-500'
                                : 'border-zinc-600 bg-transparent group-hover:border-amber-500/50'
                            }`}>
                              {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                            </div>
                            <span className={`text-xs transition-colors ${
                              checked ? 'text-zinc-600 line-through' : 'text-zinc-400 group-hover:text-zinc-300'
                            }`}>
                              {label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

          </div>
        ))}
      </div>
    </div>
  )
}
