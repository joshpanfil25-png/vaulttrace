'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Coins, Shield, ChevronDown, ChevronUp, Star, Lock, Trash2, DollarSign } from 'lucide-react'

const STEPS = [
  {
    n: '1',
    title: 'Download your free IRS document',
    body: 'Go to IRS.gov and download your free tax document. It takes about 2 minutes and you can do it right now.',
  },
  {
    n: '2',
    title: 'Upload it here',
    body: 'Drop the file in. We scan it automatically — no reading required on your end.',
  },
  {
    n: '3',
    title: 'See what you find',
    body: 'We show you every retirement account we find connected to your work history. Free report in 30 seconds.',
  },
]

const TRUST = [
  {
    icon: Lock,
    title: 'No SSN ever',
    body: 'We never ask for your Social Security number. Ever. Not once.',
  },
  {
    icon: Trash2,
    title: 'Nothing stored',
    body: 'Your document is deleted immediately after scanning. We never keep your files.',
  },
  {
    icon: DollarSign,
    title: 'Always free',
    body: 'Finding your own money should never cost money. VaultTrace is completely free.',
  },
]

const TESTIMONIALS = [
  {
    initial: 'M',
    name: 'Michael R.',
    job: 'Truck driver, 22 years',
    quote: "I had no idea I had money sitting there from a job I worked back in 2014. Found it in under a minute. Couldn't believe it was that easy.",
    stars: 5,
  },
  {
    initial: 'S',
    name: 'Sarah K.',
    job: 'Registered nurse',
    quote: "I've worked at four different hospitals over the years. VaultTrace found accounts at two of them that I completely forgot about. This thing works.",
    stars: 5,
  },
  {
    initial: 'D',
    name: 'David M.',
    job: 'Retail manager',
    quote: "Super easy to use and it's actually free. Found an old account from a company I worked at in my twenties. Couldn't have done this on my own.",
    stars: 5,
  },
]

const FAQS = [
  {
    q: 'Is this safe?',
    a: 'Yes. We never store your document and never ask for your Social Security number. Your information is processed and immediately deleted.',
  },
  {
    q: 'How long does it take?',
    a: 'About 30 seconds once you have your IRS document. Getting the document from IRS.gov takes about 2 minutes.',
  },
  {
    q: 'What if I find an account?',
    a: 'We walk you through exactly what to do next. You can roll it over for free using our partner service.',
  },
  {
    q: 'Does this cost anything?',
    a: 'No. VaultTrace is completely free. We make money only if you choose to roll over an account we find.',
  },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function MoneyGraphic() {
  return (
    <svg viewBox="0 0 400 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
      <circle cx="200" cy="170" r="130" fill="#FEF3C7" />
      <circle cx="210" cy="185" r="80" fill="#FCD34D" />
      <circle cx="210" cy="185" r="68" fill="#FBBF24" />
      <circle cx="210" cy="185" r="56" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
      <text x="210" y="195" textAnchor="middle" fontSize="36" fontWeight="bold" fill="#92400E">$</text>
      <circle cx="110" cy="115" r="44" fill="#FCD34D" />
      <circle cx="110" cy="115" r="34" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
      <text x="110" y="122" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#92400E">$</text>
      <circle cx="310" cy="100" r="34" fill="#FCD34D" />
      <circle cx="310" cy="100" r="26" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
      <text x="310" y="107" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#92400E">$</text>
      <line x1="155" y1="55" x2="155" y2="75" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"/>
      <line x1="145" y1="65" x2="165" y2="65" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round"/>
      <line x1="330" y1="160" x2="330" y2="175" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="322.5" y1="167.5" x2="337.5" y2="167.5" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="70" y1="200" x2="70" y2="212" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round"/>
      <line x1="64" y1="206" x2="76" y2="206" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="268" cy="242" r="30" fill="white" stroke="#F59E0B" strokeWidth="5"/>
      <line x1="290" y1="264" x2="314" y2="288" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round"/>
      <ellipse cx="200" cy="316" rx="100" ry="10" fill="#FCD34D" opacity="0.3"/>
    </svg>
  )
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const emailInputRef = useRef<HTMLInputElement>(null)

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = waitlistEmail.trim()
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) return
    setWaitlistStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      setWaitlistStatus(res.ok || res.status === 409 ? 'success' : 'error')
    } catch {
      setWaitlistStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900" style={{ fontFamily: '"Inter", "DM Sans", system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-zinc-900">
              Vault<span className="text-amber-500">Trace</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/about" className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">About</Link>
            <Link
              href="/scan"
              className="rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              Find My Money
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20">
        <div className="flex flex-col-reverse items-center gap-10 lg:flex-row lg:gap-16">

          {/* Left: Text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              <span className="text-xs font-medium text-amber-700">$2.1 Trillion in forgotten retirement money</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.08] tracking-tight text-zinc-900 mb-5">
              You probably have money{' '}
              <span className="text-amber-500">you forgot about.</span>
            </h1>

            <p className="text-lg leading-relaxed text-zinc-500 max-w-xl mb-8 mx-auto lg:mx-0">
              Most people have worked 10+ jobs in their lifetime. A lot of them left retirement money behind without knowing it. We find it for free in 30 seconds.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-8">
              <span className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700">
                <Shield className="h-4 w-4 text-green-500" />
                No SSN required
              </span>
              <span className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700">
                <DollarSign className="h-4 w-4 text-amber-500" />
                100% Free — always
              </span>
            </div>

            <Link
              href="/scan"
              className="inline-block rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-amber-200 hover:opacity-90 transition-opacity"
            >
              Find My Money
            </Link>

            {/* Soft email capture */}
            <div className="mt-5">
              {waitlistStatus === 'success' ? (
                <p className="text-sm text-zinc-400">
                  Check your inbox — we&apos;ll walk you through everything.
                </p>
              ) : (
                <form onSubmit={handleWaitlist} className="flex flex-col items-center gap-2 lg:items-start">
                  <p className="text-sm text-zinc-400">Not ready yet?</p>
                  <div className="flex gap-2 w-full max-w-sm">
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => { setWaitlistEmail(e.target.value); if (waitlistStatus === 'error') setWaitlistStatus('idle') }}
                      placeholder="your@email.com"
                      className="flex-1 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 placeholder-zinc-400 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={waitlistStatus === 'loading'}
                      className="shrink-0 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors disabled:opacity-50"
                    >
                      {waitlistStatus === 'loading' ? 'Sending…' : 'Send me instructions'}
                    </button>
                  </div>
                  {waitlistStatus === 'error' && (
                    <p className="text-xs text-red-400">Something went wrong — try again.</p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* Right: Graphic */}
          <div className="flex-shrink-0 w-full max-w-xs lg:max-w-sm">
            <div className="rounded-3xl bg-amber-50 p-6">
              <MoneyGraphic />
            </div>
          </div>

        </div>
      </section>

      {/* ── How simple it is ── */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-3 text-center text-4xl font-extrabold text-zinc-900">
            Three steps. Thirty seconds.
          </h2>
          <p className="mb-12 text-center text-lg text-zinc-500">No finance knowledge needed.</p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white text-lg font-extrabold shadow-md shadow-amber-200">
                  {step.n}
                </div>
                <p className="text-lg font-bold text-zinc-900">{step.title}</p>
                <p className="text-base leading-relaxed text-zinc-500">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why trust us ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-3 text-center text-4xl font-extrabold text-zinc-900">
            Built on trust
          </h2>
          <p className="mb-12 text-center text-lg text-zinc-500">We take your privacy seriously — here&apos;s exactly how.</p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TRUST.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
                  <Icon className="h-7 w-7 text-amber-500" />
                </div>
                <p className="mb-2 text-xl font-bold text-zinc-900">{title}</p>
                <p className="text-base leading-relaxed text-zinc-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-amber-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-3 text-center text-4xl font-extrabold text-zinc-900">
            Real people, real money found
          </h2>
          <p className="mb-12 text-center text-lg text-zinc-500">Everyday workers who found accounts they forgot about.</p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(({ initial, name, job, quote, stars }) => (
              <div key={name} className="flex flex-col gap-5 rounded-2xl border border-amber-100 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="flex-1 text-base leading-relaxed text-zinc-700">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-zinc-100">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{name}</p>
                    <p className="text-xs text-zinc-400">{job}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-3 text-center text-4xl font-extrabold text-zinc-900">
            Questions?
          </h2>
          <p className="mb-10 text-center text-lg text-zinc-500">We get it. Here are the most common ones.</p>

          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm divide-y divide-zinc-100">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-base font-semibold text-zinc-900">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-5 w-5 shrink-0 text-amber-500" />
                    : <ChevronDown className="h-5 w-5 shrink-0 text-zinc-400" />
                  }
                </button>
                {openFaq === i && (
                  <div className="border-t border-zinc-100 px-6 py-5 bg-amber-50/50">
                    <p className="text-base leading-relaxed text-zinc-600">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-zinc-900 py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-5xl font-extrabold text-white leading-tight">
            Your money is waiting.
          </h2>
          <p className="mb-10 text-xl text-zinc-400">
            It takes 30 seconds to find out.
          </p>
          <Link
            href="/scan"
            className="inline-block rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-10 py-5 text-xl font-bold text-white shadow-xl shadow-amber-900/30 hover:opacity-90 transition-opacity"
          >
            Find My Money
          </Link>
          <div className="mt-6 flex justify-center gap-6 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-zinc-600" />
              No SSN required
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-zinc-600" />
              100% Free
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-2 text-zinc-500">
            <Coins className="h-4 w-4" />
            <span className="text-sm font-semibold">VaultTrace</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/terms"   className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">Terms</Link>
            <Link href="/privacy" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">Privacy</Link>
            <Link href="/about"   className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">About</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
