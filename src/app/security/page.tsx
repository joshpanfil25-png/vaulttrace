import { ArrowLeft, CheckCircle2, Clock, Coins, FileX, Lock, Server, Shield, Wifi } from 'lucide-react'
import Link from 'next/link'

const guarantees = [
  {
    icon: FileX,
    title: 'Your PDF is never stored',
    body: 'When you upload your IRS transcript, it is read into memory, processed immediately by our parser, and discarded. The raw file is never written to disk, never saved in a database, and never retained after the request completes.',
  },
  {
    icon: Shield,
    title: 'Your SSN is never stored',
    body: 'If you optionally provide your Social Security Number for registry cross-referencing, it is used only for that single lookup during your session. It is never persisted to any database, log, or storage system.',
  },
  {
    icon: Lock,
    title: 'All data in transit is encrypted',
    body: 'Every connection to VaultTrace is protected by TLS 1.2 or higher. Data sent between your browser and our servers is encrypted end-to-end. We enforce HTTPS with HSTS and reject plain HTTP connections.',
  },
  {
    icon: Server,
    title: 'Our servers never see your raw document',
    body: 'Your transcript PDF is sent directly to an AI parser which extracts only employer names and EINs — structured text with no personally identifiable information. The original document bytes are immediately freed from memory after parsing.',
  },
  {
    icon: Wifi,
    title: 'Transcript processed in memory and immediately discarded',
    body: 'Processing is fully in-memory with no intermediate file writes. Once employer names are extracted, the transcript data is garbage-collected. Nothing from your document persists beyond the scope of your scan.',
  },
]

const technical = [
  { label: 'Encryption in transit', value: 'TLS 1.2 / 1.3' },
  { label: 'Document retention', value: 'Zero — discarded on request completion' },
  { label: 'SSN storage', value: 'Never persisted' },
  { label: 'PDF storage', value: 'Never written to disk' },
  { label: 'Data at rest', value: 'Employer names and scan results only' },
  { label: 'Security headers', value: 'CSP, HSTS, X-Frame-Options, nosniff' },
  { label: 'Third-party trackers', value: 'None' },
]

export default function SecurityPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">

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
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
              About
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to scan
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-16 flex flex-col gap-14">

        {/* Hero */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 ring-1 ring-green-500/20">
              <Shield className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-100">Security &amp; Privacy</h1>
              <p className="text-sm text-zinc-500">How VaultTrace protects your data</p>
            </div>
          </div>

          <p className="text-base text-zinc-400 leading-relaxed max-w-2xl">
            You're trusting us with sensitive financial documents. Here's exactly what happens to your data — with no vague reassurances.
          </p>

          {/* Trust badge strip */}
          <div className="flex flex-wrap gap-2 pt-1">
            {['No file storage', 'No SSN retention', 'TLS encrypted', 'No trackers', 'No selling data'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/5 px-3 py-1 text-xs font-medium text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Guarantee cards */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Our guarantees</h2>
          <div className="flex flex-col divide-y divide-zinc-800/60 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {guarantees.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 px-6 py-5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/10 ring-1 ring-green-500/20">
                  <Icon className="h-4 w-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 mb-1">{title}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical summary table */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Technical summary</h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {technical.map(({ label, value }, i) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-4 px-6 py-3.5 ${i !== technical.length - 1 ? 'border-b border-zinc-800/60' : ''}`}
              >
                <span className="text-sm text-zinc-400">{label}</span>
                <span className="text-sm font-medium text-green-400 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What we do store */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">What we do store</h2>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col gap-3">
            <p className="text-sm text-zinc-300 leading-relaxed">
              To deliver your results and let you revisit them, we store:
            </p>
            <ul className="flex flex-col gap-2">
              {[
                'Your email address (so we can send you your report)',
                'The list of employer names extracted from your transcript',
                'The DOL and pension plan matches found during your scan',
                'The timestamp of your scan',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-600 pt-1">
              We never store your PDF, your SSN, or any raw document content. Employer names are extracted text — not financial records.
            </p>
          </div>
        </div>

        {/* CTA back */}
        <div className="flex justify-center pb-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-amber-500/20 transition-opacity hover:opacity-90"
          >
            Start your free scan
            <Shield className="h-3.5 w-3.5" />
          </Link>
        </div>

      </main>

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
              <Link href="/about"   className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">About</Link>
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
