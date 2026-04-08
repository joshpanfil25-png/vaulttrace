import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

export type OutreachStatus = 'sent' | 'responded' | 'confirmed' | 'not_found'

export interface OutreachParams {
  /** Name of the employer that sponsored the plan */
  employerName: string
  /** Official plan name from DOL/registry records */
  planName: string
  /** Full name of the participant being researched */
  clientName: string
  /** Email address of the plan administrator or HR/benefits contact */
  toEmail: string
  /** Optional: name of the advisor or firm sending the inquiry */
  senderName?: string
}

export interface OutreachRecord {
  id: string
  employer_name: string
  plan_name: string
  client_name: string
  to_email: string
  subject: string
  letter_html: string
  resend_id: string | null
  status: OutreachStatus
  sent_at: string
  updated_at: string
}

export interface OutreachResult {
  success: boolean
  outreachId: string | null
  error?: string
}

// ─── Letter generation ────────────────────────────────────────────────────────

async function generateLetter(params: OutreachParams): Promise<{ subject: string; html: string }> {
  const { employerName, planName, clientName, senderName } = params
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: `You are a professional benefits attorney drafting formal inquiry letters to retirement plan administrators.
Write in a professional, courteous tone. Letters must be concise (under 350 words of body text), factually neutral,
and free of any pressure language. Output only the letter body — no salutation line, no sign-off, no subject line.
Use plain paragraphs; do not use bullet points or headers. Today's date is ${today}.`,
    messages: [
      {
        role: 'user',
        content: `Draft a formal written inquiry letter body to the plan administrator of "${planName}"
(sponsored by ${employerName}) on behalf of participant ${clientName}.

The letter should:
1. Identify the writer as an authorized representative conducting a retirement-benefit search on behalf of ${clientName}
2. State that records indicate ${clientName} may have been a participant in ${planName} during their employment with ${employerName}
3. Request confirmation of participant status and, if confirmed, information on how to initiate a distribution or rollover
4. Reference ERISA Section 105 and the plan administrator's obligation to respond to participant inquiries
5. Provide a professional closing requesting a response within 30 days
${senderName ? `6. The letter is sent on behalf of ${senderName}` : ''}

Output only the letter body paragraphs. Do not include a date line, inside address, salutation, or signature block.`,
      },
    ],
  })

  const response = await stream.finalMessage()

  const letterBody = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()

  const subject = `Retirement Plan Participant Inquiry — ${clientName} / ${planName}`

  const html = buildEmailHtml({
    subject,
    employerName,
    planName,
    clientName,
    senderName,
    letterBody,
    today,
  })

  return { subject, html }
}

// ─── HTML email builder ───────────────────────────────────────────────────────

function buildEmailHtml(opts: {
  subject: string
  employerName: string
  planName: string
  clientName: string
  senderName: string | undefined
  letterBody: string
  today: string
}): string {
  const { subject, planName, clientName, senderName, letterBody, today } = opts

  // Convert plain paragraphs to <p> tags
  const bodyHtml = letterBody
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;line-height:1.7;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">

          <!-- Logo bar -->
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#ea580c);border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:14px;font-weight:700;line-height:28px;">V</span>
                  </td>
                  <td style="padding-left:8px;vertical-align:middle;">
                    <span style="color:#18181b;font-size:14px;font-weight:600;letter-spacing:-0.3px;">Vault<span style="color:#f59e0b;">Trace</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Letter card -->
          <tr>
            <td style="background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:40px 44px 36px;">

              <!-- Date -->
              <p style="margin:0 0 32px;font-size:13px;color:#71717a;">${today}</p>

              <!-- Subject line -->
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Re:</p>
              <p style="margin:0 0 32px;font-size:15px;font-weight:600;color:#18181b;">
                Retirement Plan Participant Inquiry — ${clientName}
              </p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="height:1px;background-color:#e4e4e7;"></td></tr>
              </table>

              <!-- Salutation -->
              <p style="margin:0 0 20px;font-size:14px;color:#3f3f46;line-height:1.7;">Dear Plan Administrator,</p>

              <!-- Body -->
              ${bodyHtml}

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 24px;">
                <tr><td style="height:1px;background-color:#e4e4e7;"></td></tr>
              </table>

              <!-- Sign-off -->
              <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">Respectfully,</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#18181b;">${senderName ?? 'VaultTrace Participant Services'}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#71717a;">On behalf of ${clientName}</p>

            </td>
          </tr>

          <!-- Meta footer -->
          <tr>
            <td style="padding:20px 4px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fff8ed;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
                    <p style="margin:0;font-size:11px;color:#92400e;line-height:1.6;">
                      <strong>Plan referenced:</strong> ${planName}<br/>
                      This inquiry was generated by VaultTrace, a retirement-benefit search service. Responses may be sent directly to the contact information provided by the requesting party.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a formal ERISA inquiry letter via Claude, sends it via Resend,
 * and records the outreach in Supabase with status "sent".
 */
export async function sendOutreachEmail(params: OutreachParams): Promise<OutreachResult> {
  // 1. Generate letter
  let subject: string
  let letterHtml: string
  try {
    const result = await generateLetter(params)
    subject = result.subject
    letterHtml = result.html
  } catch (err) {
    console.error('[outreach] Letter generation failed:', err)
    return { success: false, outreachId: null, error: 'Failed to generate letter' }
  }

  // 2. Send via Resend
  let resendId: string | null = null
  try {
    const { data, error: sendError } = await resend.emails.send({
      from: 'inquiries@vaulttrace.org',
      to: params.toEmail,
      subject,
      html: letterHtml,
    })
    if (sendError) {
      console.error('[outreach] Resend error:', sendError)
      return { success: false, outreachId: null, error: 'Failed to send email' }
    }
    resendId = data?.id ?? null
  } catch (err) {
    console.error('[outreach] Resend threw:', err)
    return { success: false, outreachId: null, error: 'Failed to send email' }
  }

  // 3. Persist to Supabase
  const now = new Date().toISOString()
  const { data: row, error: dbError } = await supabase
    .from('outreach')
    .insert({
      employer_name: params.employerName,
      plan_name: params.planName,
      client_name: params.clientName,
      to_email: params.toEmail,
      subject,
      letter_html: letterHtml,
      resend_id: resendId,
      status: 'sent' satisfies OutreachStatus,
      sent_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (dbError) {
    // Email sent but DB write failed — log but still return success
    console.error('[outreach] Supabase insert error:', dbError.message)
    return { success: true, outreachId: null }
  }

  return { success: true, outreachId: (row as { id: string }).id }
}

/**
 * Updates the status of an existing outreach record.
 * Call this when you receive a response from the plan administrator.
 */
export async function updateOutreachStatus(
  outreachId: string,
  status: OutreachStatus,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('outreach')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', outreachId)

  if (error) {
    console.error('[outreach] Status update failed:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Fetches all outreach records for a given client name.
 */
export async function getOutreachByClient(
  clientName: string,
): Promise<OutreachRecord[]> {
  const { data, error } = await supabase
    .from('outreach')
    .select('*')
    .eq('client_name', clientName)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('[outreach] Fetch error:', error.message)
    return []
  }

  return (data ?? []) as OutreachRecord[]
}
