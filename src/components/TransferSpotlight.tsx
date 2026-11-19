"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCsvData } from "@/hooks/useData";
import { mapTransfer } from "@/lib/transfers";

export default function TransferSpotlight() {
  const best=useCsvData("/data/top_df.csv",mapTransfer);
  const worst=useCsvData("/data/bottom_df.csv",mapTransfer);
  const slides=useMemo(()=>{
    const gains=(best.data ?? []).filter(row=>Number.isFinite(row.netPts)).sort((a,b)=>b.netPts-a.netPts).slice(0,3);
    const losses=(worst.data ?? []).filter(row=>Number.isFinite(row.netPts)).sort((a,b)=>a.netPts-b.netPts).slice(0,3);
    return Array.from({length:Math.max(gains.length,losses.length)},(_,i)=>[gains[i] && {row:gains[i],kind:"gain"},losses[i] && {row:losses[i],kind:"loss"}]).flat().filter(slide=>slide!==undefined);
  },[best.data,worst.data]);
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [hovered,setHovered]=useState(false);
  const [focused,setFocused]=useState(false);
  const [reduced,setReduced]=useState(false);
  const [visible,setVisible]=useState(true);
  useEffect(()=>{
    const media=matchMedia("(prefers-reduced-motion: reduce)");
    const motion=()=>setReduced(media.matches),visibility=()=>setVisible(!document.hidden);
    motion();visibility();media.addEventListener("change",motion);document.addEventListener("visibilitychange",visibility);
    return ()=>{media.removeEventListener("change",motion);document.removeEventListener("visibilitychange",visibility);};
  },[]);
  const rotating=!paused && !hovered && !focused && !reduced && visible && slides.length>1;
  useEffect(()=>{if(!rotating)return;const timer=setInterval(()=>setIndex(i=>(i+1)%slides.length),7000);return ()=>clearInterval(timer);},[rotating,slides.length]);
  const slide=slides[index%slides.length];
  const move=(direction:number)=>{setPaused(true);setIndex(i=>(i+direction+slides.length)%slides.length);};
  return <section className="transfer-spotlight section-block" aria-label="Transfer spotlight" aria-roledescription="carousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
    <div className="spotlight-heading"><div><span className="eyebrow">THE TRANSFER REEL</span><h2>Small swaps. Big swings.</h2></div><Link className="spotlight-details" href="/transfers/">Detailed transfer view ↗</Link></div>
    {slide ? <><div key={index} className={`spotlight-slide ${slide.kind}`} aria-live={rotating ? "off" : "polite"} aria-roledescription="slide" aria-label={`${index%slides.length+1} of ${slides.length}`}>
      <div className="spotlight-score"><span>{slide.kind==="gain" ? "A move that paid off" : "The one that got away"}</span><strong>{slide.row.netPts>0 ? "+" : ""}{slide.row.netPts}<small>net points</small></strong></div>
      <div className="spotlight-deal"><p>{slide.row.team} <span>· moved GW {slide.row.waiverGw} · scored GW {slide.row.nextGw}</span></p><h3>{slide.row.playerIn} <span>in for</span> {slide.row.playerOut}</h3><p>{slide.row.playerInPts} points in · {slide.row.playerOutPts} points out <span>· next-gameweek comparison</span></p></div>
      <Link className="spotlight-ranking" href={`/transfers/#${slide.kind==="gain" ? "best" : "worst"}-transfers`}>See ranking ↗</Link>
    </div><div className="spotlight-controls"><div className="spotlight-dots" aria-label="Choose transfer highlight">{slides.map((_,i)=><button key={i} aria-label={`Show transfer highlight ${i+1}`} aria-pressed={index%slides.length===i} onClick={()=>{setIndex(i);setPaused(true);}}><span/></button>)}</div><div><button aria-label="Previous transfer highlight" onClick={()=>move(-1)}>←</button><button aria-label={paused ? "Play transfer carousel" : "Pause transfer carousel"} disabled={reduced || slides.length<2} onClick={()=>setPaused(!paused)}>{paused ? "Play" : "Pause"}</button><button aria-label="Next transfer highlight" onClick={()=>move(1)}>→</button></div></div></> : <p className="spotlight-empty" role="status">{best.loading || worst.loading ? "Loading the season’s transfer stories…" : best.error || worst.error ? "Transfer highlights couldn’t load. Open the detailed view to try again." : "The first scored moves will appear here."}</p>}
  </section>;
}
