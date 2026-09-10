'use client';

import { useState } from 'react';
import { coachReport } from '../lib/coach-report';
import type { StoredSession } from '../lib/types';

export function CoachReport({sessions}:{sessions:StoredSession[]}) {
  const [sessionId,setSessionId]=useState('');
  const [context,setContext]=useState('');
  const [question,setQuestion]=useState('');
  const [status,setStatus]=useState('');
  const session=sessions.find(s=>s.id===sessionId) || sessions[sessions.length-1];
  const report=session ? coachReport(session,context,question) : '';
  const copy=async()=>{
    try {await navigator.clipboard.writeText(report);setStatus('Report copied. Paste it into your message to coach.');}
    catch {setStatus('Could not copy automatically. Select and copy the report preview below.');}
  };
  const download=()=>{
    const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`coach-report-${session?.sessionDate}.txt`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('Report downloaded.');
  };
  return <section className="coachReport"><div className="sectionTitle"><div><span className="eyebrow">Session + context</span><h2>Share with your coach</h2></div></div>
    <p className="muted">Prepare a report to paste into a text or email. You choose what to share and send it yourself.</p>
    {!session ? <p>Add a session first to create a report.</p> : <>
      <label className="reportField">Session<select value={session.id} onChange={e=>{setSessionId(e.target.value);setStatus('');}}>{[...sessions].reverse().map(s=><option key={s.id} value={s.id}>{s.sessionDate} · {s.sessionType}</option>)}</select></label>
      <label className="reportField">Session context<textarea value={context} maxLength={4000} onChange={e=>{setContext(e.target.value);setStatus('');}} placeholder="What drills did she work on? Anything different about this practice? What did you notice?" rows={3}/></label>
      <label className="reportField">What would you like coach’s feedback on?<textarea value={question} maxLength={2000} onChange={e=>{setQuestion(e.target.value);setStatus('');}} placeholder="For example: What should she focus on at her next practice?" rows={2}/></label>
      <label className="reportField">Report preview<textarea className="reportPreview" readOnly value={report} rows={14}/></label>
      <div className="buttonRow"><button className="secondary" onClick={download}>Download report</button><button className="primary" onClick={copy}>Copy report</button></div>
      <p role="status" className="muted small">{status}</p><p className="muted small">Preparing this report stays in your browser. Context fields clear when you leave this page; copy or download your report to keep it.</p>
    </>}
  </section>;
}
