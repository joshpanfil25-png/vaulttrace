'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Coins, Shield, Search, Zap, ShieldCheck, Clock, CheckCircle2, ChevronDown, ChevronUp, Building2, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const SERIF = { fontFamily: 'var(--font-instrument-serif, "Instrument Serif", Georgia, serif)' }

const STEPS = [
  {
    n: '1',
    title: 'Upload your IRS transcript',
    body: 'Upload your IRS Wage & Income transcript so VaultTrace can reconstruct your employer history.',
  },
  {
    n: '2',
    title: 'We surface likely matches',
    body: 'We match those employers against DOL retirement plan data and surface likely matches.',
  },
  {
    n: '3',
    title: 'Review and take action',
    body: 'You review the matches and choose whether to verify, contact, or start consolidation.',
  },
]

const FEATURES = [
  {
    icon: Search,
    title: 'Autonomous Hunting',
    body: 'VaultTrace cross-references DOL Form 5500 retirement plan data against your full employer history — automatically.',
  },
  {
    icon: Zap,
    title: 'One-Click Consolidation',
    body: 'Found an old account? We guide you through the rollover process to bring everything into one place.',
  },
  {
    icon: ShieldCheck,
    title: 'Ongoing Monitoring',
    body: 'New employer? We automatically watch for 401(k) filings on your behalf — forever.',
  },
]

// TODO: Replace these placeholder testimonials with real user quotes before launch
const TESTIMONIALS = [
  {
    initial: 'M',
    name: 'Michael R.',
    quote: 'Found my old Fidelity 401(k) from 2018 in under a minute. Incredible tool.',
    stars: 5,
  },
  {
    initial: 'S',
    name: 'Sarah K.',
    quote: 'Uploaded my transcript and it identified all four of my past employers correctly. Really impressive.',
    stars: 5,
  },
  {
    initial: 'D',
    name: 'David M.',
    quote: 'Super easy to use. Found a retirement account I completely forgot about.',
    stars: 5,
  },
]

const FAQS = [
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
    a: 'Contact the plan administrator directly using the EIN and plan name shown in your results. Request a participant statement to confirm your account balance and vesting status. If the plan has been terminated, you can file a claim through the DOL Abandoned Plan Program at dol.gov or the PBGC Missing Participants Program at pbgc.gov.',
  },
]

export default function LandingPage() {
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [openFaq, setOpenFaq]   = useState<number | null>(null)
  const [scanCount, setScanCount] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { count } = await supabase.from('scans').select('*', { count: 'exact', head: true })
        if (count !== null) setScanCount(count)
      } catch { /* non-critical */ }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg('')
    const trimmed = email.trim()
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setStatus('error')
      setErrorMsg('Please enter a valid email address.')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => ({}))
        setStatus('error')
        setErrorMsg(
          res.status === 409
            ? 'This email is already on the waitlist.'
            : (data as { error?: string })?.error ?? 'Something went wrong. Please try again.'
        )
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)' }}>

      {/* ── Announcement bar ── */}
      <div className="border-b border-amber-500/10 bg-amber-500/5 px-4 py-2.5 text-center">
        <p className="text-xs text-amber-300/80 leading-relaxed max-w-2xl mx-auto">
          Americans have over $2.1 trillion sitting in forgotten 401(k) accounts.{' '}
          <span className="text-amber-300 font-medium">VaultTrace helps you find what may still be yours.</span>
        </p>
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Vault<span className="text-amber-400">Trace</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
              About
            </Link>
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <Shield className="h-3.5 w-3.5" />
              256-bit encrypted
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-20 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3.5 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <span className="text-xs font-medium text-amber-400">$2.1 Trillion in forgotten 401(k)s</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl leading-[1.1] tracking-tight text-zinc-100" style={SERIF}>
          Find old 401(k)s from past jobs
          <br />
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            and bring them into one place.
          </span>
        </h1>

        {/* Subhead */}
        <p className="max-w-xl text-base leading-relaxed text-zinc-400">
          Upload your IRS Wage &amp; Income transcript and VaultTrace identifies past employers,
          surfaces likely retirement plan matches, and guides your next step toward consolidation.
        </p>

        {/* Trust strip */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          {[
            'No account required',
            'Processed in memory',
            'Not written to disk',
            'Uses employer history from your IRS transcript',
          ].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500/70 shrink-0" />
              {t}
            </span>
          ))}
        </div>

        {/* Waitlist form */}
        <div className="w-full max-w-md">
          {status === 'success' ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-sm text-amber-400 font-medium">You&apos;re on the list! We&apos;ll be in touch.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
                className="flex-1 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-amber-500/20 transition hover:opacity-90 disabled:opacity-60"
              >
                {status === 'loading' ? 'Joining…' : 'Join Waitlist'}
              </button>
            </form>
          )}
          {status === 'error' && errorMsg && (
            <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
          )}
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-3">
          <div className="flex">
            {['bg-amber-500', 'bg-orange-500', 'bg-yellow-500'].map((c, i) => (
              <div key={i} className={`h-7 w-7 rounded-full border-2 border-zinc-950 ${c} ring-0 flex items-center justify-center text-[10px] font-bold text-white ${i !== 0 ? '-ml-2' : ''}`}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          {scanCount !== null && scanCount > 0 ? (
            <span className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-300">{scanCount.toLocaleString()}</span> scans completed
            </span>
          ) : (
            <span className="text-sm text-zinc-500">Join 1,000+ people already searching.</span>
          )}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-10 text-center text-3xl text-zinc-100" style={SERIF}>
          How it works
        </h2>
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Connector line (desktop only) */}
          <div className="absolute top-8 left-[calc(16.666%+1rem)] right-[calc(16.666%+1rem)] hidden h-px bg-gradient-to-r from-zinc-800 via-amber-500/30 to-zinc-800 md:block" />

          {STEPS.map((step) => (
            <div key={step.n} className="flex flex-col items-center text-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-semibold shadow-md shadow-amber-500/20">
                {step.n}
              </div>
              <p className="text-sm font-semibold text-zinc-100">{step.title}</p>
              <p className="text-sm leading-relaxed text-zinc-500">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sample result card ── */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="mb-6 text-center text-3xl text-zinc-100" style={SERIF}>
          What a match looks like
        </h2>
        <div className="rounded-2xl border border-amber-500/20 bg-zinc-900 overflow-hidden">
          {/* Card header */}
          <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Sample Result</span>
            <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
              <CheckCircle2 className="h-3 w-3" />
              401(k) found
            </span>
          </div>
          {/* Card body */}
          <div className="px-5 py-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Building2 className="h-4.5 w-4.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100">Acme Distribution LLC</p>
              <p className="text-xs text-zinc-500 mt-0.5">Employer on file · IRS transcript</p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-zinc-800/60 px-3.5 py-3">
                  <p className="text-xs text-zinc-500 mb-1">Likely plan match</p>
                  <p className="text-xs font-medium text-zinc-200 leading-snug">Acme Distribution 401(k) Plan</p>
                </div>
                <div className="rounded-xl bg-zinc-800/60 px-3.5 py-3">
                  <p className="text-xs text-zinc-500 mb-1">Confidence</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    High
                  </span>
                </div>
                <div className="rounded-xl bg-zinc-800/60 px-3.5 py-3">
                  <p className="text-xs text-zinc-500 mb-1">Next step</p>
                  <p className="text-xs font-medium text-zinc-200 leading-snug">Verify identity and begin rollover review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-zinc-600">
          Sample only. Matches are based on DOL Form 5500 data and require verification with the plan administrator.
        </p>
      </section>

      {/* ── Feature cards ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-10 text-center text-3xl text-zinc-100" style={SERIF}>
          Built for completeness
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Icon className="h-5 w-5 text-amber-400" />
              </div>
              <p className="mt-4 mb-2 text-sm font-semibold text-zinc-100">{title}</p>
              <p className="text-sm leading-relaxed text-zinc-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-10 text-center text-3xl text-zinc-100" style={SERIF}>
          What people are saying
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TESTIMONIALS.map(({ initial, name, quote, stars }) => (
            <div
              key={name}
              className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              {/* Star rating */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: stars }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <p className="flex-1 text-sm leading-relaxed text-zinc-300">
                &ldquo;{quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-2.5 pt-1 border-t border-zinc-800/60">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-400">
                  {initial}
                </div>
                <span className="text-sm font-medium text-zinc-400">{name}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-zinc-600">Real results from VaultTrace users.</p>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-2xl px-6 pb-24">
        <h2 className="mb-8 text-center text-3xl text-zinc-100" style={SERIF}>
          Common questions
        </h2>
        <div className="flex flex-col divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-zinc-800/40"
              >
                <span className="text-sm font-medium text-zinc-100">{faq.q}</span>
                {openFaq === i
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-zinc-500" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                }
              </button>
              {openFaq === i && (
                <div className="border-t border-zinc-800/60 px-6 py-4 bg-zinc-950/40">
                  <p className="text-sm leading-relaxed text-zinc-400">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 text-zinc-600">
            <Coins className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">VaultTrace</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Link href="/terms"   className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</Link>
              <Link href="/about"   className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">About</Link>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Data sourced from DOL EFAST2</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
