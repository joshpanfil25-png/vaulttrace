import Link from 'next/link'
import { Coins, Clock } from 'lucide-react'

const SERIF = { fontFamily: 'var(--font-instrument-serif, "Instrument Serif", Georgia, serif)' }

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl text-zinc-100" style={SERIF}>{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
    </section>
  )
}

interface DataRowProps {
  label: string
  value: string
  emphasis?: 'positive' | 'negative' | 'neutral'
}

function DataRow({ label, value, emphasis = 'neutral' }: DataRowProps) {
  const valueColor =
    emphasis === 'positive' ? 'text-green-400' :
    emphasis === 'negative' ? 'text-red-400' :
    'text-zinc-300'
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-zinc-800/60 last:border-0">
      <span className="text-sm text-zinc-500 shrink-0">{label}</span>
      <span className={`text-sm text-right ${valueColor}`}>{value}</span>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950" style={{ fontFamily: 'var(--font-dm-sans, "DM Sans", sans-serif)' }}>

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
            <Link href="/" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">
              ← Back to app
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-14 flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-zinc-800/60 pb-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1">
            <span className="text-xs font-medium text-amber-400">Legal</span>
          </div>
          <h1 className="text-4xl text-zinc-100" style={SERIF}>Privacy Policy</h1>
          <p className="text-sm text-zinc-500">
            Effective date: April 1, 2025 &nbsp;·&nbsp; Last updated: April 1, 2025
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            This Privacy Policy explains what information VaultTrace collects when you use our
            service, how we use it, and what choices you have. We have designed VaultTrace to
            collect as little personal data as possible while still delivering useful results.
          </p>
        </div>

        {/* Quick-reference table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-800/60">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">At a glance</p>
          </div>
          <div className="px-5">
            <DataRow label="PDF files you upload"        value="Never stored — discarded after parsing"    emphasis="positive" />
            <DataRow label="Social Security Number"      value="Never persisted — single lookup only"      emphasis="positive" />
            <DataRow label="Raw IRS transcript"          value="Never written to disk or retained"         emphasis="positive" />
            <DataRow label="Email address"               value="Stored — used to send your results"        emphasis="neutral"  />
            <DataRow label="Employer names"              value="Stored — needed to display your results"   emphasis="neutral"  />
            <DataRow label="Scan results"                value="Stored — accessible in your report"        emphasis="neutral"  />
            <DataRow label="Third-party ad trackers"     value="None"                                      emphasis="positive" />
          </div>
        </div>

        {/* Sections */}
        <Section title="1. What We Collect">
          <p>
            When you run a scan, we collect the following:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <span className="text-zinc-300 font-medium">Email address</span> — if you provide
              one. Used to associate your scan with your session and to notify you of service
              updates if you opt in.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Employer names and EINs</span> — extracted
              from your uploaded transcript or entered manually. These are the core inputs
              used to run your search.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Scan results</span> — the matches we
              surface from DOL, PBGC, and state unclaimed property databases, including plan
              names, confidence scores, and filing years.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Scan metadata</span> — the timestamp
              of your scan, the scan type (IRS transcript, W-2, or quick scan), and the URL of
              the page you scanned from.
            </li>
          </ul>
          <p>
            If you join our waitlist or use the email capture on the results page, we store
            your email address in a separate waitlist table.
          </p>
        </Section>

        <Section title="2. What We Do Not Store">
          <p>
            We have deliberately designed the system to avoid retaining sensitive raw data:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <span className="text-zinc-300 font-medium">PDF files</span> — your uploaded
              transcript or W-2 is read into server memory, parsed by our AI model to extract
              employer details, and then immediately discarded. The file is never written to
              disk or stored in any database.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Social Security Numbers</span> — if you
              optionally provide your SSN to improve search accuracy, it is used for a single
              registry cross-reference during your scan and is never inserted into any database,
              log file, or storage system.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Raw transcript content</span> — we
              extract only structured employer data (names and EINs). The full text content of
              your IRS document is not retained.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Payment information</span> — VaultTrace
              is currently free and does not collect any payment or billing data.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We use the data we collect for the following purposes:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>To run your employer search and return results.</li>
            <li>To generate and deliver your downloadable PDF report.</li>
            <li>To notify you when we add new data sources, if you have opted in.</li>
            <li>To understand aggregate usage patterns and improve the service (no personally identifiable data is shared externally for this purpose).</li>
          </ul>
          <p>
            We do not sell your data. We do not share it with advertisers. We do not use it to
            build marketing profiles.
          </p>
        </Section>

        <Section title="4. How Long We Keep Your Data">
          <p>
            Scan results (employer names, matches, and email address) are retained in our
            database indefinitely unless you request deletion. We may introduce automatic
            retention limits in the future and will update this policy accordingly.
          </p>
          <p>
            Waitlist email addresses are retained until you request removal.
          </p>
          <p>
            Server logs, if any, are retained for up to 30 days for debugging and security
            purposes and then purged.
          </p>
        </Section>

        <Section title="5. Third-Party Services">
          <p>
            VaultTrace uses the following third-party services to operate. Each has its own
            privacy policy:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <span className="text-zinc-300 font-medium">Supabase</span> — stores scan results,
              email addresses, and waitlist entries in a cloud-hosted PostgreSQL database.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Anthropic</span> — processes your
              uploaded PDF in memory to extract employer names. Document content is subject to
              Anthropic&rsquo;s data usage policies for API customers.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Resend</span> — sends transactional
              emails (waitlist confirmation, scan reports) on our behalf.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">DOL EFAST2, PBGC, and state agencies</span>{' '}
              — public APIs queried with only employer names and EINs to look up retirement
              plan filings. No personal data is sent to these services.
            </li>
          </ul>
        </Section>

        <Section title="6. Your Rights">
          <p>
            You have the right to:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <span className="text-zinc-300 font-medium">Request a copy</span> of the personal
              data we hold about you.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Request deletion</span> of your scan
              history, email address, or any other data we have stored.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Opt out</span> of any future
              communications from us.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a
              href="mailto:privacy@vaulttrace.org"
              className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              privacy@vaulttrace.org
            </a>{' '}
            with your email address and the specific request. We will respond within 30 days.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            All data in transit is protected by TLS 1.2 or higher. Our database is hosted on
            Supabase with row-level security enabled. We enforce strict HTTP security headers
            including HSTS, Content Security Policy, and X-Frame-Options on all responses.
          </p>
          <p>
            For a detailed breakdown of our technical security measures, see our{' '}
            <Link href="/security" className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors">
              Security page
            </Link>.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this policy as the service evolves. The &ldquo;Last updated&rdquo; date at the
            top of this page will reflect any changes. For material changes we will make a
            reasonable effort to notify users who have provided an email address.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions or requests? Email us at{' '}
            <a
              href="mailto:privacy@vaulttrace.org"
              className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              privacy@vaulttrace.org
            </a>.
          </p>
        </Section>

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
              <Link href="/privacy" className="text-xs text-amber-500/70 hover:text-amber-400 transition-colors">Privacy</Link>
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
