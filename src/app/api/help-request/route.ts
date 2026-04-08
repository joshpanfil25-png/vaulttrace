import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildNotificationHtml(
  name: string,
  phone: string,
  email: string | null,
  pageUrl: string | null,
): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:90px;">
        <span style="font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;">${label}</span>
      </td>
      <td style="padding:8px 0;vertical-align:top;">
        <span style="font-size:14px;color:#e4e4e7;">${value}</span>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="background:linear-gradient(135deg,#f59e0b,#ea580c);border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:16px;font-weight:700;line-height:32px;">V</span>
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="color:#fafafa;font-size:15px;font-weight:600;letter-spacing:-0.3px;">Vault<span style="color:#f59e0b;">Trace</span></span>
                </td>
              </tr></table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">

              <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#fafafa;">New help request</p>
              <p style="margin:0 0 24px;font-size:13px;color:#71717a;">Someone needs assistance — follow up as soon as possible.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #27272a;border-radius:12px;padding:4px 16px;background-color:#09090b;">
                ${row('Name', name)}
                ${row('Phone', phone)}
                ${email ? row('Email', email) : ''}
                ${pageUrl ? row('Page', `<a href="${pageUrl}" style="color:#f59e0b;text-decoration:none;">${pageUrl}</a>`) : ''}
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#71717a;line-height:1.6;">
                This request was submitted via the "Need help?" button on VaultTrace.
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding-top:20px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">VaultTrace &mdash; Find what&rsquo;s still yours.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientIp(req))
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, phone, email, page_url } = body as {
    name?: unknown
    phone?: unknown
    email?: unknown
    page_url?: unknown
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
  }

  const trimmedName  = name.trim().slice(0, 200)
  const trimmedPhone = phone.trim().replace(/[^\d\s+\-().]/g, '').slice(0, 30)
  const trimmedEmail = typeof email === 'string' && email.trim() ? email.trim().slice(0, 254) : null
  const trimmedUrl   = typeof page_url === 'string' && page_url.trim() ? page_url.trim().slice(0, 500) : null

  const { error: dbError } = await supabase
    .from('help_requests')
    .insert({
      name:       trimmedName,
      phone:      trimmedPhone,
      email:      trimmedEmail,
      page_url:   trimmedUrl,
      created_at: new Date().toISOString(),
    })

  if (dbError) {
    console.error('[help-request] Supabase error:', dbError)
    return NextResponse.json({ error: 'Failed to save request. Please try again.' }, { status: 502 })
  }

  // Notification email — non-blocking; don't fail the request if email errors
  try {
    const { error: sendError } = await resend.emails.send({
      from:    'onboarding@vaulttrace.org',
      to:      'joshpanfil25@gmail.com',
      subject: `New help request from ${trimmedName}`,
      html:    buildNotificationHtml(trimmedName, trimmedPhone, trimmedEmail, trimmedUrl),
    })
    if (sendError) console.error('[help-request] Resend error:', sendError)
  } catch (err) {
    console.error('[help-request] Resend threw:', err)
  }

  return NextResponse.json({ success: true })
}
