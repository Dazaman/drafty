import * as d3 from "d3";
import type { StandingsEntry } from "@/lib/types";
import { JOURNEY_COLORS, positionAt, weekSnapshot, performanceStory, type JourneyFacts } from "@/lib/journey";
export type JourneyRecording = { cancel: () => void; done: Promise<void> };
export function recordJourney(data: StandingsEntry[], season: string, onProgress: (value: number) => void, facts?: JourneyFacts | null, selected?: string | null): JourneyRecording {
  const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find(value=>MediaRecorder.isTypeSupported(value));
  if (!type) throw new Error("This browser cannot record a supported video format. Use Play season to watch the journey here.");
  const canvas = document.createElement("canvas"); canvas.width=1280; canvas.height=720;
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.captureStream) throw new Error("Video recording is unavailable in this browser.");
  const weeks = [...new Set(data.map(d=>d.gw))].sort((a,b)=>a-b);
  const first=weeks[0], last=weeks.at(-1)!;
  const teams = [...new Set(data.map(d=>d.name))];
  const x = d3.scaleLinear().domain([first,Math.max(first+1,last)]).range([70,940]);
  const y = d3.scaleLinear().domain([1,Math.max(2,teams.length)]).range([240,584]);
  function draw(progress: number) {
    if (!ctx) return;
    const week = Math.floor(progress+0.00001);
    ctx.fillStyle="#101916"; ctx.fillRect(0,0,1280,720);
    ctx.fillStyle="#c5ee96"; ctx.font="bold 24px Arial"; ctx.fillText(`drafty.  /  ${season}`,50,55);
    ctx.fillStyle="#f1f3eb"; ctx.font="bold 36px Arial"; ctx.fillText(`Gameweek ${week}`,50,116);
    ctx.fillStyle="#a1afa6"; ctx.font="20px Arial"; const story=performanceStory(data,week,first,facts,selected);
    ctx.fillText(story.headline,50,158,1160);
    ctx.font="16px Arial";
    const words=story.description.split(' ');let text='',line=0;
    for(const word of words){const next=text ? `${text} ${word}` : word;if(ctx.measureText(next).width>1160 && text){ctx.fillText(text,50,188+line*21);line++;text=word;}else text=next;}
    ctx.fillText(text,50,188+line*21,1160);
    for(let rank=1;rank<=teams.length;rank++) { ctx.strokeStyle="#ffffff12";ctx.beginPath();ctx.moveTo(70,y(rank));ctx.lineTo(940,y(rank));ctx.stroke();ctx.fillStyle="#a1afa6";ctx.font="16px Arial";ctx.fillText(String(rank),38,y(rank)+5); }
    teams.forEach((name,index)=>{
      const rows=data.filter(d=>d.name===name && d.gw<=progress).sort((a,b)=>a.gw-b.gw);
      const position=positionAt(data,name,progress);
      ctx.strokeStyle=JOURNEY_COLORS[index%JOURNEY_COLORS.length];ctx.lineWidth=3;ctx.beginPath();
      rows.forEach((row,i)=>{ if(i===0)ctx.moveTo(x(row.gw),y(row.position));else ctx.lineTo(x(row.gw),y(row.position)); });
      if(position!==undefined && rows.length)ctx.lineTo(x(progress),y(position)); ctx.stroke();
      if(position!==undefined){ctx.fillStyle=JOURNEY_COLORS[index%JOURNEY_COLORS.length];ctx.beginPath();ctx.arc(x(progress),y(position),5,0,Math.PI*2);ctx.fill();}
    });
    weekSnapshot(data,week).forEach((row,index)=>{ctx.fillStyle=JOURNEY_COLORS[teams.indexOf(row.name)%JOURNEY_COLORS.length];ctx.font="20px Arial";ctx.fillText(`${row.position}  ${row.name}`,1000,245+index*44,235);});
    ctx.fillStyle="#a1afa6";ctx.font="16px Arial";
    [...new Set([first,...d3.ticks(first,last,8).filter(Number.isInteger),last])].forEach(week=>ctx.fillText(String(week),x(week)-7,625));
    ctx.fillText("GAMEWEEK",70,658);ctx.fillText("League position · 1st at the top",920,680);
  }
  draw(first);
  const stream=canvas.captureStream(30);
  const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:3000000});
  const chunks: BlobPart[]=[];
  let frame=0, cancelled=false;
  const done=new Promise<void>((resolve,reject)=>{
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onerror=()=>{cancelAnimationFrame(frame);stream.getTracks().forEach(t=>t.stop());reject(new Error("Recording failed. Try playing the journey in this browser."));};
    recorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(!cancelled){const blob=new Blob(chunks,{type});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`drafty-${season.replaceAll("/","-")}-journey.${type.startsWith("video/mp4") ? "mp4" : "webm"}`;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),10000);}
      resolve();
    };
    recorder.start(250);
    const start=performance.now();const duration=Math.max(8000,(last-first)*650)+1800;
    function tick(now:number){const elapsed=now-start;const fraction=Math.min(1,elapsed/(duration-1800));draw(first+(last-first)*fraction);onProgress(Math.min(100,Math.round(elapsed/duration*100)));if(elapsed<duration)frame=requestAnimationFrame(tick);else recorder.stop();}
    frame=requestAnimationFrame(tick);
  });
  return {done,cancel:()=>{cancelled=true;cancelAnimationFrame(frame);if(recorder.state!=="inactive")recorder.stop();}};
}
