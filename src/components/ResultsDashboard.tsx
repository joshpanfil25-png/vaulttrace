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

  const [downloading, setDownloading] = useState(false)
  const [emailSending, setEmailSending]   = useState(false)
  const [emailStatus,  setEmailStatus]    = useState<'idle' | 'sent' | 'error'>('idle')

  type ChecklistItem = { contacted: boolean; confirmed: boolean; rollover: boolean }
  const [checklist, setChecklist] = useState<Record<string, ChecklistItem>>({})

  function storageKey(emp: EmployerResult): string {
    return `vt_track_${emp.ein ?? emp.employer_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`
  }

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5">
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-200">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold text-zinc-900">
              <span className="text-amber-600">{accountCount}</span>
              {' '}potential account{accountCount !== 1 ? 's' : ''} found across{' '}
              <span className="text-amber-600">{employers.length}</span>
              {' '}employer{employers.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Verified against DOL Form 5500 filings</p>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : emailStatus === 'error'
                      ? 'border-red-200 bg-red-50 text-red-600'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-amber-300 hover:text-amber-600'
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

      {/* Consolidate All button */}
      {accountCount >= 2 && (
        <a
          href={capitalizeUrl('consolidate_all')}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('capitalize_clicked', { action: 'consolidate_all', account_count: accountCount })}
          className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-200 transition-opacity hover:opacity-90"
        >
          <Layers className="h-4 w-4 shrink-0" />
          Consolidate All {accountCount} Found Accounts
          <ArrowRight className="h-4 w-4 shrink-0" />
        </a>
      )}

      {/* Preliminary-scan upgrade banner */}
      {linkedinImport && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 ring-1 ring-amber-200">
              <TriangleAlert className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900">
                Preliminary Scan — based on employer names only
              </p>
              <p className="mt-1 text-sm text-zinc-600 leading-relaxed">
                Name-only matching finds roughly 40–50% of eligible accounts.
                Upload your IRS Wage &amp; Income Transcript for a Full Scan with{' '}
                <span className="text-zinc-800 font-medium">higher accuracy</span> using verified EINs.
              </p>
              {onUpgradeToFullScan && (
                <button
                  onClick={onUpgradeToFullScan}
                  className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
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
      <div className="flex flex-col divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        {employers.map((emp, i) => (
          <div key={emp.ein ?? `${emp.employer_name}-${i}`} className="flex flex-col">

            {/* Main row */}
            <div className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-zinc-50">
              <div className={`
                mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                ${emp.has_401k
                  ? 'bg-amber-50 ring-1 ring-amber-200'
                  : 'bg-zinc-100 ring-1 ring-zinc-200'
                }
              `}>
                <Building2 className={`h-4 w-4 ${emp.has_401k ? 'text-amber-500' : 'text-zinc-400'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-zinc-900 truncate">
                    {emp.employer_name}
                  </span>
                  {emp.has_redacted_ein && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-yellow-200">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      EIN redacted — searching by name
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {emp.ein && (
                    <span className="text-xs text-zinc-400">EIN {emp.ein}</span>
                  )}
                  {emp.has_401k && emp.plan_name && (
                    <>
                      <span className="text-zinc-300 text-xs">·</span>
                      <span className="text-xs text-zinc-600">{emp.plan_name}</span>
                    </>
                  )}
                  {emp.has_401k && emp.last_filing_year && (
                    <>
                      <span className="text-zinc-300 text-xs">·</span>
                      <span className="text-xs text-zinc-400">Last filed {emp.last_filing_year}</span>
                    </>
                  )}
                  <span className="text-zinc-300 text-xs">·</span>
                  <span className={`text-xs font-medium ${
                    emp.confidence_score >= 70
                      ? 'text-green-600'
                      : emp.confidence_score >= 40
                        ? 'text-yellow-600'
                        : 'text-red-500'
                  }`}>
                    {emp.confidence_score}% confidence
                  </span>
                </div>

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
                            ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200 hover:bg-purple-100'
                            : 'bg-zinc-100 text-zinc-400 ring-1 ring-zinc-200 hover:text-zinc-600'
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

              <div className="shrink-0 mt-0.5 flex flex-col items-end gap-2">
                {emp.has_401k ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
                    <CheckCircle2 className="h-3 w-3" />
                    401(k) found
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-400 ring-1 ring-zinc-200">
                    <Minus className="h-3 w-3" />
                    No filing
                  </span>
                )}
                {emp.pbgc_plans && emp.pbgc_plans.length > 0 && (
                  <span
                    className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200"
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
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-amber-300 hover:text-amber-600"
                >
                  <ExternalLink className="h-3 w-3" />
                  Gov&apos;t database
                </a>
              </div>
            </div>

            {/* Roll This Over + progress tracker */}
            {emp.has_401k && (() => {
              const key   = storageKey(emp)
              const state = checklist[key] ?? { contacted: false, confirmed: false, rollover: false }
              const items: { field: keyof typeof state; label: string }[] = [
                { field: 'contacted', label: 'Contacted plan administrator' },
                { field: 'confirmed', label: 'Confirmed account balance'    },
                { field: 'rollover',  label: 'Rollover initiated'           },
              ]
              return (
                <div className="border-t border-amber-100 bg-amber-50/40">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <a
                      href={capitalizeUrl('account_found', emp.employer_name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track('capitalize_clicked', { action: 'rollover', employer: emp.employer_name })}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-amber-200 transition-opacity hover:opacity-90"
                    >
                      Roll This Over
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                    <p className="text-xs text-zinc-400">Powered by Capitalize — free rollover service</p>
                  </div>

                  <div className="border-t border-zinc-100 px-5 py-3">
                    <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Your progress</p>
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
                                : 'border-zinc-300 bg-transparent group-hover:border-amber-400'
                            }`}>
                              {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                            </div>
                            <span className={`text-xs transition-colors ${
                              checked ? 'text-zinc-400 line-through' : 'text-zinc-500 group-hover:text-zinc-700'
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
