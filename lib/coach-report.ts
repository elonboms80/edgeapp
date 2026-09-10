import { formatMetric, metricDisplayUnit } from './analytics';
import type { StoredSession } from './types';

export function coachReport(session: StoredSession, context: string, question: string) {
  return [
    'SESSION REPORT',
    `${session.sessionType === 'unknown' ? 'Session' : session.sessionType[0].toUpperCase() + session.sessionType.slice(1)} · ${session.sessionDate}`,
    ...(session.durationMinutes ? [`Total duration: ${session.durationMinutes} min`] : []),
    '', 'CONTEXT', context.trim() || 'No additional context provided.',
    '', 'RECORDED METRICS',
    ...session.metrics.map(m => `${m.label}: ${formatMetric(m)} ${metricDisplayUnit(m)}`.trim()),
    '', 'QUESTION FOR COACH', question.trim() || 'What should we focus on next?',
    '', 'Data notes: These are tracking measurements from one session. Active time is not total practice duration. No peer rank or season trend is implied.'
  ].join('\n');
}
