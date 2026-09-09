# EDGE — Hockey Performance Coach

A mobile-first MVP for turning hockey tracking screenshots into verified session data, season intelligence, and individualized development guidance.

## What is real in this build

- Multi-image session upload
- Vision-based metric extraction via the OpenAI Responses API
- Strict structured extraction schema (metric key, value, unit, confidence, source image)
- Human verification/edit step before saving
- Session analysis that compares the new session with verified recent history
- Browser-persistent session history for zero-config local development
- Season-aware Ask Coach endpoint
- UI for season trends, benchmarking, and development plans
- Supabase production schema for players, sessions, images, metrics, analyses, and plans

The sample percentile benchmark UI is deliberately marked as prototype data until a validated comparison dataset is connected.

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Add your OpenAI API key:

```bash
OPENAI_API_KEY=...
```

4. Install dependencies and run:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## AI pipeline

### `POST /api/extract`
Accepts multipart form data with one or more `images`. It sends the screenshots as image inputs, extracts only visible metrics, assigns confidence, and returns normalized structured JSON. The request uses `store: false`.

### Verification
The client highlights values below 80% confidence. User edits are promoted to confidence 1.0. No downstream analysis happens before this step.

### `POST /api/analyze`
Receives the verified metrics plus up to 12 recent sessions. It produces a structured session rating, summary, strengths, focus areas, training focus, and trend notes.

### `POST /api/coach`
Receives a natural-language question plus up to 20 verified sessions. It is instructed not to invent benchmarks and to state when the data is insufficient.

## Persistence

For immediate zero-config testing, verified sessions are saved to browser `localStorage` under `edge.hockey.sessions.v1`. This means the pipeline works without a database account.

For production, use `/supabase/schema.sql` and replace the local storage adapter with Supabase. The schema already separates raw session images, metrics, analyses, and plans so re-analysis can happen later without re-extracting screenshots.

## Recommended production hardening

- Supabase Auth + Row Level Security before multi-user launch
- Private Storage bucket for session screenshots
- Signed uploads / resumable uploads for large mobile images
- Server-side rate limiting
- Image retention/deletion settings
- Benchmark provenance table with cohort definition, sample size, source, and effective date
- Parent/guardian consent flow for youth athlete accounts
- Evaluation set of representative tracker screenshots to measure extraction accuracy before launch
