import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { normalizeMetrics } from '../../../lib/metric-normalizer';
import type { ExtractionResult } from '../../../lib/types';

export const runtime = 'nodejs';

const extractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sessionType: { type: 'string', enum: ['practice', 'game', 'unknown'] },
    sessionDate: { type: ['string', 'null'], description: 'YYYY-MM-DD if visible or confidently inferable from the screenshots.' },
    durationMinutes: { type: ['number', 'null'] },
    opponent: { type: ['string', 'null'] },
    metrics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
          value: { type: 'number' },
          unit: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          sourceImage: { type: ['number', 'null'] },
          notes: { type: ['string', 'null'] },
        },
        required: ['key', 'label', 'value', 'unit', 'confidence', 'sourceImage', 'notes'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['sessionType', 'sessionDate', 'durationMinutes', 'opponent', 'metrics', 'warnings'],
} as const;

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || 'image/jpeg'};base64,${bytes.toString('base64')}`;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const images = form.getAll('images').filter((v): v is File => v instanceof File);
    if (!images.length) return NextResponse.json({ error: 'No screenshots received.' }, { status: 400 });
    if (images.length > 8) return NextResponse.json({ error: 'Upload up to 8 screenshots per session.' }, { status: 400 });
    for (const image of images) {
      if (image.size > 10 * 1024 * 1024) return NextResponse.json({ error: `${image.name} is larger than 10MB.` }, { status: 400 });
      if (!image.type.startsWith('image/')) return NextResponse.json({ error: `${image.name} is not an image.` }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured on the server.', code: 'missing_openai_key' }, { status: 503 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageParts = await Promise.all(images.map(async (image) => ({
      type: 'input_image' as const,
      image_url: await fileToDataUrl(image),
      detail: 'high' as const,
    })));

    const response = await client.responses.create({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-5.6-luna',
      store: false,
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `You are the data-ingestion layer for a youth hockey performance analytics application. Extract ONLY metrics visibly supported by these tracking screenshots. Do not invent numbers. Normalize obvious labels into stable snake_case keys. Preserve the displayed units. Confidence should reflect how clearly the value is visible and how certain the label/value pairing is. If two screenshots duplicate the same metric, return one best value and mention the duplicate in warnings. If the screenshots appear to describe different sessions, warn the user. Session type should only be practice/game if visible or very clear from context; otherwise unknown.`,
          },
          ...imageParts,
        ],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'hockey_session_extraction',
          strict: true,
          schema: extractionSchema,
        },
      },
    });

    const raw = JSON.parse(response.output_text) as ExtractionResult & { sessionDate?: string | null; durationMinutes?: number | null; opponent?: string | null };
    const result: ExtractionResult = {
      sessionType: raw.sessionType,
      sessionDate: raw.sessionDate || undefined,
      durationMinutes: raw.durationMinutes ?? undefined,
      opponent: raw.opponent || undefined,
      metrics: normalizeMetrics(raw.metrics).map(m => ({ ...m, sourceImage: m.sourceImage ?? undefined, notes: m.notes ?? undefined })),
      warnings: raw.warnings || [],
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error('extract error', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Extraction failed.' }, { status: 500 });
  }
}
