import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { ExtractedMetric, SessionAnalysis, StoredSession } from '../../../lib/types';

export const runtime = 'nodejs';

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    rating: { type: 'string', enum: ['Exceptional','Strong','Solid','Mixed','Development session'] },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 4 },
    focusAreas: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 4 },
    trainingFocus: { type: 'string' },
    trendNotes: { type: 'array', items: { type: 'string' }, maxItems: 4 },
  },
  required: ['rating','summary','strengths','focusAreas','trainingFocus','trendNotes'],
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      session: { sessionType: string; sessionDate: string; durationMinutes?: number; metrics: ExtractedMetric[] };
      history?: StoredSession[];
      player?: { age?: number; gender?: string; competitionLevel?: string; position?: string };
    };
    if (!body.session?.metrics?.length) return NextResponse.json({ error: 'No verified metrics supplied.' }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.', code: 'missing_openai_key' }, { status: 503 });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const history = (body.history || []).slice(-12).map(s => ({ date: s.sessionDate, type: s.sessionType, metrics: s.metrics.map(m => ({ key:m.key, value:m.value, unit:m.unit })) }));
    const response = await client.responses.create({
      model: process.env.OPENAI_ANALYSIS_MODEL || 'gpt-5.6-sol',
      store: false,
      input: `Act as an elite hockey performance analyst, but remain conservative about what the data can prove. Analyze the verified session relative to the player's own recent history. Do not claim peer percentiles or medical conclusions unless supplied. Separate single-session noise from persistent trends. Make the training focus specific and actionable, but avoid overtraining prescriptions for a youth athlete.\n\nPlayer: ${JSON.stringify(body.player || {})}\nCurrent session: ${JSON.stringify(body.session)}\nRecent session history: ${JSON.stringify(history)}`,
      text: { format: { type: 'json_schema', name: 'hockey_session_analysis', strict: true, schema } },
    });
    return NextResponse.json(JSON.parse(response.output_text) as SessionAnalysis);
  } catch (error) {
    console.error('analyze error', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Analysis failed.' }, { status: 500 });
  }
}
