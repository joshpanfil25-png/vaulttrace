import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/sanitize'

const client = new Anthropic()

interface ParsedEmployer {
  employer_name: string
  years_employed: string
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(getClientIp(req))
  if (limited) return limited

  let text: string
  try {
    const body = await req.json()
    text = sanitizeText(body.text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  if (text.length > 20_000) {
    return NextResponse.json({ error: 'Text too long — paste only the Work Experience section' }, { status: 413 })
  }

  let responseText: string
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system:
        'Extract every employer name and years worked from this LinkedIn profile text. ' +
        'Return ONLY a JSON array: [{ employer_name, years_employed }]. ' +
        'No EINs will be present — that is expected.',
      messages: [{ role: 'user', content: text }],
    })
    const block = message.content[0]
    responseText = block.type === 'text' ? block.text : ''
  } catch (err) {
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Failed to parse work history' }, { status: 502 })
  }

  // Extract JSON array from Claude's response — it may be wrapped in markdown fences
  const jsonMatch = responseText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    return NextResponse.json(
      { error: 'Could not extract employer list — please paste a larger section of your LinkedIn profile' },
      { status: 422 },
    )
  }

  let employers: ParsedEmployer[]
  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown[]
    employers = parsed
      .filter((e): e is Record<string, unknown> =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as Record<string, unknown>).employer_name === 'string' &&
        (e as Record<string, unknown>).employer_name !== '',
      )
      .map((e) => ({
        employer_name: String(e.employer_name).trim(),
        years_employed: String(e.years_employed ?? '').trim(),
      }))
  } catch {
    return NextResponse.json({ error: 'Malformed response from parser' }, { status: 422 })
  }

  if (employers.length === 0) {
    return NextResponse.json(
      { error: 'No employers found — make sure you pasted the Work Experience section' },
      { status: 422 },
    )
  }

  return NextResponse.json({ employers })
}
