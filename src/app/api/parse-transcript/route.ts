import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a tax document parser specializing in IRS Wage & Income transcripts.

Extract every employer record and return ONLY a JSON array with no explanation or markdown.

Each object must have exactly these fields:
- employer_name (string): The full employer name. IRS transcripts often split long names across multiple lines — reconstruct them into a single clean string.
- ein (string | null): The Employer Identification Number in XX-XXXXXXX format. If not present, set to null.
- has_redacted_ein (boolean): Set to true if the EIN is partially masked (e.g. "XX-XXX1234" or "**-***6789"). Extract whatever visible digits remain into ein; still set ein to null only if no digits are visible at all.
- years_employed (string): The year range or individual years listed (e.g. "2018-2020" or "2021").

Rules:
- Reconstruct multi-line employer names into one string — do not include line-break artifacts.
- If an EIN contains X or * masking characters, set has_redacted_ein to true and place the partial value in ein.
- If the EIN is fully absent, set ein to null and has_redacted_ein to false.
- Return ONLY the JSON array. No prose, no markdown fences.`

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientIp(req))
  if (limited) return limited

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')

  let message: Anthropic.Message
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extract all employer records from this tax transcript and return the JSON array.',
            },
          ],
        },
      ],
    })
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? err.message : 'Anthropic API error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const textBlock = message.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text'
  )
  if (!textBlock) {
    return NextResponse.json({ error: 'No text response from model' }, { status: 502 })
  }

  let employers: unknown
  try {
    // Strip markdown code fences if the model wraps the JSON
    const cleaned = textBlock.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    employers = JSON.parse(cleaned)
  } catch {
    return NextResponse.json(
      { error: 'Model returned invalid JSON', raw: textBlock.text },
      { status: 502 }
    )
  }

  return NextResponse.json({ employers })
}
