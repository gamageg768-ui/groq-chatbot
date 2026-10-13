import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const { userMessage, assistantMessage } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ title: '' }, { status: 200 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content:
              'Generate a very short chat title (3-5 words). Reply with ONLY the title — no quotes, no punctuation at the end, no explanation.',
          },
          {
            role: 'user',
            content: `User: ${String(userMessage).slice(0, 300)}\nAssistant: ${String(assistantMessage).slice(0, 300)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 20,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ title: '' }, { status: 200 });
    }

    const result = await response.json();
    const title = result.choices?.[0]?.message?.content?.trim() || '';
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: '' }, { status: 200 });
  }
}
