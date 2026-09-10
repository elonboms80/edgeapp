'use client';

import { useEffect, useMemo, useState } from 'react';
import { ReportTimeline, reportStyles } from './report-visuals';
import { CoachReport } from './coach-report';
import { formatMetric, metricDisplayUnit, insights } from '../lib/analytics';
import { getLocalSessions, saveLocalSession } from '../lib/local-sessions';
import type { ExtractedMetric, ExtractionResult, SessionAnalysis, StoredSession } from '../lib/types';

type Tab = 'home' | 'upload' | 'progress' | 'training' | 'coach';
type UploadStage = 'select' | 'verify' | 'analysis';

const Icon = ({name}:{name:string}) => <span className="icon" aria-hidden>{name}</span>;

function Header({title, eyebrow, action}:{title:string; eyebrow?:string; action?:React.ReactNode}) {
  return <header className="pageHeader"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1></div>{action}</header>
}

function BottomNav({tab,setTab}:{tab:Tab;setTab:(t:Tab)=>void}) {
  const items:[Tab,string,string][] = [['home','◆','Home'],['upload','＋','Upload'],['progress','▥','Progress'],['training','◎','Training'],['coach','✦','Coach']];
  return <nav className="bottomNav">{items.map(([id,icon,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}><Icon name={icon}/><span>{label}</span></button>)}</nav>;
}

function MetricCards({session}:{session:StoredSession}) {
  return <div className="metricGrid">{session.metrics.map(m=><article className="metricCard" key={m.key}><div className="metricLabel">{m.label}</div><div className="metricValue">{formatMetric(m)}<span>{metricDisplayUnit(m)}</span></div><div className="muted small">Recorded · {session.sessionDate}</div></article>)}</div>;
}
function Calculations({session}:{session:StoredSession}) {
  return <><div className="sectionTitle"><h2>Calculated from this session</h2></div><div className="metricGrid">{insights(session).map(m=><article className="metricCard" key={m.label}><div className="metricLabel">{m.label}</div><div className="metricValue">{m.value}</div><p className="muted small">{m.note}</p></article>)}</div></>;
}
function Home({setTab,sessions}:{setTab:(t:Tab)=>void;sessions:StoredSession[]}) {
  const latest=sessions[sessions.length-1];
  return <div className="page"><Header eyebrow="Your recorded sessions" title="Performance dashboard"/>
    <section className="heroCard"><div><span className="pill">{latest ? 'Recorded session' : 'Ready for your data'}</span><h2>{latest ? `${latest.sessionType} · ${latest.sessionDate}` : 'Start your season record'}</h2><p>{latest ? 'Your actual tracking metrics, with calculations kept separate from recorded values.' : 'Upload a tracking screenshot or import a session file to see your own metrics.'}</p></div><button className="primary" onClick={()=>setTab('upload')}>Add session</button></section>
    {latest && <><div className="sectionTitle"><h2>Performance snapshot</h2><button className="textButton" onClick={()=>setTab('progress')}>View progress →</button></div><MetricCards session={latest}/><Calculations session={latest}/><section className="whyCard"><h3>Missing measurements stay missing</h3><p>Only recorded metrics are shown. Active time is not total practice duration. No heart rate, hustle score, distance, or peer rank is inferred from other measurements.</p></section></>}
    <CoachReport sessions={sessions}/>
    <p className="muted small">Sessions are saved in this browser. They do not sync across devices; keep your source screenshots or session files.</p>
  </div>;
}

function Upload({onSaved}:{onSaved:()=>void}) {
  const importSession = async(file?:File) => {
    if (!file) return;
    try {
      const data=JSON.parse(await file.text());
      if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data.sessionDate) || !['practice','game','unknown'].includes(data.sessionType) || !Array.isArray(data.metrics) || !data.metrics.length || data.metrics.some((m:ExtractedMetric)=>!m || typeof m.key !== 'string' || typeof m.label !== 'string' || typeof m.unit !== 'string' || !Number.isFinite(m.value))) throw new Error('Invalid session file.');
      const stored:StoredSession={id:typeof data.id==='string'?data.id:crypto.randomUUID(), createdAt:new Date().toISOString(),sessionType:data.sessionType,sessionDate:data.sessionDate,metrics:data.metrics};
      saveLocalSession(stored); onSaved(); setError(''); setImported('Session imported. Open Home or Progress to see your data.');
    } catch(e) {setError(e instanceof Error?e.message:'Import failed.');}
  };
  const [imported,setImported]=useState('');
  const [saved,setSaved]=useState(false);
  const [stage,setStage]=useState<UploadStage>('select');
  const [files,setFiles]=useState<File[]>([]);
  const [result,setResult]=useState<ExtractionResult | null>(null);
  const [verified,setVerified]=useState<ExtractedMetric[]>([]);
  const [analysis,setAnalysis]=useState<SessionAnalysis | null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const previews = useMemo(()=>files.map(f=>({name:f.name,url:URL.createObjectURL(f)})),[files]);

  const runExtraction = async () => {
    if (!files.length) return;
    setBusy(true); setError('');
    try {
      const form = new FormData();
      files.forEach(file=>form.append('images', file));
      const response = await fetch('/api/extract', { method:'POST', body:form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not extract the screenshots.');
      setResult(data);
      setVerified(data.metrics);
      setSaved(false); setStage('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not extract the screenshots.');
    } finally { setBusy(false); }
  };

  const updateMetric = (index:number, value:string) => {
    const parsed = Number(value);
    setVerified(current=>current.map((m,i)=>i===index ? {...m, value:Number.isFinite(parsed)?parsed:m.value, confidence:1} : m));
  };

  const saveOnly = () => {
    if (!result || !verified.length) return;
    try {
      saveLocalSession({id:crypto.randomUUID(),createdAt:new Date().toISOString(),sessionType:result.sessionType,sessionDate:result.sessionDate || new Date().toISOString().slice(0,10),durationMinutes:result.durationMinutes,metrics:verified});
      onSaved();setSaved(true);setError('');
    } catch {setError('Could not save to this browser. Check available storage.');}
  };
  const saveAndAnalyze = async () => {
    if (!result || !verified.length) return;
    setBusy(true); setError('');
    const sessionDate = result.sessionDate || new Date().toISOString().slice(0,10);
    try {
      const history = getLocalSessions();
      const response = await fetch('/api/analyze', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          player:{},
          session:{ sessionType:result.sessionType, sessionDate, durationMinutes:result.durationMinutes, metrics:verified },
          history,
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not analyze the session.');
      const stored:StoredSession = {
        id: crypto.randomUUID(), createdAt:new Date().toISOString(), sessionType:result.sessionType,
        sessionDate, durationMinutes:result.durationMinutes, opponent:result.opponent,
        metrics:verified, analysis:data,
      };
      saveLocalSession(stored); onSaved();
      setAnalysis(data);
      setStage('analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not analyze the session.');
    } finally { setBusy(false); }
  };

  if(stage==='verify' && result) return <div className="page"><Header eyebrow="Step 2 of 2" title="Confirm your data"/><p className="lead">EDGE extracted these values from your screenshots. Low-confidence values are highlighted so you can fix them before anything enters the season record.</p>
    <section className="sessionMeta"><strong>{result.sessionType==='unknown'?'Session':result.sessionType[0].toUpperCase()+result.sessionType.slice(1)}</strong><span>{result.sessionDate || 'Date not detected'}</span><span>{result.durationMinutes ? `${result.durationMinutes} minutes` : 'Duration not detected'}</span></section>
    {result.warnings.length>0 && <section className="whyCard"><h3>Check these items</h3>{result.warnings.map(w=><p key={w}>• {w}</p>)}</section>}
    <section className="tableCard"><div className="tableTitle">Recognized metrics <span className="pill good">{verified.length} found</span></div>{verified.map((m,i)=><div className="dataRow" key={`${m.key}-${i}`}><span>{m.label}<small style={{display:'block',opacity:.6}}>{Math.round(m.confidence*100)}% confidence{m.sourceImage ? ` · image ${m.sourceImage}` : ''}</small></span><label className={m.confidence<0.8?'needsReview':''}><input inputMode="decimal" value={m.value} onChange={e=>updateMetric(i,e.target.value)}/><em>{m.unit}</em><b>{m.confidence>=.8?'✓':'!'}</b></label></div>)}</section>
    {error && <div className="errorBox">{error}</div>}
    <div className="buttonRow"><button className="secondary" disabled={busy || saved} onClick={saveOnly}>{saved ? 'Saved to dashboard' : 'Save without AI'}</button><button className="secondary" disabled={busy} onClick={()=>setStage('select')}>Back</button><button className="primary" disabled={busy || saved} onClick={saveAndAnalyze}>{busy?'Analyzing…':'Save & Analyze'}</button></div></div>;

  if(stage==='analysis' && analysis) return <div className="page"><Header eyebrow={`${result?.sessionType || 'Session'} · ${result?.sessionDate || 'latest'}`} title="Session analysis" action={<span className="pill good">{analysis.rating}</span>}/>
    <div className="metricGrid">{verified.slice(0,4).map(m=><article className="metricCard" key={m.key}><div className="metricLabel">{m.label}</div><div className="metricValue">{formatMetric(m)}<span>{metricDisplayUnit(m)}</span></div><div className="muted small">Verified</div></article>)}</div>
    <section className="analysisCard"><div className="coachMark">✦</div><div><h2>Coach's takeaway</h2><p>{analysis.summary}</p></div></section>
    <section className="ranked"><h2>Top focus areas</h2>{analysis.focusAreas.map((x,i)=><div key={x}><b>{i+1}</b><span>{x}</span></div>)}</section>
    <section className="focusCard"><div><span className="eyebrow">Training priority</span><h2>{analysis.trainingFocus}</h2></div></section>
    {analysis.trendNotes.length>0 && <section className="whyCard"><h3>Trend notes</h3>{analysis.trendNotes.map(x=><p key={x}>• {x}</p>)}</section>}
    <button className="primary full" onClick={()=>{setStage('select');setFiles([]);setResult(null);setAnalysis(null)}}>Upload another session</button></div>;

  return <div className="page"><Header eyebrow="New session" title="Upload tracking screenshots"/><section className="whyCard"><h3>Import a session file</h3><p>Imports directly into this browser, without sending the file to a server.</p><input aria-label="Import session JSON" type="file" accept=".json,application/json" onChange={e=>{void importSession(e.target.files?.[0]);e.target.value='';}}/>{imported && <p role="status">{imported}</p>}</section><p className="lead" style={{marginTop:20}}>Add screenshots from your tracking system. Screenshots are sent to the server and OpenAI for extraction. EDGE will extract the metrics, identify the session type when possible, and flag uncertain values for review.</p><label className="dropzone"><input type="file" accept="image/*" multiple onChange={e=>{setFiles(Array.from(e.target.files||[]));setError('')}}/><div className="uploadIcon">⇧</div><strong>Tap to choose screenshots</strong><span>PNG, JPG, WEBP or phone screenshots · up to 8 images</span></label>{previews.length>0 && <div className="previewGrid">{previews.map((p,i)=><div key={p.name}><img src={p.url} alt={`Selected screenshot ${i+1}`}/><span>✓</span></div>)}</div>}<section className="autoList"><h3>We'll automatically</h3><p>✓ Extract only visible metrics</p><p>✓ Attach confidence to every value</p><p>✓ Flag duplicates or unclear screenshots</p><p>✓ Compare the verified session with season history</p></section>{error && <div className="errorBox"><strong>Couldn’t process this upload.</strong><div>{error}</div><small>If you’re running the project locally, add OPENAI_API_KEY to .env.local.</small></div>}<button className="primary full" disabled={!files.length || busy} onClick={runExtraction}>{busy?'Reading screenshots…':files.length?`Analyze ${files.length} image${files.length>1?'s':''}`:'Select screenshots to continue'}</button></div>;
}
function Progress({sessions}:{sessions:StoredSession[]}) {
  const [key,setKey]=useState('');
  const latest=sessions[sessions.length-1];
  const selected=latest?.metrics.find(m=>m.key===key) || latest?.metrics[0];
  const matching=selected ? sessions.flatMap(s=>s.metrics.filter(m=>m.key===selected.key && m.unit===selected.unit).map(m=>({session:s,metric:m}))) : [];
  return <div className="page"><Header title="Season progress" action={<span className="pill">{sessions.length} sessions</span>}/><div className="statsTriplet"><div><b>{sessions.length}</b><span>Total sessions</span></div><div><b>{sessions.filter(s=>s.sessionType==='practice').length}</b><span>Practices</span></div><div><b>{sessions.filter(s=>s.sessionType==='game').length}</b><span>Games</span></div></div>
    {latest && <><div className="sectionTitle"><h2>Progress over time</h2></div><style>{reportStyles}</style><ReportTimeline sessions={sessions} session={latest}/><div className="sectionTitle"><h2>Recorded history</h2></div><label>Metric <select value={selected?.key} onChange={e=>setKey(e.target.value)}>{latest.metrics.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></label><section className="tableCard">{matching.map(({session,metric})=><div className="dataRow" key={session.id}><span>{session.sessionDate} · {session.sessionType}</span><strong>{formatMetric(metric)} {metricDisplayUnit(metric)}</strong></div>)}</section><Calculations session={latest}/></>}
    <section className="whyCard"><h3>{sessions.length<2 ? 'A baseline, not a trend yet' : 'Compare similar sessions'}</h3><p>More practices and games let us track changes in burst speed, acceleration, turnover, activity and load. Compare like-for-like sessions; drill mix and recording coverage can change the numbers.</p></section><section className="benchmarkCard"><h2>Peer comparison unavailable</h2><p>Peer percentages need a verified, comparable reference dataset. Your screenshots alone cannot establish a rank.</p></section></div>;
}
function Training() {
  return <div className="page"><Header eyebrow="Build an evidence-based plan" title="Development planning"/><section className="primaryFocus"><div><h2>Establish your baseline first</h2><p>A session summary cannot show late-practice fatigue, repeated-sprint ability, or a technique weakness. Review several comparable sessions with your coach before choosing a targeted training plan.</p></div></section><section className="whyCard"><h3>What to collect next</h3><p>More session screenshots for trends; drill runs or time-stamped effort data for consistency and fatigue; shift records for work/rest patterns; video for technique context.</p></section></div>;
}

function Coach() {
  const [messages,setMessages]=useState<{who:'user'|'coach';text:string}[]>([
    {who:'coach',text:'I can answer questions using every verified practice and game you save in EDGE. Upload sessions first, then ask about trends, development priorities, or game-vs-practice differences.'}
  ]);
  const [q,setQ]=useState('');
  const [busy,setBusy]=useState(false);
  const ask=async(question:string)=>{
    if(!question.trim() || busy)return;
    setMessages(m=>[...m,{who:'user',text:question}]); setQ(''); setBusy(true);
    try {
      const response=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        question, history:getLocalSessions(), player:{}
      })});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || 'Coach is unavailable.');
      setMessages(m=>[...m,{who:'coach',text:data.answer}]);
    } catch(e) {
      setMessages(m=>[...m,{who:'coach',text:e instanceof Error ? e.message : 'Coach is unavailable.'}]);
    } finally {setBusy(false)}
  };
  return <div className="page coachPage"><Header eyebrow="AI · season-aware" title="Ask Coach"/><p className="lead">Questions send your saved session metrics to the server and OpenAI for analysis. You can view Home and Progress without using AI.</p><div className="quickQs"><button onClick={()=>ask('What should she focus on before her next tournament?')}>Before a tournament?</button><button onClick={()=>ask('Is top speed improving across the season?')}>Top speed trend?</button><button onClick={()=>ask('Compare her games with her practices. What changes?')}>Games vs practices?</button></div><div className="messages">{messages.map((m,i)=><div key={i} className={`message ${m.who}`}>{m.who==='coach'&&<span>✦</span>}<p>{m.text}</p></div>)}{busy&&<div className="message coach"><span>✦</span><p>Analyzing verified season history…</p></div>}</div><form className="askBar" onSubmit={e=>{e.preventDefault();ask(q)}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about the season…" disabled={busy}/><button disabled={busy || !q.trim()}>→</button></form></div>;
}
export default function App() {
  const [tab,setTab]=useState<Tab>('home');
  const [sessions,setSessions]=useState<StoredSession[]>([]);
  const refresh=()=>setSessions(getLocalSessions());
  useEffect(()=>{refresh();},[]);
  return <main className="appShell"><div className="brandBar"><div className="brandMark">▲</div><div><strong>EDGE</strong><span>Hockey Performance Coach</span></div></div><div className="content">{tab==='home'&&<Home setTab={setTab} sessions={sessions}/>} {tab==='upload'&&<Upload onSaved={refresh}/>} {tab==='progress'&&<Progress sessions={sessions}/>} {tab==='training'&&<Training/>} {tab==='coach'&&<Coach/>}</div><BottomNav tab={tab} setTab={setTab}/></main>;
}
