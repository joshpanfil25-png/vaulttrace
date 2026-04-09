'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Coins,
  FilePlus,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import UploadZone from '@/components/UploadZone'
import ResultsDashboard, { EmployerResult } from '@/components/ResultsDashboard'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type AdvisorView = 'dashboard' | 'clients' | 'new-scan' | 'settings'
type ScanStep    = 'upload' | 'scanning' | 'done'

interface ScanRow {
  id: string
  email: string
  employers: { employer_name: string; ein: string | null; years_employed?: string }[]
  matches: EmployerResult[]   // only has_401k: true employers
  scanned_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVG_ACCOUNT_VALUE = 66_000

function formatAUM(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString()}`
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function avgConfidence(matches: EmployerResult[]): number {
  if (!matches.length) return 0
  return Math.round(matches.reduce((sum, m) => sum + (m.confidence_score ?? 0), 0) / matches.length)
}

function confidenceColor(score: number): string {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}

// ─── Login gate ───────────────────────────────────────────────────────────────

function LoginGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode]   = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim() === 'VAULT2024') {
      onUnlock()
    } else {
      setError(true)
      setCode('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-zinc-100">
              Vault<span className="text-amber-400">Trace</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Advisor Portal</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Advisor Access Code
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(false) }}
              placeholder="Enter your code"
              autoFocus
              className={`rounded-xl border bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all
                focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10
                ${error ? 'border-red-500/60' : 'border-zinc-700/60'}`}
            />
            {error && (
              <p className="text-xs text-red-400">Incorrect code — try again.</p>
            )}
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-medium text-white shadow-md shadow-amber-500/20 transition-opacity hover:opacity-90"
          >
            <Shield className="h-4 w-4" />
            Sign in
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-600">
          This portal is for authorized advisors only.
        </p>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: AdvisorView; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients',   label: 'Clients',   icon: Users },
  { id: 'new-scan',  label: 'New Scan',  icon: FilePlus },
  { id: 'settings',  label: 'Settings',  icon: Settings },
]

function Sidebar({
  view,
  onNavigate,
  onLogout,
}: {
  view: AdvisorView
  onNavigate: (v: AdvisorView) => void
  onLogout: () => void
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
          <Coins className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-zinc-100">
            Vault<span className="text-amber-400">Trace</span>
          </span>
          <p className="text-[10px] text-zinc-600">Advisor Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors text-left w-full
              ${view === id
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
            {id === 'new-scan' && (
              <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-400">
                +
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl
        ${accent
          ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20'
          : 'bg-zinc-800'
        }`}
      >
        <Icon className={`h-5 w-5 ${accent ? 'text-white' : 'text-zinc-400'}`} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-zinc-100">{value}</p>
        <p className="mt-0.5 text-sm text-zinc-500">{label}</p>
        {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Dashboard overview ───────────────────────────────────────────────────────

function DashboardView({ scans, loading }: { scans: ScanRow[]; loading: boolean }) {
  const totalClients  = scans.length
  const totalAccounts = scans.reduce((n, s) => n + s.matches.length, 0)
  const totalAUM      = totalAccounts * AVG_ACCOUNT_VALUE

  // Last 5 scans for recent activity
  const recent = scans.slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100">Overview</h2>
        <p className="mt-1 text-sm text-zinc-500">All-time activity across your client book.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total clients scanned"
          value={loading ? '—' : totalClients.toLocaleString()}
          icon={Users}
        />
        <StatCard
          label="Total 401(k) accounts found"
          value={loading ? '—' : totalAccounts.toLocaleString()}
          icon={BarChart3}
        />
        <StatCard
          label="Potential AUM recovered"
          value={loading ? '—' : formatAUM(totalAUM)}
          sub={`at $${(AVG_ACCOUNT_VALUE / 1000).toFixed(0)}K avg per account`}
          icon={TrendingUp}
          accent
        />
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-medium text-zinc-100">Recent scans</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-600">
            Loading…
          </div>
        ) : recent.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-zinc-600">
            No scans yet — run a New Scan to get started.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recent.map((scan) => {
              const accounts = scan.matches.length
              const avg      = avgConfidence(scan.matches)
              return (
                <div key={scan.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                    <Building2 className="h-4 w-4 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-100 truncate">{scan.email}</p>
                    <p className="text-xs text-zinc-600">{formatDate(scan.scanned_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-zinc-100">
                      {accounts} account{accounts !== 1 ? 's' : ''}
                    </p>
                    {accounts > 0 && (
                      <p className={`text-xs font-medium ${confidenceColor(avg)}`}>
                        {avg}% avg confidence
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Client detail slide-over ─────────────────────────────────────────────────

function ClientDetail({
  scan,
  onClose,
}: {
  scan: ScanRow
  onClose: () => void
}) {
  const accounts   = scan.matches.length
  const employers  = scan.employers.length
  const avg        = avgConfidence(scan.matches)

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-zinc-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="flex w-full max-w-xl flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
          <div>
            <h3 className="font-semibold text-zinc-100">{scan.email}</h3>
            <p className="mt-0.5 text-sm text-zinc-500">
              Scanned {formatDate(scan.scanned_at)} · {employers} employer{employers !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex divide-x divide-zinc-800 border-b border-zinc-800">
          {[
            { label: 'Employers', value: employers.toString() },
            { label: '401(k) accounts', value: accounts.toString() },
            {
              label: 'Avg confidence',
              value: accounts > 0 ? `${avg}%` : '—',
              color: accounts > 0 ? confidenceColor(avg) : undefined,
            },
            { label: 'Est. AUM', value: formatAUM(accounts * AVG_ACCOUNT_VALUE) },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-1 flex-col items-center py-3.5 px-2">
              <span className={`text-lg font-semibold ${color ?? 'text-zinc-100'}`}>{value}</span>
              <span className="text-[10px] text-zinc-600 mt-0.5 text-center">{label}</span>
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {accounts === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                <Building2 className="h-5 w-5 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">No 401(k) accounts found for this client.</p>
            </div>
          ) : (
            <ResultsDashboard employers={scan.matches} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Clients table ────────────────────────────────────────────────────────────

function ClientsView({
  scans,
  loading,
  onViewDetail,
}: {
  scans: ScanRow[]
  loading: boolean
  onViewDetail: (scan: ScanRow) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = scans.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Clients</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {scans.length} total scan{scans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
          className="w-56 rounded-xl border border-zinc-700/60 bg-zinc-900 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10"
        />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {/* Table head */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 border-b border-zinc-800 px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          <span>Client</span>
          <span className="w-28 text-right">Scanned</span>
          <span className="w-24 text-right">Employers</span>
          <span className="w-24 text-right">Accounts</span>
          <span className="w-28 text-right">Avg confidence</span>
          <span className="w-20 text-right">Est. AUM</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-600">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-600">
            {search ? 'No clients match that search.' : 'No scans yet.'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {filtered.map((scan) => {
              const accounts = scan.matches.length
              const avg      = avgConfidence(scan.matches)

              return (
                <div
                  key={scan.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-x-4 px-5 py-3.5 transition-colors hover:bg-zinc-800/30"
                >
                  {/* Email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-[11px] font-semibold text-zinc-400">
                      {scan.email[0].toUpperCase()}
                    </div>
                    <span className="truncate text-sm text-zinc-100">{scan.email}</span>
                  </div>

                  {/* Date */}
                  <span className="w-28 text-right text-xs text-zinc-500">
                    {formatDate(scan.scanned_at)}
                  </span>

                  {/* Employers */}
                  <span className="w-24 text-right text-sm text-zinc-400">
                    {scan.employers.length}
                  </span>

                  {/* Accounts */}
                  <span className={`w-24 text-right text-sm font-medium ${accounts > 0 ? 'text-green-400' : 'text-zinc-600'}`}>
                    {accounts}
                  </span>

                  {/* Avg confidence */}
                  <span className={`w-28 text-right text-sm font-medium ${accounts > 0 ? confidenceColor(avg) : 'text-zinc-600'}`}>
                    {accounts > 0 ? `${avg}%` : '—'}
                  </span>

                  {/* AUM */}
                  <span className="w-20 text-right text-sm font-medium text-amber-400">
                    {accounts > 0 ? formatAUM(accounts * AVG_ACCOUNT_VALUE) : '—'}
                  </span>

                  {/* View button — spans a new implicit row or we can put it in an overflow menu */}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Separate "View Details" affordance — click row to open */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="border-b border-zinc-800 px-5 py-3 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
            Actions
          </div>
          <div className="divide-y divide-zinc-800/60">
            {filtered.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors"
              >
                <span className="text-sm text-zinc-400 truncate max-w-xs">{scan.email}</span>
                <button
                  onClick={() => onViewDetail(scan)}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-500/40 hover:text-amber-400"
                >
                  View Details
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── New scan ─────────────────────────────────────────────────────────────────

const SCAN_MESSAGES = [
  'Reading transcript…',
  'Identifying employers…',
  'Checking DOL 5500 database…',
  'Cross-referencing registries…',
]

function NewScanView({ onComplete }: { onComplete: () => void }) {
  const [step, setStep]         = useState<ScanStep>('upload')
  const [email, setEmail]       = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [ssn, setSsn]           = useState('')
  const [results, setResults]   = useState<EmployerResult[]>([])
  const [error, setError]       = useState('')
  const [msgIdx, setMsgIdx]     = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (step === 'scanning') {
      setMsgIdx(0)
      intervalRef.current = setInterval(() => {
        setMsgIdx((i) => (i + 1) % SCAN_MESSAGES.length)
      }, 1800)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [step])

  const handleUpload = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Please enter a valid email address.')
      return
    }
    setEmailErr('')
    setError('')
    setStep('scanning')

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('email', email)

      const parseRes = await fetch('/api/parse-transcript', { method: 'POST', body: form })
      if (!parseRes.ok) throw new Error(((await parseRes.json().catch(() => ({}))) as { error?: string }).error ?? 'Parse failed')
      const { employers: parsed } = await parseRes.json() as {
        employers: { employer_name: string; ein: string | null; years_employed: string }[]
      }

      const lookupRes = await fetch('/api/lookup-employers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, employers: parsed, ssn: ssn.trim() || undefined }),
      })
      if (!lookupRes.ok) throw new Error(((await lookupRes.json().catch(() => ({}))) as { error?: string }).error ?? 'Lookup failed')
      const { results: found } = await lookupRes.json() as { results: EmployerResult[] }

      setResults(found)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('upload')
    }
  }, [email, ssn])

  if (step === 'scanning') {
    return (
      <div className="flex flex-col items-center justify-center gap-10 py-24">
        {/* Radar */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-36 w-36 rounded-full border border-amber-500/10" />
          <div className="absolute h-52 w-52 rounded-full border border-amber-500/5" />
          <div
            className="absolute h-36 w-36 animate-radar rounded-full"
            style={{ background: 'conic-gradient(from 0deg, transparent 75%, rgba(245,158,11,0.6) 100%)' }}
          />
          <div className="absolute h-24 w-24 rounded-full bg-amber-500/5 animate-glow" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 shadow-xl">
            <Coins className="h-6 w-6 text-amber-400" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-medium text-zinc-100">{SCAN_MESSAGES[msgIdx]}</p>
          <p className="text-sm text-zinc-600">Usually completes in 10–20 seconds</p>
        </div>
        <div className="flex gap-2">
          {SCAN_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === msgIdx ? 'w-6 bg-amber-500' : i < msgIdx ? 'w-1.5 bg-amber-500/40' : 'w-1.5 bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  if (step === 'done') {
    const accounts = results.filter((r) => r.has_401k).length
    return (
      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Success banner */}
        <div className="flex items-center gap-4 rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-zinc-100">Scan complete</p>
            <p className="text-sm text-zinc-500">
              {accounts} potential account{accounts !== 1 ? 's' : ''} found for{' '}
              <span className="text-zinc-300">{email}</span>
            </p>
          </div>
          <button
            onClick={onComplete}
            className="shrink-0 rounded-lg border border-zinc-700/60 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-500/40 hover:text-amber-400"
          >
            View in Clients
          </button>
        </div>

        <ResultsDashboard employers={results} />

        <button
          onClick={() => {
            setStep('upload')
            setEmail('')
            setSsn('')
            setResults([])
            setError('')
          }}
          className="self-start text-sm text-zinc-500 transition-colors hover:text-amber-400"
        >
          ← Start another scan
        </button>
      </div>
    )
  }

  // Upload step
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100">New Client Scan</h2>
        <p className="mt-1 text-sm text-zinc-500">Upload a client&apos;s IRS Wage &amp; Income transcript.</p>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Client email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailErr) setEmailErr('') }}
            placeholder="client@example.com"
            className={`rounded-xl border bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all
              focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10
              ${emailErr ? 'border-red-500/60' : 'border-zinc-700/60'}`}
          />
          {emailErr && <p className="text-xs text-red-400">{emailErr}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Client SSN{' '}
            <span className="normal-case font-normal text-zinc-600">(optional — improves accuracy)</span>
          </label>
          <input
            type="text"
            value={ssn}
            onChange={(e) => setSsn(e.target.value)}
            placeholder="XXX-XX-XXXX"
            maxLength={11}
            className="rounded-xl border border-zinc-700/60 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10"
          />
          <p className="text-xs text-zinc-600">Used only for registry cross-reference. Never stored.</p>
        </div>

        <UploadZone onUpload={handleUpload} />
      </div>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsView() {
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100">Settings</h2>
        <p className="mt-1 text-sm text-zinc-500">Portal configuration and preferences.</p>
      </div>

      <div className="flex flex-col divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        {[
          { label: 'Advisor code', value: '••••••••', sub: 'Contact support to rotate your access code.' },
          { label: 'Average account value', value: '$66,000', sub: 'Used for AUM projections across the dashboard.' },
          { label: 'Data source', value: 'DOL EFAST2', sub: 'Form 5500 filings via www.efast.dol.gov/services/afs' },
          { label: 'PBGC lookup', value: 'Enabled', sub: 'Searches PBGC site for terminated pension plans.' },
          { label: 'State unclaimed property', value: '10 states', sub: 'CA, NY, TX, FL, IL, PA, OH, GA, NC, MI' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm text-zinc-100">{label}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
            </div>
            <span className="shrink-0 text-sm text-zinc-400">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function AdvisorPage() {
  const [authed, setAuthed]       = useState(false)
  const [hydrated, setHydrated]   = useState(false)
  const [view, setView]           = useState<AdvisorView>('dashboard')
  const [scans, setScans]         = useState<ScanRow[]>([])
  const [loadingScans, setLoading] = useState(true)
  const [detail, setDetail]       = useState<ScanRow | null>(null)

  // Hydrate auth from localStorage (runs client-only)
  useEffect(() => {
    const stored = localStorage.getItem('vt_advisor_auth')
    if (stored === '1') setAuthed(true)
    setHydrated(true)
  }, [])

  function unlock() {
    localStorage.setItem('vt_advisor_auth', '1')
    setAuthed(true)
  }

  function logout() {
    localStorage.removeItem('vt_advisor_auth')
    setAuthed(false)
  }

  // Fetch scans whenever auth is active and we're on dashboard or clients
  useEffect(() => {
    if (!authed) return
    fetchScans()
  }, [authed])

  async function fetchScans() {
    setLoading(true)
    const { data, error } = await supabase
      .from('scans')
      .select('id, email, employers, matches, scanned_at')
      .order('scanned_at', { ascending: false })

    if (!error && data) setScans(data as ScanRow[])
    setLoading(false)
  }

  function navigateTo(v: AdvisorView) {
    setView(v)
    if (v === 'dashboard' || v === 'clients') fetchScans()
  }

  // Avoid flash of login gate during SSR hydration
  if (!hydrated) return null

  if (!authed) return <LoginGate onUnlock={unlock} />

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar view={view} onNavigate={navigateTo} onLogout={logout} />

      {/* Content */}
      <main className="ml-60 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">
          {view === 'dashboard' && (
            <DashboardView scans={scans} loading={loadingScans} />
          )}
          {view === 'clients' && (
            <ClientsView
              scans={scans}
              loading={loadingScans}
              onViewDetail={(scan) => setDetail(scan)}
            />
          )}
          {view === 'new-scan' && (
            <NewScanView
              onComplete={() => {
                navigateTo('clients')
              }}
            />
          )}
          {view === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Detail slide-over */}
      {detail && (
        <ClientDetail scan={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
