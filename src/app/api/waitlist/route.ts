import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

console.log('[waitlist] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)

const resend = new Resend(process.env.RESEND_API_KEY)

const WELCOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the VaultTrace waitlist</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#ea580c);border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:16px;font-weight:700;line-height:32px;">V</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#fafafa;font-size:15px;font-weight:600;letter-spacing:-0.3px;">Vault<span style="color:#f59e0b;">Trace</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:36px 36px 32px;">

              <!-- Heading -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#fafafa;line-height:1.3;">
                You&rsquo;re on the list.
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
                Thanks for joining &mdash; here&rsquo;s how to get ready while you wait:
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="height:1px;background-color:#27272a;"></td></tr>
              </table>

              <!-- Steps -->
              <!-- Step 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="vertical-align:top;width:32px;">
                    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ea580c);text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#fff;">1</div>
                  </td>
                  <td style="padding-left:14px;vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#e4e4e7;">Get your IRS transcript</p>
                    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                      Go to
                      <a href="https://www.irs.gov/individuals/get-transcript" style="color:#f59e0b;text-decoration:none;">irs.gov/individuals/get-transcript</a>
                      to request your Wage &amp; Income Transcript.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="vertical-align:top;width:32px;">
                    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ea580c);text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#fff;">2</div>
                  </td>
                  <td style="padding-left:14px;vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#e4e4e7;">Download as a PDF</p>
                    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                      Sign in with your IRS account and download your <strong style="color:#a1a1aa;">Wage &amp; Income Transcript</strong> as a PDF file.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="vertical-align:top;width:32px;">
                    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ea580c);text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#fff;">3</div>
                  </td>
                  <td style="padding-left:14px;vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#e4e4e7;">Upload &amp; find your accounts</p>
                    <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                      Come back to
                      <a href="https://vaulttrace.vercel.app" style="color:#f59e0b;text-decoration:none;">vaulttrace.vercel.app</a>
                      and upload your transcript to find forgotten 401(k)s.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="height:1px;background-color:#27272a;"></td></tr>
              </table>

              <!-- Closing -->
              <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
                We&rsquo;ll reach out when your spot is ready. In the meantime, getting your transcript downloaded means you&rsquo;ll be able to run your search the moment access opens.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">
                VaultTrace &mdash; Find what&rsquo;s still yours.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientIp(req))
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email } = body as { email?: unknown }

  if (!email || typeof email !== 'string' || email.trim() === '') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const trimmedEmail = email.trim()

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const { error: dbError } = await supabase
    .from('waitlist')
    .insert({ email: trimmedEmail, joined_at: new Date().toISOString() })

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json(
        { error: 'This email is already on the waitlist' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 502 }
    )
  }

  // Send welcome email — non-blocking; don't fail the request if email errors
  try {
    const { data, error: sendError } = await resend.emails.send({
      from: 'onboarding@vaulttrace.org',
      to: trimmedEmail,
      subject: "You're on the VaultTrace waitlist",
      html: WELCOME_HTML,
    })
    if (sendError) {
      console.error('[waitlist] Resend send error:', JSON.stringify(sendError, null, 2))
    } else {
      console.log('[waitlist] Resend send success:', JSON.stringify(data, null, 2))
    }
  } catch (emailErr) {
    console.error('[waitlist] Resend threw exception:', emailErr)
  }

  return NextResponse.json({ success: true })
}
