import { formatMetric, metricDisplayUnit } from '../lib/analytics';
import { chartMetrics, metricHistory, progressSummary } from '../lib/progress';
import type { ExtractedMetric, StoredSession } from '../lib/types';

function HistoryChart({sessions,session,metric}:{sessions:StoredSession[];session:StoredSession;metric:ExtractedMetric}) {
  const rows=metricHistory(sessions,session,metric);
  const dates=rows.map(r=>Date.parse(r.date+'T12:00:00Z'));const start=Math.min(...dates),end=Math.max(...dates);
  const values=rows.map(r=>r.metric.value), low=Math.min(...values), high=Math.max(...values);
  const pad=Math.max((high-low)*.2,Math.abs(high)*.05,.1), min=Math.max(0,low-pad),max=high+pad;
  const x=(i:number)=>end===start?230:60+(dates[i]-start)/(end-start)*350;
  const y=(v:number)=>155-(v-min)/(max-min)*110;
  const axis=(v:number)=>normalizedSeconds(metric.unit)?`${(v/60).toFixed(1)}m`:Number(v.toFixed(2)).toString();
  return <article className="edgeChart"><div className="edgeChartHeading"><h3>{metric.label}</h3><strong>{formatMetric(metric)} <small>{metricDisplayUnit(metric)}</small></strong></div>
    <svg viewBox="0 0 460 205" role="img" aria-label={`${metric.label}: ${rows.map(r=>`${r.date}, ${formatMetric(r.metric)} ${metricDisplayUnit(r.metric)}`).join('; ')}`}>
      {[min,(min+max)/2,max].map(v=><g key={v}><line x1="60" x2="410" y1={y(v)} y2={y(v)} stroke="#dbe4ee"/><text x="50" y={y(v)+4} textAnchor="end" fill="#64748b" fontSize="11">{axis(v)}</text></g>)}
      {rows.length>1 && end>start && <polyline points={rows.map((r,i)=>`${x(i)},${y(r.metric.value)}`).join(' ')} fill="none" stroke="#1671e8" strokeWidth="3"/>}
      {rows.map((r,i)=><circle key={r.id} cx={x(i)} cy={y(r.metric.value)} r="5" fill="#1671e8"><title>{r.date}: {formatMetric(r.metric)} {metricDisplayUnit(r.metric)}</title></circle>)}
      <text x="60" y="183" fill="#64748b" fontSize="11">{rows[0]?.date}</text>{end>start && <text x="410" y="183" textAnchor="end" fill="#64748b" fontSize="11">{rows[rows.length-1]?.date}</text>}
    </svg><p>{progressSummary(sessions,session,metric)}</p><small>{rows.length} recorded values · {session.sessionType} sessions · Vertical scale fits recorded values</small>
    <details><summary>View chart data</summary><table><thead><tr><th>Date</th><th>Value</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.date}</td><td>{formatMetric(r.metric)} {metricDisplayUnit(r.metric)}</td></tr>)}</tbody></table></details>
  </article>;
}
function normalizedSeconds(unit:string){return ['s','sec','secs','second','seconds'].includes(unit.trim().toLowerCase());}
export function ReportTimeline({sessions,session}:{sessions:StoredSession[];session:StoredSession}) {
  return <div className="edgeCharts">{chartMetrics(session).map(m=><HistoryChart key={m.key} sessions={sessions} session={session} metric={m}/>)}</div>;
}
export const reportStyles=`
.edgeReport{background:#fff;color:#0a1b2d;border:1px solid #dbe4ee;border-radius:20px;overflow:hidden;margin-top:24px;font-family:Arial,sans-serif;line-height:1.5}.edgeReport *{box-sizing:border-box}.edgeReport header{padding:28px;background:#071e38;color:white;display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}.edgeWordmark{font-style:italic;font-size:30px;letter-spacing:3px;font-weight:900}.edgeReport header small{display:block;color:#bed8f5}.edgeReport h2{margin:3px 0;font-size:24px}.edgeReportBody{padding:24px}.edgeReport h3{margin:0;font-size:15px}.edgeReport h4{margin:24px 0 10px;text-transform:uppercase;letter-spacing:1px;font-size:12px;color:#53687f}.edgeCharts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.edgeChart{min-width:0;padding:16px;background:white;border:1px solid #dbe4ee;border-radius:14px;break-inside:avoid}.edgeChartHeading strong{font-size:23px;display:block;color:#0b3158}.edgeChartHeading small{font-size:12px}.edgeChart svg{width:100%;height:auto}.edgeChart p{font-size:13px;margin:0 0 8px}.edgeChart small{font-size:11px;color:#64748b}.edgeChart details{margin-top:12px;font-size:12px}.edgeChart summary{cursor:pointer}.edgeReport table,.edgeChart table{width:100%;border-collapse:collapse;font-size:13px}.edgeReport th,.edgeReport td,.edgeChart td,.edgeChart th{text-align:left;border-bottom:1px solid #e8eef5;padding:9px 4px}.edgeTakeaways{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.edgeTakeaway{background:#edf5ff;padding:16px;border-radius:12px;break-inside:avoid}.edgeTakeaway strong{display:block;color:#0b3158;font-size:23px}.edgeTakeaway p{font-size:12px;margin:4px 0;color:#53687f}.edgeContext{white-space:pre-wrap;background:#f5f8fb;padding:16px;border-left:3px solid #1671e8;border-radius:6px}.edgeReport footer{padding:18px 24px;background:#f5f8fb;font-size:11px;color:#53687f}.edgeReport .edgeNote{font-size:12px;color:#53687f}.edgeReport .edgeQuestion{font-size:16px;color:#0b3158;white-space:pre-wrap}@media(max-width:600px){.edgeCharts,.edgeTakeaways{grid-template-columns:1fr}.edgeReportBody{padding:16px}.edgeReport header{padding:20px}}@media print{.edgeReport{border:0;margin:0}.edgeReport header,.edgeTakeaway{-webkit-print-color-adjust:exact;print-color-adjust:exact}.edgeReport details{display:none}.edgeCharts{grid-template-columns:repeat(2,minmax(0,1fr))}body{margin:0}.edgeReport h4{break-after:avoid}}
`;
