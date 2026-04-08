import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import type { EmployerResult } from '@/components/ResultsDashboard'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface EmailResultsRequest {
  results: EmployerResult[]
  email: string
  scanned_at?: string
}

// ─── Design tokens (email-safe hex only) ─────────────────────────────────────

const C = {
  bg:          '#09090b',
  surface:     '#18181b',
  surfaceAlt:  '#1c1c1f',
  border:      '#27272a',
  amber:       '#f59e0b',
  amberLight:  '#fde68a',
  amberDark:   '#b45309',
  text:        '#fafafa',
  textMid:     '#e4e4e7',
  textMuted:   '#71717a',
  textFaint:   '#3f3f46',
  green:       '#4ade80',
  greenBg:     '#052e16',
  greenBorder: '#166534',
  yellow:      '#fbbf24',
  yellowBg:    '#1c1400',
  red:         '#f87171',
  redBg:       '#1c0a0a',
  white:       '#ffffff',
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildEmailHtml(results: EmployerResult[], email: string, scannedAt?: string): string {
  const found    = results.filter((r) => r.has_401k)
  const notFound = results.filter((r) => !r.has_401k)
  const scanDate = scannedAt
    ? new Date(scannedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  function confLabel(score: number): string {
    if (score >= 70) return 'High'
    if (score >= 40) return 'Medium'
    return 'Low'
  }
  function confColor(score: number): string {
    if (score >= 70) return C.green
    if (score >= 40) return C.yellow
    return C.red
  }
  function confBg(score: number): string {
    if (score >= 70) return C.greenBg
    if (score >= 40) return C.yellowBg
    return C.redBg
  }

  // ── Found-accounts rows ───────────────────────────────────────────────────
  const foundRows = found.length === 0
    ? `<tr><td colspan="4" style="padding:16px;text-align:center;font-size:13px;color:${C.textMuted};">No 401(k) accounts found in this scan.</td></tr>`
    : found.map((emp, i) => {
        const score = emp.confidence_score ?? 0
        const bg    = i % 2 === 0 ? C.surface : C.surfaceAlt
        return `
          <tr style="background-color:${bg};">
            <td style="padding:10px 14px;font-size:13px;color:${C.textMid};border-bottom:1px solid ${C.border};">
              <span style="font-weight:600;color:${C.text};">${emp.employer_name}</span>
              ${emp.ein ? `<br/><span style="font-size:11px;color:${C.textMuted};">EIN ${emp.ein}</span>` : ''}
            </td>
            <td style="padding:10px 14px;font-size:12px;color:${C.textMuted};border-bottom:1px solid ${C.border};">
              ${emp.plan_name ?? '—'}
            </td>
            <td style="padding:10px 14px;font-size:11px;border-bottom:1px solid ${C.border};text-align:center;">
              ${emp.last_filing_year ?? '—'}
            </td>
            <td style="padding:10px 14px;border-bottom:1px solid ${C.border};text-align:center;">
              <span style="display:inline-block;background-color:${confBg(score)};color:${confColor(score)};font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px;">
                ${score}% ${confLabel(score)}
              </span>
            </td>
          </tr>`
      }).join('')

  // ── All-employers compact list ─────────────────────────────────────────────
  const allEmployersHtml = results.map((emp) => {
    const dot   = emp.has_401k ? C.amber : C.textFaint
    const label = emp.has_401k ? '401(k) found' : 'No filing'
    return `
      <tr>
        <td style="padding:6px 14px;font-size:12px;color:${C.textMid};border-bottom:1px solid ${C.border};">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background-color:${dot};margin-right:8px;vertical-align:middle;"></span>
          ${emp.employer_name}
        </td>
        <td style="padding:6px 14px;font-size:11px;color:${emp.has_401k ? C.amber : C.textMuted};border-bottom:1px solid ${C.border};text-align:right;">
          ${label}
        </td>
      </tr>`
  }).join('')

  // ── PBGC callout ──────────────────────────────────────────────────────────
  const pbgcFound = results.filter((r) => r.pbgc_plans && r.pbgc_plans.length > 0)
  const pbgcHtml  = pbgcFound.length === 0 ? '' : `
    <tr>
      <td style="padding:0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c1a2e;border:1px solid #1e3a5f;border-radius:10px;">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:0.05em;">PBGC Pension Plans Found</p>
              <p style="margin:0;font-size:13px;color:#93c5fd;">
                ${pbgcFound.map((r) => `${r.employer_name} (${r.pbgc_plans!.length} plan${r.pbgc_plans!.length !== 1 ? 's' : ''})`).join(' &nbsp;·&nbsp; ')}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  // ── Next steps ────────────────────────────────────────────────────────────
  const steps = [
    'Contact each plan administrator directly using the EIN and plan name shown above. Request a participant statement confirming your account balance and vesting status.',
    'If a plan has been terminated, file a claim through the <strong style="color:${C.textMid};">DOL Abandoned Plan Program</strong> at dol.gov or the <strong style="color:${C.textMid};">PBGC Missing Participants Program</strong> at pbgc.gov.',
    'Consider rolling your found accounts into your current employer\'s plan or a rollover IRA to simplify long-term management.',
    'Search state unclaimed property databases for each employer using the links in your online VaultTrace results.',
  ].map((step, i) => `
    <tr>
      <td style="padding:0 0 14px 0;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align:top;padding-right:14px;">
              <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,${C.amber},#ea580c);text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#fff;">${i + 1}</div>
            </td>
            <td style="vertical-align:top;padding-top:4px;">
              <p style="margin:0;font-size:13px;color:${C.textMuted};line-height:1.6;">${step}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your VaultTrace Results</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.bg};padding:40px 16px;">
  <tr>
    <td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <tr>
        <td style="background:linear-gradient(135deg,${C.amber},#ea580c);border-radius:16px 16px 0 0;padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="background:rgba(0,0,0,0.2);border-radius:8px;width:34px;height:34px;text-align:center;vertical-align:middle;">
                    <span style="color:${C.white};font-size:16px;font-weight:700;line-height:34px;">V</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:${C.white};font-size:16px;font-weight:700;letter-spacing:-0.3px;">VaultTrace</span>
                  </td>
                </tr></table>
              </td>
              <td style="text-align:right;vertical-align:middle;">
                <span style="font-size:12px;color:rgba(255,255,255,0.75);">${scanDate}</span>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 4px;font-size:22px;font-weight:700;color:${C.white};line-height:1.2;">Your retirement scan results</p>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);">Scanned for: ${email}</p>
        </td>
      </tr>

      <!-- ── Summary stats ──────────────────────────────────────────────── -->
      <tr>
        <td style="background-color:${C.surface};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding:20px 24px;border-right:1px solid ${C.border};text-align:center;">
                <p style="margin:0;font-size:32px;font-weight:700;color:${found.length > 0 ? C.amber : C.textMuted};">${found.length}</p>
                <p style="margin:4px 0 0;font-size:11px;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em;">Accounts found</p>
              </td>
              <td width="50%" style="padding:20px 24px;text-align:center;">
                <p style="margin:0;font-size:32px;font-weight:700;color:${C.textMid};">${results.length}</p>
                <p style="margin:4px 0 0;font-size:11px;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em;">Employers scanned</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── Main card ──────────────────────────────────────────────────── -->
      <tr>
        <td style="background-color:${C.surface};border:1px solid ${C.border};border-top:0;border-radius:0 0 16px 16px;padding:28px 28px 32px;">

          <!-- Found accounts table -->
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.06em;">Found Accounts</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:10px;overflow:hidden;margin-bottom:28px;">
            <tr style="background-color:${C.bg};">
              <th style="padding:9px 14px;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid ${C.border};">Employer</th>
              <th style="padding:9px 14px;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid ${C.border};">Plan Name</th>
              <th style="padding:9px 14px;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em;text-align:center;border-bottom:1px solid ${C.border};">Filed</th>
              <th style="padding:9px 14px;font-size:10px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.05em;text-align:center;border-bottom:1px solid ${C.border};">Confidence</th>
            </tr>
            ${foundRows}
          </table>

          ${pbgcHtml ? `<table width="100%" cellpadding="0" cellspacing="0"><tbody>${pbgcHtml}</tbody></table>` : ''}

          <!-- All employers list -->
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.06em;">All Employers Scanned</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:10px;overflow:hidden;margin-bottom:28px;">
            <tbody>${allEmployersHtml}</tbody>
          </table>

          <!-- Divider -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="height:1px;background-color:${C.border};"></td></tr>
          </table>

          <!-- Next steps -->
          <p style="margin:0 0 18px;font-size:11px;font-weight:700;color:${C.textMuted};text-transform:uppercase;letter-spacing:0.06em;">Next Steps</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tbody>${steps}</tbody></table>

          <!-- Disclaimer -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td style="height:1px;background-color:${C.border};"></td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:${C.textFaint};line-height:1.6;">
            Results are based on public DOL Form 5500 filings and do not guarantee an active account balance.
            Final confirmation must come from the plan administrator. This email does not constitute financial or legal advice.
          </p>

        </td>
      </tr>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <tr>
        <td style="padding-top:20px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${C.amber};">VaultTrace</p>
          <p style="margin:0;font-size:11px;color:${C.textFaint};">Find what&rsquo;s still yours &mdash; vaulttrace.org</p>
        </td>
      </tr>

    </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientIp(req))
  if (limited) return limited

  let body: EmailResultsRequest
  try {
    body = (await req.json()) as EmailResultsRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { results, email, scanned_at } = body

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: 'results array is required' }, { status: 400 })
  }

  const trimmedEmail = email.trim()
  const found = results.filter((r) => r.has_401k)
  const subject = found.length > 0
    ? `Your VaultTrace results — ${found.length} account${found.length !== 1 ? 's' : ''} found`
    : 'Your VaultTrace scan results'

  try {
    const { error: sendError } = await resend.emails.send({
      from:    'onboarding@vaulttrace.org',
      to:      trimmedEmail,
      subject,
      html:    buildEmailHtml(results, trimmedEmail, scanned_at),
    })
    if (sendError) {
      console.error('[email-results] Resend error:', sendError)
      return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 502 })
    }
  } catch (err) {
    console.error('[email-results] Resend threw:', err)
    return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
