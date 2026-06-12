import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }

    const groqForm = new FormData();
    groqForm.append('file', audioFile, 'recording.webm');
    groqForm.append('model', 'whisper-large-v3');
    groqForm.append('response_format', 'json');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq transcription error:', err);
      return NextResponse.json({ error: 'Transcription failed' }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json({ text: result.text || '' });
  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
