'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Bell, CheckCircle2, ChevronDown, Clock, Coins, Copy, FileText, Plus, Receipt, Shield, Share2, UploadCloud, X } from 'lucide-react'
import { track } from '@vercel/analytics'
import UploadZone from '@/components/UploadZone'
import ResultsDashboard, { EmployerResult } from '@/components/ResultsDashboard'
import { supabase } from '@/lib/supabase'

type Step     = 'upload' | 'scanning' | 'results'
type ScanMode = 'irs' | 'linkedin' | 'w2'

interface ManualEmployer {
  name: string
  years_from: string
  years_to: string
}

const EMPTY_ROW: ManualEmployer = { name: '', years_from: '', years_to: '' }
const INITIAL_ROWS = 5
const MAX_ROWS     = 10

const IRS_STATUS_MESSAGES = [
  'Reading your tax transcripts…',
  'Identifying employers across all years…',
  'Checking DOL 5500 database…',
  'Cross-referencing retirement registries…',
]

const LINKEDIN_STATUS_MESSAGES = [
  'Looking up employers…',
  'Checking DOL 5500 database…',
  'Searching pension records…',
  'Cross-referencing unclaimed property…',
]

const W2_STATUS_MESSAGES = [
  'Reading your W-2 forms…',
  'Extracting employer details…',
  'Checking DOL 5500 database…',
  'Cross-referencing retirement registries…',
]

export default function ScanPage() {
  const [step, setStep]               = useState<Step>('upload')
  const [scanMode, setScanMode]       = useState<ScanMode>('irs')
  const [email, setEmail]             = useState('')
  const [emailError, setEmailError]   = useState('')
  const [ssn, setSsn]                 = useState('')
  const [manualEmployers, setManualEmployers] = useState<ManualEmployer[]>(
    Array.from({ length: INITIAL_ROWS }, () => ({ ...EMPTY_ROW })),
  )
  const [w2Files, setW2Files]         = useState<File[]>([])
  const [scanSource, setScanSource]   = useState<ScanMode>('irs')
  const [employers, setEmployers]     = useState<EmployerResult[]>([])
  const [error, setError]             = useState('')
  const [statusIndex, setStatusIndex] = useState(0)
  const [scanCount, setScanCount]     = useState<number | null>(null)
  const [shareConfirmed, setShareConfirmed] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyStatus, setNotifyStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [openFaq, setOpenFaq]         = useState<number | null>(null)
  const activeModeRef = useRef<ScanMode>('irs')
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusMessages =
    activeModeRef.current === 'linkedin' ? LINKEDIN_STATUS_MESSAGES :
    activeModeRef.current === 'w2'       ? W2_STATUS_MESSAGES :
    IRS_STATUS_MESSAGES

  function updateEmployer(index: number, field: keyof ManualEmployer, value: string) {
    setManualEmployers((prev) => prev.map((e, i) => i === index ? { ...e, [field]: value } : e))
  }

  function addEmployer() {
    setManualEmployers((prev) => prev.length < MAX_ROWS ? [...prev, { ...EMPTY_ROW }] : prev)
  }

  function removeEmployer(index: number) {
    setManualEmployers((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)
  }

  useEffect(() => {
    if (step === 'scanning') {
      setStatusIndex(0)
      intervalRef.current = setInterval(() => {
        setStatusIndex((i) => (i + 1) % IRS_STATUS_MESSAGES.length)
      }, 1800)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [step])

  useEffect(() => {
    ;(async () => {
      try {
        const { count } = await supabase.from('scans').select('*', { count: 'exact', head: true })
        if (count !== null) setScanCount(count)
      } catch { /* non-critical */ }
    })()
  }, [])

  async function handleShare() {
    const found = employers.find((e) => e.has_401k)
    const text  = found
      ? `I just found a forgotten 401(k) from ${found.employer_name} using VaultTrace — check if you have one too at vaulttrace.org`
      : `I used VaultTrace to check all my past employers for forgotten 401(k) accounts — check if you have one too at vaulttrace.org`

    if (navigator.share) {
      try { await navigator.share({ text, url: 'https://vaulttrace.org' }) } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(text)
      setShareConfirmed(true)
      setTimeout(() => setShareConfirmed(false), 2500)
    }
  }

  async function handleNotifySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notifyEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) return
    setNotifyStatus('sending')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail.trim() }),
      })
      if (res.ok) track('email_captured', { source: 'results_notify' })
      setNotifyStatus(res.ok || res.status === 409 ? 'done' : 'error')
    } catch {
      setNotifyStatus('error')
    }
  }

  function validateEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }

  function sanitizeInput(s: string, maxLen = 1000): string {
    return s.replace(/\0/g, '').replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen)
  }

  async function runLookup(
    parsed: { employer_name: string; ein: string | null; years_employed: string }[],
    isLinkedin: boolean,
  ) {
    const lookupRes = await fetch('/api/lookup-employers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    sanitizeInput(email, 254),
        employers: parsed.map((e) => ({
          ...e,
          employer_name: sanitizeInput(e.employer_name, 200),
        })),
        ssn: ssn.trim() ? ssn.trim().replace(/[^\d-]/g, '').slice(0, 11) : undefined,
        linkedin_import: isLinkedin,
      }),
    })
    if (!lookupRes.ok) {
      const b = await lookupRes.json().catch(() => ({}))
      throw new Error((b as { error?: string }).error ?? 'Failed to look up employers')
    }
    return lookupRes.json() as Promise<{ results: EmployerResult[] }>
  }

  async function handleUpload(files: File[]) {
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    setError('')
    activeModeRef.current = 'irs'
    track('transcript_uploaded', { file_count: files.length })
    setStep('scanning')

    try {
      const parseResults = await Promise.all(
        files.map(async (file) => {
          const form = new FormData()
          form.append('file', file)
          form.append('email', email)
          const parseRes = await fetch('/api/parse-transcript', { method: 'POST', body: form })
          if (!parseRes.ok) {
            const b = await parseRes.json().catch(() => ({}))
            throw new Error((b as { error?: string }).error ?? `Failed to parse ${file.name}`)
          }
          const { employers } = await parseRes.json() as {
            employers: { employer_name: string; ein: string | null; has_redacted_ein?: boolean; years_employed: string }[]
          }
          return employers
        })
      )

      const seen = new Map<string, { employer_name: string; ein: string | null; has_redacted_ein?: boolean; years_employed: string }>()
      for (const list of parseResults) {
        for (const emp of list) {
          const key = emp.ein ?? emp.employer_name.toLowerCase().replace(/\s+/g, ' ').trim()
          if (!seen.has(key) || (!seen.get(key)!.ein && emp.ein)) {
            seen.set(key, emp)
          }
        }
      }
      const deduped = Array.from(seen.values())

      const { results } = await runLookup(deduped, false)
      setScanSource('irs')
      setEmployers(results)
      setStep('results')
      track('results_viewed', { scan_type: 'irs', employer_count: results.length })
      const matchCount = results.filter((e) => e.has_401k).length
      if (matchCount > 0) track('account_found', { scan_type: 'irs', match_count: matchCount })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('upload')
    }
  }

  async function handleQuickScan() {
    const filled = manualEmployers.filter((e) => e.name.trim())
    if (filled.length === 0) return
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    setError('')
    activeModeRef.current = 'linkedin'
    track('quick_scan_started', { employer_count: filled.length })
    setStep('scanning')

    try {
      const res = await fetch('/api/linkedin-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizeInput(email, 254),
          employers: filled.map((e) => ({
            name:       sanitizeInput(e.name, 200),
            years_from: e.years_from.replace(/[^\d]/g, '').slice(0, 4),
            years_to:   e.years_to.replace(/[^\d]/g, '').slice(0, 4),
          })),
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error((b as { error?: string }).error ?? 'Failed to search employers')
      }
      const { results } = await res.json() as { results: EmployerResult[] }
      setScanSource('linkedin')
      setEmployers(results)
      setStep('results')
      track('results_viewed', { scan_type: 'quick', employer_count: results.length })
      const matchCount = results.filter((e) => e.has_401k).length
      if (matchCount > 0) track('account_found', { scan_type: 'quick', match_count: matchCount })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('upload')
    }
  }

  async function handleW2Scan() {
    if (w2Files.length === 0) return
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    setError('')
    activeModeRef.current = 'w2'
    track('w2_uploaded', { file_count: w2Files.length })
    setStep('scanning')

    try {
      const parseResults = await Promise.all(
        w2Files.map(async (file) => {
          const form = new FormData()
          form.append('file', file)
          const res = await fetch('/api/parse-transcript', { method: 'POST', body: form })
          if (!res.ok) {
            const b = await res.json().catch(() => ({}))
            throw new Error((b as { error?: string }).error ?? `Failed to parse ${file.name}`)
          }
          const data = await res.json() as {
            employers: { employer_name: string; ein: string | null; has_redacted_ein?: boolean; years_employed: string }[]
          }
          return data.employers
        }),
      )

      const seen = new Map<string, { employer_name: string; ein: string | null; has_redacted_ein?: boolean; years_employed: string }>()
      for (const list of parseResults) {
        for (const emp of list) {
          const key = emp.ein ?? emp.employer_name.toLowerCase().replace(/\s+/g, ' ').trim()
          if (!seen.has(key) || (!seen.get(key)!.ein && emp.ein)) {
            seen.set(key, emp)
          }
        }
      }
      const deduped = Array.from(seen.values())

      const { results } = await runLookup(deduped, false)
      setScanSource('w2')
      setEmployers(results)
      setStep('results')
      track('results_viewed', { scan_type: 'w2', employer_count: results.length })
      const matchCount = results.filter((e) => e.has_401k).length
      if (matchCount > 0) track('account_found', { scan_type: 'w2', match_count: matchCount })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('upload')
    }
  }

  function removeW2File(index: number) {
    setW2Files((prev) => prev.filter((_, i) => i !== index))
  }

  function resetToUpload(mode?: ScanMode) {
    setStep('upload')
    setEmployers([])
    setError('')
    setScanSource('irs')
    setW2Files([])
    setManualEmployers(Array.from({ length: INITIAL_ROWS }, () => ({ ...EMPTY_ROW })))
    if (mode) setScanMode(mode)
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-zinc-900">
              Vault<span className="text-amber-500">Trace</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-zinc-500 transition-colors hover:text-zinc-800">
              About
            </Link>
            <Link
              href="/security"
              className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 transition-colors hover:bg-green-100"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Bank-level security</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">

        {/* ── Progress indicator ── */}
        <div className="border-b border-zinc-100 bg-zinc-50">
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-0 px-6 py-3">
            {(['upload', 'scanning', 'results'] as const).map((s, i) => {
              const labels  = ['Enter Info', 'Scan', 'Results']
              const stepIdx = ['upload', 'scanning', 'results'].indexOf(step)
              const isActive = s === step
              const isDone   = i < stepIdx
              return (
                <div key={s} className="flex items-center">
                  {i > 0 && (
                    <div className={`h-px w-10 sm:w-16 mx-1 transition-colors ${isDone || isActive ? 'bg-amber-400' : 'bg-zinc-200'}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                      isActive ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                      : isDone  ? 'bg-amber-100 text-amber-600'
                      :           'bg-zinc-200 text-zinc-400'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs font-medium transition-colors hidden sm:inline ${
                      isActive ? 'text-amber-600'
                      : isDone  ? 'text-zinc-400'
                      :           'text-zinc-300'
                    }`}>
                      {labels[i]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <div className="mx-auto max-w-2xl px-6 py-16 flex flex-col gap-10">

            {/* Hero */}
            <div className="flex flex-col items-center text-center gap-5">

              <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <span className="text-xs font-medium text-amber-700">
                  $2.1 Trillion in forgotten 401(k)s
                </span>
              </div>

              <h1 className="text-5xl leading-[1.1] tracking-tight text-zinc-900 font-extrabold">
                Find your{' '}
                <span className="text-amber-500">
                  forgotten retirement money
                </span>
              </h1>

              <p className="max-w-md text-base text-zinc-500 leading-relaxed">
                Upload your IRS Wage &amp; Income transcript. We scan every employer
                you&apos;ve worked for and surface unclaimed 401(k) accounts in seconds.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                {['No account needed', 'Never stored', 'Takes 30 seconds'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded-full bg-zinc-50 border border-zinc-200 px-3 py-1 text-xs text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {t}
                  </span>
                ))}
              </div>

              {scanCount !== null && scanCount > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm">
                  <div className="flex -space-x-1">
                    {['bg-amber-500', 'bg-orange-500', 'bg-yellow-500'].map((c, i) => (
                      <div key={i} className={`h-5 w-5 rounded-full ${c} ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-800">{scanCount.toLocaleString()}</span> scans completed
                  </span>
                </div>
              )}
            </div>

            {/* ── Scan-type selector ── */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setScanMode('linkedin')}
                className={`flex flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                  scanMode === 'linkedin'
                    ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
                    scanMode === 'linkedin' ? 'bg-amber-100 ring-amber-300' : 'bg-zinc-100 ring-zinc-200'
                  }`}>
                    <Coins className={`h-4 w-4 ${scanMode === 'linkedin' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">Quick Scan</span>
                </div>
                <p className="text-xs text-zinc-500 leading-snug">No documents needed — 2 minutes</p>
              </button>

              <button
                onClick={() => setScanMode('w2')}
                className={`flex flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                  scanMode === 'w2'
                    ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
                    scanMode === 'w2' ? 'bg-amber-100 ring-amber-300' : 'bg-zinc-100 ring-zinc-200'
                  }`}>
                    <Receipt className={`h-4 w-4 ${scanMode === 'w2' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">W-2 Upload</span>
                </div>
                <p className="text-xs text-zinc-500 leading-snug">Upload individual W-2s — most accurate per employer</p>
              </button>

              <button
                onClick={() => setScanMode('irs')}
                className={`flex flex-col gap-2.5 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                  scanMode === 'irs'
                    ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-100'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
                    scanMode === 'irs' ? 'bg-amber-100 ring-amber-300' : 'bg-zinc-100 ring-zinc-200'
                  }`}>
                    <FileText className={`h-4 w-4 ${scanMode === 'irs' ? 'text-amber-600' : 'text-zinc-400'}`} />
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">IRS Transcript</span>
                </div>
                <p className="text-xs text-zinc-500 leading-snug">Most accurate — requires IRS transcript</p>
              </button>
            </div>

            {/* ── Form card ── */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex flex-col gap-5 shadow-sm">

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
                  placeholder="you@example.com"
                  className={`
                    rounded-xl border bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400
                    outline-none transition-all duration-200
                    focus:border-amber-400 focus:ring-2 focus:ring-amber-100
                    ${emailError ? 'border-red-300' : 'border-zinc-200'}
                  `}
                />
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>

              {/* SSN */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ssn" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  SSN <span className="normal-case text-zinc-400 font-normal">(optional — improves accuracy)</span>
                </label>
                <input
                  id="ssn"
                  type="text"
                  value={ssn}
                  onChange={(e) => setSsn(e.target.value)}
                  placeholder="XXX-XX-XXXX"
                  maxLength={11}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all duration-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <p className="text-xs text-zinc-400">
                  Used only for registry cross-reference. Never stored.
                </p>
              </div>

              {/* ── Manual employer form ── */}
              {scanMode === 'linkedin' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Where have you worked?
                    </label>
                    <span className="text-xs text-zinc-400">{manualEmployers.length}/{MAX_ROWS}</span>
                  </div>

                  <div className="grid grid-cols-[1fr_80px_80px_28px] gap-2 px-0.5">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Company Name</span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">From</span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">To</span>
                    <span />
                  </div>

                  <div className="flex flex-col gap-2">
                    {manualEmployers.map((emp, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_80px_28px] gap-2 items-center">
                        <input
                          type="text"
                          value={emp.name}
                          onChange={(e) => updateEmployer(i, 'name', e.target.value)}
                          placeholder="e.g. Acme Corp"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                        />
                        <input
                          type="text"
                          value={emp.years_from}
                          onChange={(e) => updateEmployer(i, 'years_from', e.target.value)}
                          placeholder="2018"
                          maxLength={4}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                        />
                        <input
                          type="text"
                          value={emp.years_to}
                          onChange={(e) => updateEmployer(i, 'years_to', e.target.value)}
                          placeholder="2022"
                          maxLength={4}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                        />
                        <button
                          onClick={() => removeEmployer(i)}
                          disabled={manualEmployers.length === 1}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Remove row"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={addEmployer}
                      disabled={manualEmployers.length >= MAX_ROWS}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add another employer
                    </button>
                    <button
                      onClick={handleQuickScan}
                      disabled={!manualEmployers.some((e) => e.name.trim())}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Search Employers
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── W-2 multi-file upload ── */}
              {scanMode === 'w2' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Upload W-2 Forms
                    </label>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                      Upload W-2s from each employer you want to check. Multiple files accepted — one per employer or tax year.
                    </p>
                  </div>

                  <label
                    htmlFor="w2-input"
                    className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-8 cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/30"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-zinc-200 transition-colors group-hover:bg-amber-50 group-hover:ring-amber-300">
                      <UploadCloud className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-zinc-700">Click to add W-2 PDFs</p>
                      <p className="text-xs text-zinc-400 mt-0.5">PDF format · multiple files supported</p>
                    </div>
                    <input
                      id="w2-input"
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        setW2Files((prev) => {
                          const existing = new Set(prev.map((f) => f.name))
                          return [...prev, ...files.filter((f) => !existing.has(f.name))]
                        })
                        e.target.value = ''
                      }}
                    />
                  </label>

                  {w2Files.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {w2Files.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2"
                        >
                          <Receipt className="h-4 w-4 shrink-0 text-amber-500" />
                          <span className="flex-1 min-w-0 truncate text-sm text-zinc-700">{file.name}</span>
                          <span className="shrink-0 text-xs text-zinc-400">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() => removeW2File(i)}
                            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
                            aria-label={`Remove ${file.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-zinc-400">
                      {w2Files.length === 0
                        ? 'No files selected'
                        : `${w2Files.length} file${w2Files.length !== 1 ? 's' : ''} ready`}
                    </p>
                    <button
                      onClick={handleW2Scan}
                      disabled={w2Files.length === 0}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Scan W-2s
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── IRS upload zone ── */}
              {scanMode === 'irs' && (
                <UploadZone onUpload={handleUpload} />
              )}
            </div>

            {/* ── FAQ ── */}
            {(() => {
              const faqs = [
                {
                  q: 'Is this safe?',
                  a: 'Yes. Your documents are processed in memory and deleted immediately — never written to disk or stored on our servers. We only retain the extracted employer names and your scan results. Your SSN, if provided, is used for a single lookup and never persisted. All connections are TLS-encrypted.',
                },
                {
                  q: 'How long does it take?',
                  a: 'Most scans complete in 10–30 seconds. We check the DOL Form 5500 database, PBGC pension records, and state unclaimed property registries for every employer simultaneously, so the total time is roughly as long as the slowest single lookup.',
                },
                {
                  q: 'What if I find an account?',
                  a: 'Contact the plan administrator directly using the EIN and plan name shown in your results. Request a participant statement confirming your account balance and vesting status. If the plan has been terminated, you can file a claim through the DOL Abandoned Plan Program at dol.gov or the PBGC Missing Participants Program at pbgc.gov.',
                },
              ]
              return (
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 px-1">Common questions</h3>
                  <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100 shadow-sm">
                    {faqs.map((faq, i) => (
                      <div key={i}>
                        <button
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-zinc-50"
                        >
                          <span className="text-sm font-medium text-zinc-800">{faq.q}</span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                        </button>
                        {openFaq === i && (
                          <div className="px-5 pb-4 bg-zinc-50/50">
                            <p className="text-sm text-zinc-500 leading-relaxed">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── SCANNING ── */}
        {step === 'scanning' && (
          <div className="flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6 py-20 gap-10">

            <div className="relative flex items-center justify-center">
              <div className="absolute h-36 w-36 rounded-full border border-amber-200" />
              <div className="absolute h-52 w-52 rounded-full border border-amber-100" />
              <div className="absolute h-36 w-36 animate-radar rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 75%, rgba(245,158,11,0.5) 100%)',
                  borderRadius: '50%',
                }}
              />
              <div className="absolute h-24 w-24 rounded-full bg-amber-50 animate-glow" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white border border-zinc-200 shadow-lg">
                <Coins className="h-6 w-6 text-amber-500" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-semibold text-zinc-900 text-center min-h-[1.75rem] transition-all">
                {statusMessages[statusIndex]}
              </p>
              <p className="text-sm text-zinc-400">Usually completes in 10–20 seconds</p>
            </div>

            <div className="flex gap-2">
              {statusMessages.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i === statusIndex
                      ? 'w-6 bg-amber-500'
                      : i < statusIndex
                        ? 'w-1.5 bg-amber-300'
                        : 'w-1.5 bg-zinc-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {step === 'results' && (() => {
          const accountCount = employers.filter((e) => e.has_401k).length
          const foundNames   = employers.filter((e) => e.has_401k).map((e) => e.employer_name)
          return (
            <div className="mx-auto max-w-2xl px-6 py-12 flex flex-col gap-8">

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-extrabold text-zinc-900">
                      Your results
                    </h2>
                    {scanSource === 'linkedin' && (
                      <span className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        Preliminary scan
                      </span>
                    )}
                    {(scanSource === 'irs' || scanSource === 'w2') && (
                      <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        Full Scan
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-amber-300 hover:text-amber-600 shadow-sm"
                  >
                    {shareConfirmed
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600">Copied!</span></>
                      : <><Share2 className="h-3.5 w-3.5" />Share your result</>
                    }
                  </button>
                </div>
                <p className="text-sm text-zinc-400">
                  {scanSource === 'linkedin'
                    ? 'Name-based DOL search · Upload IRS transcript or W-2s for full accuracy'
                    : scanSource === 'w2'
                      ? 'W-2 verified EINs · 90%+ confidence · Based on DOL Form 5500 filings'
                      : 'Based on DOL Form 5500 filings from 2000–2024'}
                </p>
              </div>

              <ResultsDashboard
                employers={employers}
                email={email}
                linkedinImport={scanSource === 'linkedin'}
                onUpgradeToFullScan={() => resetToUpload('irs')}
              />

              {/* ── What's next? ── */}
              <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-900">What&apos;s next?</h3>
                </div>
                {accountCount > 0 ? (
                  <div className="flex flex-col gap-3 px-5 py-4">
                    {foundNames.slice(0, 3).map((name, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            Contact the plan administrator for <span className="text-amber-600">{name}</span>
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Request a participant statement to confirm your account balance and vesting status. Use the EIN and plan name shown above.
                          </p>
                        </div>
                      </div>
                    ))}
                    {foundNames.length > 3 && (
                      <p className="text-xs text-zinc-400 pl-8">
                        + {foundNames.length - 3} more employer{foundNames.length - 3 !== 1 ? 's' : ''} — see the full list in your downloaded report.
                      </p>
                    )}
                    <div className="mt-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        If a plan has been terminated, file a claim at{' '}
                        <span className="text-zinc-700">dol.gov</span> (Abandoned Plan Program) or{' '}
                        <span className="text-zinc-700">pbgc.gov</span> (Missing Participants Program).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 px-5 py-4">
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      No 401(k) filings were found for your employers in the DOL database. This can happen if plans were filed under a different entity name or EIN.
                    </p>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      <span className="font-medium text-zinc-800">Try uploading individual W-2s</span> for a more accurate per-employer search using verified EINs directly from your tax records.
                    </p>
                    <button
                      onClick={() => resetToUpload('w2')}
                      className="self-start flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200 transition-opacity hover:opacity-90"
                    >
                      Try W-2 Upload
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Email capture ── */}
              {!email && notifyStatus !== 'done' && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-semibold text-zinc-900">Get notified when we add more databases</p>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    We&apos;re adding state pension systems, union benefit funds, and more. Enter your email to be notified.
                  </p>
                  <form onSubmit={handleNotifySubmit} className="flex gap-2">
                    <input
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-100"
                    />
                    <button
                      type="submit"
                      disabled={notifyStatus === 'sending'}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                    >
                      {notifyStatus === 'sending' ? 'Saving…' : 'Notify me'}
                    </button>
                  </form>
                  {notifyStatus === 'error' && (
                    <p className="text-xs text-red-500">Something went wrong — please try again.</p>
                  )}
                </div>
              )}
              {!email && notifyStatus === 'done' && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <p className="text-sm text-green-700">You&apos;re on the list — we&apos;ll email you when new databases are added.</p>
                </div>
              )}

              <button
                onClick={() => resetToUpload()}
                className="mx-auto flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-500 transition-colors group"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                Start a new search
              </button>
            </div>
          )
        })()}

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-100 py-6">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Coins className="h-3.5 w-3.5" />
            <span>VaultTrace</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Link href="/terms"   className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">Privacy</Link>
              <Link href="/about"   className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">About</Link>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Data sourced from DOL EFAST2</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
