import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, model, temperature, max_tokens, systemPrompt, language, apiKeyOverride, streamingEnabled } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    const effectiveKey = apiKeyOverride || apiKey;
    if (!effectiveKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const basePrompt =
      systemPrompt || 'You are a helpful, harmless, and honest AI assistant.';
    const languageSuffix = language ? `\n\nAlways respond in ${language}.` : '';
    const systemMessage = [{ role: 'system', content: basePrompt + languageSuffix }];

    const groqMessages = [...systemMessage, ...messages];

    const shouldStream = streamingEnabled !== false;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${effectiveKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: groqMessages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 2048,
        stream: shouldStream,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', err);
      return NextResponse.json(
        { error: `Groq API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    if (!shouldStream) {
      const data = await response.json();
      return NextResponse.json({
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let usageData: Record<string, number> | null = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.trim()) continue;
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  if (usageData) {
                    controller.enqueue(
                      encoder.encode(`data: [USAGE] ${JSON.stringify(usageData)}\n\n`)
                    );
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.x_groq?.usage) usageData = parsed.x_groq.usage;
                  } catch {}
                  controller.enqueue(encoder.encode(`${line}\n\n`));
                }
              }
            }
          }
        } catch (e) {
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
