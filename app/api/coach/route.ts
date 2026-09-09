import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { StoredSession } from '../../../lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { question, history, player } = await request.json() as { question?: string; history?: StoredSession[]; player?: Record<string, unknown> };
    if (!question?.trim()) return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.', code: 'missing_openai_key' }, { status: 503 });
    const sessions = (history || []).slice(-20).map(s => ({
      date:s.sessionDate, type:s.sessionType, duration:s.durationMinutes,
      metrics:s.metrics.map(m=>({key:m.key,label:m.label,value:m.value,unit:m.unit})),
      analysis:s.analysis,
    }));
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_ANALYSIS_MODEL || 'gpt-5.6-sol',
      store:false,
      input:[
        { role:'system', content:'You are EDGE Coach, a careful youth hockey performance analyst. Answer from the supplied verified session history. State when there is not enough data. Do not invent peer benchmarks. Avoid medical diagnosis. Keep answers practical, concise, and development-focused.' },
        { role:'user', content:`Player: ${JSON.stringify(player || {})}\nVerified season history: ${JSON.stringify(sessions)}\n\nQuestion: ${question}` },
      ],
    });
    return NextResponse.json({ answer: response.output_text });
  } catch (error) {
    console.error('coach error', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Coach request failed.' }, { status: 500 });
  }
}
