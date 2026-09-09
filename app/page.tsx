'use client';

import { useMemo, useState } from 'react';
import { drills, metrics, type Metric } from '../lib/data';
import { getLocalSessions, saveLocalSession } from '../lib/local-sessions';
import type { ExtractedMetric, ExtractionResult, SessionAnalysis, StoredSession } from '../lib/types';

type Tab = 'home' | 'upload' | 'progress' | 'training' | 'coach';
type UploadStage = 'select' | 'verify' | 'analysis';

const Icon = ({name}:{name:string}) => <span className="icon" aria-hidden>{name}</span>;

function Sparkline({ metric, large=false }: { metric: Metric; large?: boolean }) {
  const w = large ? 620 : 190, h = large ? 210 : 76, p = large ? 22 : 8;
  const min = Math.min(...metric.trend), max = Math.max(...metric.trend), range = max-min || 1;
  const pts = metric.trend.map((v,i)=>{
    const x = p + i*((w-p*2)/(metric.trend.length-1));
    const y = h-p-((v-min)/range)*(h-p*2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg className={large ? 'chart large' : 'chart'} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${metric.label} trend`}>
      {large && [0.25,0.5,0.75].map(r=><line key={r} x1={p} x2={w-p} y1={h*r} y2={h*r} className="gridline" />)}
      <polyline points={pts} className="trendline" />
      {metric.trend.map((v,i)=>{
        const x = p + i*((w-p*2)/(metric.trend.length-1));
        const y = h-p-((v-min)/range)*(h-p*2);
        return <circle key={i} cx={x} cy={y} r={large?4:2.5} className="dot" />;
      })}
    </svg>
  );
}

function Header({title, eyebrow, action}:{title:string; eyebrow?:string; action?:React.ReactNode}) {
  return <header className="pageHeader"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1></div>{action}</header>
}

function BottomNav({tab,setTab}:{tab:Tab;setTab:(t:Tab)=>void}) {
  const items:[Tab,string,string][] = [['home','◆','Home'],['upload','＋','Upload'],['progress','▥','Progress'],['training','◎','Training'],['coach','✦','Coach']];
  return <nav className="bottomNav">{items.map(([id,icon,label])=><button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}><Icon name={icon}/><span>{label}</span></button>)}</nav>;
}

function Home({setTab}:{setTab:(t:Tab)=>void}) {
  return <div className="page"><Header eyebrow="2026–27 Season · U14 Female" title="Good afternoon, Arden" action={<div className="avatar">A</div>} />
    <section className="heroCard"><div><span className="pill good">Strong session</span><div className="muted small">Practice · Sept. 8 · 62 minutes</div><h2>High-end skating is a strength.</h2><p>Your biggest opportunity is maintaining explosive acceleration deeper into the session after repeated hard efforts.</p></div><button className="primary" onClick={()=>setTab('upload')}>Upload next session</button></section>
    <div className="sectionTitle"><div><span className="eyebrow">Latest session</span><h2>Performance snapshot</h2></div><button className="textButton" onClick={()=>setTab('progress')}>View trends →</button></div>
    <div className="metricGrid">{metrics.slice(0,4).map(m=><article className="metricCard" key={m.key}><div className="metricLabel">{m.label}</div><div className="metricValue">{m.value}<span>{m.unit}</span></div><div className="up">↑ {m.change}% vs season avg</div><Sparkline metric={m}/></article>)}</div>
    <section className="focusCard"><div><span className="eyebrow">This week</span><h2>Development focus</h2></div><div className="focusRow"><div className="target">◎</div><div><strong>Repeat explosive acceleration</strong><p>Maintain high-end speed while improving the ability to reproduce it late in sessions.</p></div><button onClick={()=>setTab('training')}>Plan →</button></div></section>
  </div>;
}

function Upload() {
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
      setStage('verify');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not extract the screenshots.');
    } finally { setBusy(false); }
  };

  const updateMetric = (index:number, value:string) => {
    const parsed = Number(value);
    setVerified(current=>current.map((m,i)=>i===index ? {...m, value:Number.isFinite(parsed)?parsed:m.value, confidence:1} : m));
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
          player:{ age:13, gender:'female', competitionLevel:'AAA', position:'forward' },
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
      saveLocalSession(stored);
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
    <div className="buttonRow"><button className="secondary" disabled={busy} onClick={()=>setStage('select')}>Back</button><button className="primary" disabled={busy} onClick={saveAndAnalyze}>{busy?'Analyzing…':'Save & Analyze'}</button></div></div>;

  if(stage==='analysis' && analysis) return <div className="page"><Header eyebrow={`${result?.sessionType || 'Session'} · ${result?.sessionDate || 'latest'}`} title="Session analysis" action={<span className="pill good">{analysis.rating}</span>}/>
    <div className="metricGrid">{verified.slice(0,4).map(m=><article className="metricCard" key={m.key}><div className="metricLabel">{m.label}</div><div className="metricValue">{m.value}<span>{m.unit}</span></div><div className="muted small">Verified</div></article>)}</div>
    <section className="analysisCard"><div className="coachMark">✦</div><div><h2>Coach's takeaway</h2><p>{analysis.summary}</p></div></section>
    <section className="ranked"><h2>Top focus areas</h2>{analysis.focusAreas.map((x,i)=><div key={x}><b>{i+1}</b><span>{x}</span></div>)}</section>
    <section className="focusCard"><div><span className="eyebrow">Training priority</span><h2>{analysis.trainingFocus}</h2></div></section>
    {analysis.trendNotes.length>0 && <section className="whyCard"><h3>Trend notes</h3>{analysis.trendNotes.map(x=><p key={x}>• {x}</p>)}</section>}
    <button className="primary full" onClick={()=>{setStage('select');setFiles([]);setResult(null);setAnalysis(null)}}>Upload another session</button></div>;

  return <div className="page"><Header eyebrow="New session" title="Upload tracking screenshots"/><p className="lead">Add screenshots from your tracking system. EDGE will use vision to extract the metrics, identify the session type when possible, and flag uncertain values for review.</p><label className="dropzone"><input type="file" accept="image/*" multiple onChange={e=>{setFiles(Array.from(e.target.files||[]));setError('')}}/><div className="uploadIcon">⇧</div><strong>Tap to choose screenshots</strong><span>PNG, JPG, WEBP or phone screenshots · up to 8 images</span></label>{previews.length>0 && <div className="previewGrid">{previews.map((p,i)=><div key={p.name}><img src={p.url} alt={`Selected screenshot ${i+1}`}/><span>✓</span></div>)}</div>}<section className="autoList"><h3>We'll automatically</h3><p>✓ Extract only visible metrics</p><p>✓ Attach confidence to every value</p><p>✓ Flag duplicates or unclear screenshots</p><p>✓ Compare the verified session with season history</p></section>{error && <div className="errorBox"><strong>Couldn’t process this upload.</strong><div>{error}</div><small>If you’re running the project locally, add OPENAI_API_KEY to .env.local.</small></div>}<button className="primary full" disabled={!files.length || busy} onClick={runExtraction}>{busy?'Reading screenshots…':files.length?`Analyze ${files.length} image${files.length>1?'s':''}`:'Select screenshots to continue'}</button></div>;
}
function Progress() {
  const [selected,setSelected]=useState(metrics[0]);
  return <div className="page"><Header eyebrow="2026–27 Season" title="Season progress" action={<span className="pill">18 sessions</span>}/><div className="statsTriplet"><div><b>18</b><span>Total sessions</span></div><div><b>12</b><span>Practices</span></div><div><b>6</b><span>Games</span></div></div><div className="sectionTitle"><div><span className="eyebrow">Key trends</span><h2>What is changing?</h2></div></div><div className="trendCards">{metrics.slice(0,4).map(m=><button key={m.key} onClick={()=>setSelected(m)} className={selected.key===m.key?'selected':''}><span>{m.label}</span><strong>{m.value}{m.unit}</strong><em className="up">↑ {m.change}% this season</em><Sparkline metric={m}/></button>)}</div><section className="detailChart"><div><span className="eyebrow">Selected metric</span><h2>{selected.label}</h2><div className="bigValue">{selected.value}<span>{selected.unit}</span></div><div className="up">↑ {selected.change}% this season</div></div><Sparkline metric={selected} large/></section><section className="benchmarkCard"><div className="sectionTitle"><div><span className="eyebrow">Peer comparison</span><h2>How she compares</h2></div><span className="pill">Female · 13U/14U · AAA · Forward</span></div>{metrics.map(m=><div className="barRow" key={m.key}><div><span>{m.label}</span><b>{m.percentile}%</b></div><div className="bar"><i style={{width:`${m.percentile}%`}}/></div></div>)}<div className="callout">🏆 <strong>Top 20%</strong> overall among the current comparable-player benchmark set.</div></section></div>;
}

function Training() {
  const [open,setOpen]=useState(0);
  return <div className="page"><Header eyebrow="Updated from latest session" title="Development plan"/><section className="primaryFocus"><div className="target">◎</div><div><span className="eyebrow">Primary focus</span><h2>Repeat explosive acceleration</h2><p>Maintain your high-end speed while improving the ability to reproduce it late in sessions.</p></div></section><div className="sectionTitle"><div><span className="eyebrow">This week</span><h2>Recommended drills</h2></div></div><div className="drillList">{drills.map((d,i)=><button key={d.title} onClick={()=>setOpen(i)} className={open===i?'open':''}><div className="drillThumb">{i+1}</div><div><strong>{d.title}</strong><span>{d.prescription}</span>{open===i&&<p>{d.why}</p>}</div><b>›</b></button>)}</div><section className="whyCard"><h3>Why these drills?</h3><p>Your data shows strong top-end speed and improving initial acceleration, but a drop in acceleration during the final third of harder sessions. These drills target repeated explosiveness, edge strength, and horizontal power while keeping total training load appropriate.</p></section></div>;
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
        question, history:getLocalSessions(), player:{age:13,gender:'female',competitionLevel:'AAA',position:'forward'}
      })});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error || 'Coach is unavailable.');
      setMessages(m=>[...m,{who:'coach',text:data.answer}]);
    } catch(e) {
      setMessages(m=>[...m,{who:'coach',text:e instanceof Error ? e.message : 'Coach is unavailable.'}]);
    } finally {setBusy(false)}
  };
  return <div className="page coachPage"><Header eyebrow="AI · season-aware" title="Ask Coach"/><p className="lead">Ask questions across every verified practice and game—not just the most recent session.</p><div className="quickQs"><button onClick={()=>ask('What should she focus on before her next tournament?')}>Before a tournament?</button><button onClick={()=>ask('Is top speed improving across the season?')}>Top speed trend?</button><button onClick={()=>ask('Compare her games with her practices. What changes?')}>Games vs practices?</button></div><div className="messages">{messages.map((m,i)=><div key={i} className={`message ${m.who}`}>{m.who==='coach'&&<span>✦</span>}<p>{m.text}</p></div>)}{busy&&<div className="message coach"><span>✦</span><p>Analyzing verified season history…</p></div>}</div><form className="askBar" onSubmit={e=>{e.preventDefault();ask(q)}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask about the season…" disabled={busy}/><button disabled={busy || !q.trim()}>→</button></form></div>;
}
export default function App() {
  const [tab,setTab]=useState<Tab>('home');
  return <main className="appShell"><div className="brandBar"><div className="brandMark">▲</div><div><strong>EDGE</strong><span>Hockey Performance Coach</span></div></div><div className="content">{tab==='home'&&<Home setTab={setTab}/>} {tab==='upload'&&<Upload/>} {tab==='progress'&&<Progress/>} {tab==='training'&&<Training/>} {tab==='coach'&&<Coach/>}</div><BottomNav tab={tab} setTab={setTab}/></main>;
}
