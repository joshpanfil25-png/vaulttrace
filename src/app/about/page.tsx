import Link from 'next/link'
import { ArrowLeft, Coins, Clock, Database, FileSearch, Shield, SlidersHorizontal } from 'lucide-react'

const SERIF = { fontFamily: 'var(--font-instrument-serif, "Instrument Serif", Georgia, serif)' }

export default function AboutPage() {
  return (
    <div
      className="flex flex-col min-h-screen bg-zinc-950"
      style={{ fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)' }}
    >

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Vault<span className="text-amber-400">Trace</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to scan
          </Link>
        </div>
      </nav>

      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-14 flex flex-col gap-14">

        {/* ── Origin story ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1">
              <span className="text-xs font-medium text-amber-400">About</span>
            </div>
            <h1 className="text-4xl text-zinc-100" style={SERIF}>
              Why I built this
            </h1>
          </div>

          {/* Profile card */}
          <div className="flex items-start gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-xl font-bold text-white shadow-lg shadow-amber-500/20">
              J
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-zinc-100">Josh Panfil</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-400">
            <p>
              I&rsquo;m Josh, a finance sophomore at USC. Last year I came across a statistic that
              stopped me mid-scroll: Americans have over{' '}
              <span className="text-zinc-200 font-medium">$2.1 trillion</span> sitting in forgotten
              401(k) accounts — money that belongs to real people who simply lost track of it when
              they changed jobs.
            </p>
            <p>
              Most of those people don&rsquo;t know the money exists. The process to find it is
              genuinely painful: you&rsquo;d need to remember every employer you&rsquo;ve ever had,
              look up each one in the DOL database manually, and file paperwork to make a claim. Nobody
              has time for that.
            </p>
            <p>
              So I built VaultTrace in two days to do it automatically. Upload your IRS Wage &amp;
              Income Transcript, and VaultTrace reconstructs your full employer history, cross-references
              it against the DOL retirement plan database, and surfaces likely matches — in about 20
              seconds.
            </p>
            <p className="text-zinc-300 font-medium border-l-2 border-amber-500/50 pl-4">
              &ldquo;Find what&rsquo;s still yours.&rdquo; That&rsquo;s the whole thing.
            </p>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl text-zinc-100" style={SERIF}>How it works</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              The technical version, for those who want to know exactly what&rsquo;s happening to their data.
            </p>
          </div>

          <div className="flex flex-col gap-4">

            {/* Step 1 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-zinc-800/60 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <FileSearch className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-100">Step 1 — IRS transcript parsing</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-400">
                <p>
                  Your IRS Wage &amp; Income Transcript is a PDF that lists every employer who
                  reported wages on your behalf going back to 1993. It contains the employer&rsquo;s name
                  and their EIN (Employer Identification Number) — the tax ID that uniquely identifies
                  each business.
                </p>
                <p>
                  VaultTrace passes the raw PDF bytes to a{' '}
                  <span className="text-zinc-300">Claude AI vision model</span>, which reads the
                  document and extracts each employer record. IRS transcripts are tricky — employer
                  names are truncated to 35 characters and EINs are sometimes partially redacted.
                  The parser reconstructs multi-line names and handles redacted EINs by falling back
                  to fuzzy name matching against a local EIN reference database of common employers.
                </p>
                <p>
                  The transcript is processed entirely in memory and discarded the moment parsing
                  completes. We never write it to disk.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-zinc-800/60 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Database className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-100">Step 2 — DOL Form 5500 database</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-400">
                <p>
                  Any employer that offers a retirement plan with more than one participant must file
                  an annual{' '}
                  <span className="text-zinc-300">Form 5500</span> with the Department of Labor. The
                  DOL publishes all of these filings going back to 2000 through their{' '}
                  <span className="text-zinc-300">EFAST2</span> system — roughly 800,000 active plans.
                </p>
                <p>
                  For each employer in your transcript, VaultTrace queries the EFAST2 API first by
                  EIN (exact match), then by name (fuzzy match as fallback). A hit means that employer
                  filed a 5500, which is strong evidence a retirement plan existed — and may still
                  contain your contributions.
                </p>
                <p>
                  We also check the{' '}
                  <span className="text-zinc-300">PBGC Missing Participants Program</span> (for
                  terminated pension plans) and{' '}
                  <span className="text-zinc-300">10 state unclaimed property databases</span> in
                  parallel, so the total scan time is roughly as long as the slowest single lookup —
                  usually 10–20 seconds.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-zinc-800/60 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-sm font-semibold text-zinc-100">Step 3 — Confidence scoring</p>
              </div>
              <div className="px-5 py-4 flex flex-col gap-2.5 text-sm leading-relaxed text-zinc-400">
                <p>
                  Every match gets a score from 0–95%. The score is built from weighted signals:
                </p>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                  {[
                    ['+40', 'DOL Form 5500 filing found'],
                    ['+20', 'Verified EIN (not redacted)'],
                    ['+15', 'PBGC pension registry match'],
                    ['+10', 'Filing dated 2020 or later'],
                    ['+10', 'Filing overlaps your employment years'],
                    ['+10', 'State unclaimed property match'],
                    ['−10', 'Name-only match (no EIN)'],
                  ].map(([pts, label]) => (
                    <div key={label} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60 last:border-0">
                      <span className={`w-8 shrink-0 text-xs font-bold tabular-nums ${
                        pts.startsWith('+') ? 'text-green-400' : 'text-red-400'
                      }`}>{pts}</span>
                      <span className="text-xs text-zinc-400">{label}</span>
                    </div>
                  ))}
                </div>
                <p>
                  Scores are capped at 95% because final confirmation always requires contacting the
                  plan administrator directly. A high score means the evidence is strong — it
                  doesn&rsquo;t guarantee an active balance.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── Data security ─────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl text-zinc-100" style={SERIF}>Data security</h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/10 ring-1 ring-green-500/20">
              <Shield className="h-4 w-4 text-green-400" />
            </div>
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-400">
              <p>
                Your uploaded files are processed in memory and deleted immediately — never written
                to disk or stored on our servers. If you optionally provide your SSN for a registry
                cross-reference, it is used for that single lookup and never persisted anywhere.
              </p>
              <p>
                We store only what&rsquo;s needed to show your results: the extracted employer names,
                scan matches, and your email address if you provided one. All connections are
                TLS-encrypted. We use zero third-party ad trackers.
              </p>
              <Link
                href="/security"
                className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Read the full security breakdown →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Contact ───────────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl text-zinc-100" style={SERIF}>Get in touch</h2>
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-400">
            <p>
              Questions, feedback, or found a bug? I&rsquo;d genuinely love to hear from you —
              especially if VaultTrace helped you find something.
            </p>
            <a
              href="mailto:josh@vaulttrace.org"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-amber-500/40 hover:text-amber-400"
            >
              josh@vaulttrace.org
            </a>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Coins className="h-3.5 w-3.5" />
            <span className="font-semibold">VaultTrace</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Link href="/terms"   className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</Link>
              <Link href="/about"   className="text-xs text-amber-500/70 hover:text-amber-400 transition-colors">About</Link>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-700">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Data sourced from DOL EFAST2</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
