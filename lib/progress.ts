import type { ExtractedMetric, StoredSession } from './types';
import { formatMetric, metricDisplayUnit } from './analytics';
export function normalizedUnit(unit:string) {
  return ['s','sec','secs','second','seconds'].includes(unit.trim().toLowerCase()) ? 'sec' : unit.trim().toLowerCase();
}
export function metricHistory(sessions:StoredSession[], selected:StoredSession, metric:ExtractedMetric) {
  return sessions.filter(s=>s.sessionType===selected.sessionType && s.sessionDate<=selected.sessionDate)
    .slice().sort((a,b)=>a.sessionDate.localeCompare(b.sessionDate)||a.createdAt.localeCompare(b.createdAt))
    .flatMap(s=>{
      const m=s.metrics.find(m=>m.key===metric.key && normalizedUnit(m.unit)===normalizedUnit(metric.unit) && Number.isFinite(m.value));
      return m ? [{id:s.id,date:s.sessionDate,metric:m}] : [];
    });
}
export function progressSummary(sessions:StoredSession[], selected:StoredSession, metric:ExtractedMetric) {
  const rows=metricHistory(sessions,selected,metric);
  const prior=rows.filter(r=>r.date<selected.sessionDate);
  if (!prior.length) return 'Baseline recorded. Add another dated session of the same type to compare.';
  const previous=prior[prior.length-1];const delta=metric.value-previous.metric.value;
  const change=previous.metric.value===0 ? null : 100*delta/Math.abs(previous.metric.value);
  return `${delta===0?'Unchanged':delta>0?'Higher':'Lower'} than ${previous.date}${change===null?'':` (${change>0?'+':''}${change.toFixed(1)}%)`}. Previous: ${formatMetric(previous.metric)} ${metricDisplayUnit(previous.metric)}.`;
}
export function chartMetrics(session:StoredSession) {
  const keys=['burst_speed_max','top_speed','acceleration_max','max_acceleration','turnover_rate_avg','active_time','load'];
  const ordered=[...session.metrics].sort((a,b)=>(keys.includes(a.key)?keys.indexOf(a.key):99)-(keys.includes(b.key)?keys.indexOf(b.key):99));
  return ordered.slice(0,4);
}
