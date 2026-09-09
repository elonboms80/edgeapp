import type { ExtractedMetric } from './types';

const canonical: Record<string, { label: string; unit: string }> = {
  top_speed: { label: 'Top Speed', unit: 'mph' },
  average_speed: { label: 'Average Speed', unit: 'mph' },
  total_distance: { label: 'Total Distance', unit: 'mi' },
  high_intensity_distance: { label: 'High-Intensity Distance', unit: 'mi' },
  sprints: { label: 'Sprints', unit: '' },
  accelerations: { label: 'Accelerations', unit: '' },
  decelerations: { label: 'Decelerations', unit: '' },
  average_shift_length: { label: 'Average Shift Length', unit: 'sec' },
  work_rate: { label: 'Work Rate', unit: '%' },
  max_acceleration: { label: 'Max Acceleration', unit: 'm/s²' },
  max_deceleration: { label: 'Max Deceleration', unit: 'm/s²' },
};

export function normalizeMetrics(metrics: ExtractedMetric[]) {
  return metrics
    .filter((m) => Number.isFinite(m.value))
    .map((m) => {
      const key = m.key.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const def = canonical[key];
      return {
        ...m,
        key,
        label: def?.label || m.label,
        unit: m.unit || def?.unit || '',
        confidence: Math.max(0, Math.min(1, m.confidence ?? 0.5)),
      };
    });
}
