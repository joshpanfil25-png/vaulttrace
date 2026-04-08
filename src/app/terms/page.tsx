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

export default function TermsPage() {
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
          <h1 className="text-4xl text-zinc-100" style={SERIF}>Terms of Service</h1>
          <p className="text-sm text-zinc-500">
            Effective date: April 1, 2025 &nbsp;·&nbsp; Last updated: April 1, 2025
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            These Terms of Service govern your use of VaultTrace, operated by VaultTrace
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By using the service you
            agree to these terms. If you do not agree, do not use the service.
          </p>
        </div>

        {/* Sections */}
        <Section title="1. What VaultTrace Does">
          <p>
            VaultTrace is a research tool that helps individuals identify potential retirement
            accounts from past employers. It does this by cross-referencing employer information
            you provide against publicly available data from the U.S. Department of Labor (DOL)
            Form 5500 database, the Pension Benefit Guaranty Corporation (PBGC), and state
            unclaimed property registries.
          </p>
          <p>
            VaultTrace is an informational tool, not a financial services provider, registered
            investment adviser, or fiduciary. Nothing on this service constitutes financial,
            legal, or tax advice.
          </p>
        </Section>

        <Section title="2. User Responsibilities">
          <p>You agree to use VaultTrace only for lawful purposes and only on your own behalf
            or on behalf of individuals who have explicitly authorized you to act for them.
            You must not:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-zinc-400">
            <li>Upload documents that do not belong to you or that you are not authorized to process.</li>
            <li>Attempt to reverse-engineer, scrape, or abuse the service or its underlying APIs.</li>
            <li>Submit false, misleading, or fabricated information.</li>
            <li>Use the service in any way that violates applicable federal, state, or local law.</li>
            <li>Resell or redistribute your results for commercial purposes without our written consent.</li>
          </ul>
          <p>
            You are responsible for maintaining the confidentiality of any information you submit,
            including your email address and any optional Social Security Number used for registry
            lookups.
          </p>
        </Section>

        <Section title="3. No Guarantee of Finding Accounts">
          <p>
            A match in your results means VaultTrace found a retirement plan filing associated
            with an employer in the DOL database — it does not confirm that you personally have
            a balance in that plan, that the plan is still active, or that any funds are owed to
            you.
          </p>
          <p>
            Many factors can affect whether an account is found, including employer name
            variations, plan mergers, EIN changes, terminated plans, and the completeness of
            government databases. VaultTrace makes no warranty, express or implied, that all
            eligible accounts will be surfaced or that any match is accurate.
          </p>
          <p>
            Final confirmation of any account balance or vesting status must come directly from
            the plan administrator or the relevant government agency. VaultTrace results are a
            starting point for your own investigation, not a definitive record.
          </p>
        </Section>

        <Section title="4. Data Handling">
          <p>
            We are committed to handling your data responsibly. In brief:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5 text-zinc-400">
            <li>Uploaded PDF files are processed in memory and never written to disk or stored.</li>
            <li>Social Security Numbers, if provided, are used for a single registry lookup and never persisted.</li>
            <li>We retain extracted employer names, scan results, and your email address to provide the service and notify you of updates.</li>
          </ul>
          <p>
            For full details on what we collect, how long we keep it, and your rights, see our{' '}
            <Link href="/privacy" className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors">
              Privacy Policy
            </Link>.
          </p>
        </Section>

        <Section title="5. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, VaultTrace and its operators
            shall not be liable for any indirect, incidental, special, consequential, or punitive
            damages — including lost profits, lost data, or failure to find a retirement account —
            arising out of or in connection with your use of the service.
          </p>
          <p>
            Our total liability to you for any claim arising from these terms or your use of
            VaultTrace shall not exceed the amount you paid us in the twelve months preceding
            the claim (which, for a free service, is zero).
          </p>
          <p>
            Some jurisdictions do not allow certain liability exclusions; in those jurisdictions
            our liability is limited to the greatest extent permitted by law.
          </p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            The VaultTrace name, logo, interface, and underlying software are owned by us and
            may not be copied, reproduced, or used without our written permission. Your scan
            results belong to you.
          </p>
        </Section>

        <Section title="7. Third-Party Services">
          <p>
            VaultTrace relies on third-party services including Supabase (data storage),
            Anthropic (AI document parsing), Resend (transactional email), and government APIs
            operated by the DOL and PBGC. We are not responsible for the availability,
            accuracy, or conduct of these third parties.
          </p>
        </Section>

        <Section title="8. Changes to These Terms">
          <p>
            We may update these terms from time to time. The &ldquo;Last updated&rdquo; date at the top
            of this page will reflect any changes. Continued use of VaultTrace after an update
            constitutes acceptance of the revised terms.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about these terms? Email us at{' '}
            <a
              href="mailto:legal@vaulttrace.org"
              className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
            >
              legal@vaulttrace.org
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
              <Link href="/terms"   className="text-xs text-amber-500/70 hover:text-amber-400 transition-colors">Terms</Link>
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
