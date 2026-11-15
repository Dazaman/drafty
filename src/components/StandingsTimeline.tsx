"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { BracketConfig, StandingsEntry } from "@/lib/types";
import { JOURNEY_COLORS as colors, positionAt, weekSnapshot, weekStory } from "@/lib/journey";
import { recordJourney, type JourneyRecording } from "@/lib/recordJourney";

type Props = { data: StandingsEntry[]; points: { name: string; gw: number; points: number }[]; brackets: BracketConfig[]; season: string };
export default function StandingsTimeline({ data, points, brackets, season }: Props) {
  const teams = useMemo(()=>[...new Set(data.map(row=>row.name))],[data]);
  const weeks = useMemo(()=>[...new Set(data.map(row=>row.gw))].sort((a,b)=>a-b),[data]);
  const first=weeks[0] ?? 1, last=weeks.at(-1) ?? 1;
  const [selected,setSelected]=useState<string | null>(null);
  const [progress,setProgress]=useState<number | null>(null);
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(1);
  const [recording,setRecording]=useState(false);
  const [recordPercent,setRecordPercent]=useState(0);
  const [recordError,setRecordError]=useState("");
  const [reducedMotion,setReducedMotion]=useState(false);
  const recordingRef=useRef<JourneyRecording | null>(null);
  const value=progress ?? last;
  const gw=Math.min(last,Math.max(first,Math.floor(value+0.00001)));
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setReducedMotion(media.matches);update();media.addEventListener("change",update);
    return ()=>media.removeEventListener("change",update);
  },[]);
  useEffect(()=>{
    if(!playing || reducedMotion) return;
    let frame=0,previous=performance.now(),position=value;
    function tick(now:number){const delta=Math.min(120,now-previous);previous=now;position=Math.min(last,position+delta/1000*speed);setProgress(position);if(position<last)frame=requestAnimationFrame(tick);else setPlaying(false);}
    frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
  // value is the starting position, not an animation dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,speed,last,first,reducedMotion]);
  useEffect(()=>()=>recordingRef.current?.cancel(),[]);
  const activePlaying=playing && value<last && !reducedMotion;
  const x=d3.scaleLinear().domain([first,Math.max(first+1,last)]).range([36,730]);
  const y=d3.scaleLinear().domain([1,Math.max(2,teams.length)]).range([28,274]);
  const line=d3.line<StandingsEntry>().x(row=>x(row.gw)).y(row=>y(row.position));
  const snapshot=weekSnapshot(data,gw);
  const previous=weekSnapshot(data,gw-1);
  const milestones=weeks.filter((week,index)=>index===0 || weekSnapshot(data,week).filter(row=>row.position===1).map(row=>row.name).join("|")!==weekSnapshot(data,week-1).filter(row=>row.position===1).map(row=>row.name).join("|"));
  const counts=new Map<string,number>();weeks.forEach(week=>weekSnapshot(data,week).filter(row=>row.position===1).forEach(row=>counts.set(row.name,(counts.get(row.name)??0)+1)));
  const longest=[...counts].sort((a,b)=>b[1]-a[1])[0];
  function seek(week:number){setPlaying(false);setProgress(Math.max(first,Math.min(last,week)));}
  async function download(){
    setRecordError("");setPlaying(false);
    try {
      if(typeof MediaRecorder==="undefined")throw new Error("Video export isn’t supported in this browser. You can still play and scrub through the season.");
      setRecording(true);setRecordPercent(0);
      const result=recordJourney(data,season,setRecordPercent);recordingRef.current=result;await result.done;
    } catch(error){setRecordError(error instanceof Error ? error.message : "Could not record the journey");}
    finally{setRecording(false);recordingRef.current=null;}
  }
  return <div className="panel journey-panel"><div className="section-heading"><div><span className="eyebrow">THE SEASON IN MOTION</span><h2 className="mt-2">Every twist in the title race.</h2><p>Replay the weeks, watch the lead change, and follow your manager.</p></div><button className="text-mint text-xs" disabled={recording || !data.length} onClick={download}>{recording ? `Recording ${recordPercent}%…` : "↓ Download season video"}</button></div>
    <div className="journey-story"><div><span className="eyebrow">{season} · GAMEWEEK {gw} / {last}</span><h3 aria-live={activePlaying ? "off" : "polite"}>{weekStory(data,gw,first)}</h3></div><div className="journey-stats"><span><strong>{Math.max(0,milestones.length-1)}</strong> lead changes</span><span><strong>{longest?.[0] ?? "—"}</strong> most weeks at the top{longest ? ` · ${longest[1]}` : ""}</span></div></div>
    <div className="journey-controls"><button className="action-button" disabled={reducedMotion || last===first} onClick={()=>{if(activePlaying)setPlaying(false);else{if(value>=last)setProgress(first);setPlaying(true);}}}>{activePlaying ? "Ⅱ Pause" : value>=last ? "▶ Play season" : "▶ Continue"}</button><button onClick={()=>seek(first)} aria-label="Restart journey" title="Restart">↺</button><button onClick={()=>seek(gw-1)} disabled={gw<=first} aria-label="Previous gameweek">←</button><button onClick={()=>seek(gw+1)} disabled={gw>=last} aria-label="Next gameweek">→</button><label className="journey-scrubber">Gameweek {gw}<input aria-label="Journey gameweek" type="range" min={first} max={last} value={gw} step="1" onChange={event=>seek(Number(event.target.value))}/></label><label className="text-xs">Speed<select aria-label="Playback speed" value={speed} onChange={event=>setSpeed(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label></div>
    {reducedMotion && <p className="text-xs mt-3">Reduced motion is enabled. Use the slider and week buttons to explore at your own pace.</p>}
    <div className="journey-grid"><div className="min-w-0"><div className="overflow-x-auto"><svg viewBox="0 0 860 318" className="w-full min-w-[520px]" role="img" aria-label={`Standings journey through gameweek ${gw}. Use playback controls or the gameweek slider to explore.`}>
      {brackets.map((bracket,index)=><g key={index}>{bracket.startGw>=first && bracket.startGw<=last && <><rect x={x(bracket.startGw)} y="14" width={Math.max(0,x(Math.min(last,bracket.endGw))-x(bracket.startGw))} height="276" fill={index%2===0 ? "#ffffff03" : "transparent"}/><text x={x(bracket.startGw)+5} y="12" fill="#77897e" fontSize="9">BRACKET {index+1}</text></>}</g>)}
      {teams.map((_,index)=><g key={index}><line x1="36" x2="730" y1={y(index+1)} y2={y(index+1)} stroke="#ffffff0c"/><text x="12" y={y(index+1)+4} fill="#a1afa6" fontSize="11">{index+1}</text></g>)}
      {[...new Set([first,...d3.ticks(first,last,8).filter(Number.isInteger),last])].map(week=><text key={week} x={x(week)} y="308" textAnchor="middle" fill="#a1afa6" fontSize="10">{week}</text>)}
      <line x1={x(value)} x2={x(value)} y1="22" y2="284" stroke="#c5ee9640" strokeDasharray="3 5"/>
      {teams.map((name,index)=>{
        const rows=data.filter(row=>row.name===name && row.gw<=value).sort((a,b)=>a.gw-b.gw);
        const pos=positionAt(data,name,value);
        const pathRows=pos!==undefined && value%1!==0 ? [...rows,{name,gw:value,position:pos}] : rows;
        const color=colors[index%colors.length];
        return <g key={name} opacity={selected && selected!==name ? .12 : 1}><path d={line(pathRows)??""} fill="none" stroke={color} strokeWidth={selected===name ? 3.5 : 2} strokeLinejoin="round"/>{pos!==undefined && <><circle cx={x(value)} cy={y(pos)} r={selected===name ? 5 : 3.5} fill={color}/><text x={x(value)+9} y={y(pos)+4} fill={color} fontSize="10">{name}</text></>}</g>;
      })}
    </svg></div></div><div className="journey-leaderboard"><span className="eyebrow">THE TABLE · GW {gw}</span>{snapshot.map(row=>{const movement=(previous.find(p=>p.name===row.name)?.position ?? row.position)-row.position;return <button key={row.name} aria-pressed={selected===row.name} onClick={()=>setSelected(selected===row.name ? null : row.name)}><span style={{color:colors[teams.indexOf(row.name)%colors.length]}}>{row.position}</span><strong>{row.name}<small>{points.find(p=>p.name===row.name && p.gw===gw)?.points.toLocaleString() ?? "—"} pts</small></strong><span className={movement>0 ? "text-mint" : movement<0 ? "text-error" : ""}>{movement>0 ? `↑${movement}` : movement<0 ? `↓${Math.abs(movement)}` : "—"}</span></button>;})}</div></div>
    <div className="chart-legend" aria-label="Highlight manager"><button aria-pressed={!selected} onClick={()=>setSelected(null)}>All managers</button>{teams.map((name,index)=><button key={name} aria-pressed={selected===name} onClick={()=>setSelected(selected===name ? null : name)} style={{color:colors[index%colors.length]}}>{name}</button>)}</div>
    <div className="journey-milestones"><span className="eyebrow">TURNING POINTS</span>{milestones.map(week=><button key={week} aria-pressed={gw===week} onClick={()=>seek(week)}>GW {week}<span>{weekSnapshot(data,week).filter(row=>row.position===1).map(row=>row.name).join(" & ")} {week===first ? "opens on top" : "takes the lead"}</span></button>)}</div>
    {recording && <p className="text-xs mt-3" role="status">Creating your season video · {recordPercent}% <button className="text-mint ml-3" onClick={()=>recordingRef.current?.cancel()}>Cancel recording</button></p>}
    {recordError && <p role="alert" className="text-error text-xs mt-3">{recordError}</p>}
  </div>;
}
