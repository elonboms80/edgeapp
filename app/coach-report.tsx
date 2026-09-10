'use client';

import { useRef, useState } from 'react';
import { ReportTimeline, reportStyles } from './report-visuals';
import { insights, formatMetric, metricDisplayUnit } from '../lib/analytics';
import { coachReport } from '../lib/coach-report';
import type { StoredSession } from '../lib/types';

export function CoachReport({sessions}:{sessions:StoredSession[]}) {
  const reportRef=useRef<HTMLDivElement>(null);
  const [sessionId,setSessionId]=useState('');
  const [context,setContext]=useState('');
  const [question,setQuestion]=useState('');
  const [status,setStatus]=useState('');
  const session=sessions.find(s=>s.id===sessionId) || sessions[sessions.length-1];
  const report=session ? coachReport(session,context,question,sessions) : '';
  const copy=async()=>{
    try {await navigator.clipboard.writeText(report);setStatus('Report copied. Paste it into your message to coach.');}
    catch {setStatus('Could not copy automatically. Select and copy the report preview below.');}
  };
  const download=()=>{
    const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EDGE Coach Report</title><style>'+reportStyles+'</style></head><body>'+reportRef.current?.outerHTML+'</body></html>';
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`edge-coach-report-${session?.sessionDate}.html`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Branded report downloaded with charts. Open it in a browser and print or save as PDF.');
  };
  return <section className="coachReport"><div className="sectionTitle"><div><span className="eyebrow">Session + context</span><h2>Share with your coach</h2></div></div>
    <p className="muted">Prepare an EDGE-branded briefing with session insights and progress charts. Download the visual report or copy the text for a message. You choose what to share and send it yourself.</p>
    {!session ? <p>Add a session first to create a report.</p> : <>
      <label className="reportField">Session<select value={session.id} onChange={e=>{setSessionId(e.target.value);setStatus('');}}>{[...sessions].reverse().map(s=><option key={s.id} value={s.id}>{s.sessionDate} · {s.sessionType}</option>)}</select></label>
      <label className="reportField">Session context<textarea value={context} maxLength={4000} onChange={e=>{setContext(e.target.value);setStatus('');}} placeholder="What drills did she work on? Anything different about this practice? What did you notice?" rows={3}/></label>
      <label className="reportField">What would you like coach’s feedback on?<textarea value={question} maxLength={2000} onChange={e=>{setQuestion(e.target.value);setStatus('');}} placeholder="For example: What should she focus on at her next practice?" rows={2}/></label>
      <style>{reportStyles}</style>
      <div ref={reportRef} className="edgeReport" aria-label="Branded coach report preview">
        <header><div><div className="edgeWordmark">▲ EDGE</div><small>HOCKEY PERFORMANCE INTELLIGENCE</small></div><div><h2>Coach briefing</h2><small>{session.sessionDate} · {session.sessionType}</small></div></header>
        <div className="edgeReportBody"><h4>Session context</h4><div className="edgeContext">{context.trim() || 'Add observations, drill focus, and session context above.'}</div>
          <h4>Session insights</h4><div className="edgeTakeaways">{insights(session).map(i=><article key={i.label} className="edgeTakeaway"><h3>{i.label}</h3><strong>{i.value}</strong><p>{i.note}</p></article>)}</div>
          {!insights(session).length && <p className="edgeNote">The recorded metrics below form this session’s baseline. Additional measurements are needed for derived insights.</p>}
          <h4>Progress over time</h4><p className="edgeNote">Same session type, through {session.sessionDate}. Changes describe recorded output, not necessarily improvement. Drill mix and recording coverage affect comparisons.</p><ReportTimeline sessions={sessions} session={session}/>
          <h4>Question for coach</h4><p className="edgeQuestion">{question.trim() || 'What should we focus on next?'}</p>
          <h4>Recorded measurements</h4><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>{session.metrics.map(m=><tr key={m.key}><td>{m.label}</td><td>{formatMetric(m)} {metricDisplayUnit(m)}</td></tr>)}</tbody></table>
        </div><footer>▲ EDGE · Prepared for coach review · Active time is not total practice duration. Peer rankings, fatigue and technique conclusions require additional evidence.</footer>
      </div>
      <details><summary>Plain-text version for messages</summary><label className="reportField">Report text<textarea className="reportPreview" readOnly value={report} rows={10}/></label></details>
      <div className="buttonRow"><button className="secondary" onClick={download}>Download branded report</button><button className="primary" onClick={copy}>Copy text report</button></div>
      <p role="status" className="muted small">{status}</p><p className="muted small">Preparing this report stays in your browser. Context fields clear when you leave this page; copy or download your report to keep it.</p>
    </>}
  </section>;
}
