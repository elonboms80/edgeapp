import type { ExtractedMetric, StoredSession } from './types';

function isSeconds(unit: string) {
  return ['s', 'sec', 'secs', 'second', 'seconds'].includes(unit.trim().toLowerCase());
}
export function metricDisplayUnit(m: ExtractedMetric) {
  return isSeconds(m.unit) ? 'min:sec' : m.unit;
}
export function formatMetric(m: ExtractedMetric) {
  if (isSeconds(m.unit)) {
    const seconds = Math.round(m.value);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return String(m.value);
}
export function insights(session: StoredSession) {
  const value = (key: string, unit: string) => session.metrics.find(m => m.key === key && (unit === 'sec' ? isSeconds(m.unit) : m.unit === unit))?.value;
  const active = value('active_time', 'sec'), stride = value('stride_time', 'sec');
  const avg = value('burst_speed_avg', 'mph'), max = value('burst_speed_max', 'mph');
  const left = value('symmetry_left', '%'), right = value('symmetry_right', '%');
  const result: {label: string; value: string; note: string}[] = [];
  if (active && stride !== undefined && stride >= 0 && stride <= active) {
    result.push({label:'Striding share of active time', value:`${(100 * stride / active).toFixed(1)}%`, note:'Stride time ÷ active time. A time share, not an efficiency or fitness score.'});
    result.push({label:'Active time outside striding', value:formatMetric({value:active-stride, unit:'sec'} as ExtractedMetric), note:'Active time minus stride time; this is not bench or rest time.'});
  }
  if (avg !== undefined && max && avg <= max) result.push({label:'Average-to-maximum burst speed', value:`${(100 * avg / max).toFixed(1)}%`, note:`${avg} ÷ ${max} mph. Describes this session; it does not measure fatigue or repeatability.`});
  if (left !== undefined && right !== undefined) result.push({label:'Left–right share difference', value:`${Math.abs(left-right)} percentage points`, note:`${left}% left / ${right}% right. Descriptive only; drill mix can affect the split.`});
  return result;
}
