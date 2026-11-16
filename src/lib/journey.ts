import type { StandingsEntry } from "@/lib/types";
export const JOURNEY_COLORS = ["#c5ee96", "#9fcbd0", "#d8a2bc", "#eac27d", "#b6a4de", "#eea181", "#8db6a0", "#a9bbee"];
export function weekSnapshot(data: StandingsEntry[], gw: number) {
  return data.filter(row => row.gw === gw).sort((a,b) => a.position-b.position || a.name.localeCompare(b.name));
}
export function weekStory(data: StandingsEntry[], gw: number, firstGw: number) {
  const current = weekSnapshot(data,gw);
  const previous = weekSnapshot(data,gw-1);
  const leaders = current.filter(row=>row.position===1).map(row=>row.name);
  const before = previous.filter(row=>row.position===1).map(row=>row.name);
  if (!current.length) return "No positions recorded for this week.";
  if (gw === firstGw) return `${leaders.join(" & ")} set${leaders.length===1 ? "s" : ""} the opening pace.`;
  if (leaders.join("|") !== before.join("|")) return `${leaders.join(" & ")} ${leaders.length===1 ? "takes" : "take"} the lead.`;
  const moves = current.map(row => ({ name: row.name, change: (previous.find(p=>p.name===row.name)?.position ?? row.position)-row.position })).sort((a,b)=>b.change-a.change);
  if (moves[0]?.change > 0) return `${moves[0].name} climbs ${moves[0].change} ${moves[0].change===1 ? "place" : "places"}. ${leaders.join(" & ")} ${leaders.length===1 ? "stays" : "stay"} on top.`;
  return `${leaders.join(" & ")} ${leaders.length===1 ? "holds" : "hold"} the lead. The chase continues.`;
}
export function positionAt(data: StandingsEntry[], name: string, progress: number) {
  const before = data.find(row=>row.name===name && row.gw===Math.floor(progress));
  const after = data.find(row=>row.name===name && row.gw===Math.ceil(progress));
  if (before && after) return before.position+(after.position-before.position)*(progress-Math.floor(progress));
  return before?.position ?? after?.position;
}

export type JourneyPerformance = {
  managerId: number; name: string; teamName: string; gw: number; points: number;
  players: { id: number; name: string; points: number; goals: number; assists: number }[];
  transfers: { playerIn: string; playerOut: string; playerInPts: number; playerOutPts: number; netPts: number; transactionGw: number }[];
};
export type JourneyFacts = { version: number; performances: JourneyPerformance[] };
export function performanceStory(data: StandingsEntry[], gw: number, firstGw: number, facts?: JourneyFacts | null, selected?: string | null) {
  const current=weekSnapshot(data,gw), previous=weekSnapshot(data,gw-1);
  const leaders=current.filter(row=>row.position===1);
  const changed=leaders.map(row=>row.name).join('|')!==previous.filter(row=>row.position===1).map(row=>row.name).join('|');
  const movers=current.map(row=>({...row,change:(previous.find(p=>p.name===row.name)?.position ?? row.position)-row.position})).sort((a,b)=>b.change-a.change);
  const focus=selected ?? ((changed || gw===firstGw) ? leaders[0]?.name : movers[0]?.change>0 ? movers[0].name : leaders[0]?.name);
  const row=current.find(row=>row.name===focus);
  const performance=facts?.performances.find(p=>p.name===focus && p.gw===gw);
  const position=row?.position ?? 0;
  const ordinal=position===1?'1st':position===2?'2nd':position===3?'3rd':`${position}th`;
  const change=(previous.find(p=>p.name===focus)?.position ?? position)-position;
  const headline=!row ? weekStory(data,gw,firstGw) : gw===firstGw ? `${focus} ${position===1 ? 'sets the opening pace' : `opens in ${ordinal} place`}.` : change>0 ? `${focus} ${position===1 ? (leaders.length>1 ? 'joins the leaders' : 'takes the lead') : `climbs ${change} ${change===1?'place':'places'} to ${ordinal}`}.` : change<0 ? `${focus} slips ${-change} ${change===-1?'place':'places'} to ${ordinal}.` : `${focus} ${position===1 ? (leaders.length>1 ? 'shares the lead' : 'holds the lead') : `holds ${ordinal} place`}.`;
  const fallback={headline,description:`Player-level evidence isn’t available for ${focus ?? 'this manager'} in GW ${gw}. Showing the recorded league position.`,kind:'Position update',performance:null};
  if(!performance || !performance.players.length) return fallback;
  const sorted=[...performance.players].sort((a,b)=>b.points-a.points);
  const top=sorted[0], share=performance.points>0 ? top.points/performance.points : 0;
  const move=[...performance.transfers].sort((a,b)=>b.netPts-a.netPts).find(move=>move.netPts>=8 && move.playerInPts>=8);
  if(move) return {headline,kind:'A transfer that paid off',performance,description:`${move.playerIn} delivered ${move.playerInPts} points after joining in GW ${move.transactionGw} — ${move.netPts} more than ${move.playerOut} scored in GW ${gw}. ${performance.teamName} finished the week on ${performance.points} points.`};
  if(top.points>=10 && share>=0.35) return {headline,kind:'Standout haul',performance,description:`${top.name} supplied ${top.points} of ${performance.teamName}’s ${performance.points} points (${Math.round(share*100)}%).${top.goals || top.assists ? ` ${top.goals} ${top.goals===1?'goal':'goals'} and ${top.assists} ${top.assists===1?'assist':'assists'} from the standout scorer.` : ''}`};
  const returns=sorted.filter(p=>p.points>=5).length;
  if(performance.points>0 && returns>=4 && share<0.3) return {headline,kind:'A team effort',performance,description:`${returns} players returned at least five points for ${performance.teamName}’s ${performance.points}-point week. ${top.name} led with ${top.points} — about ${Math.round(share*100)}% of the total.`};
  return {headline,kind:'The weekly performance',performance,description:`${performance.teamName} scored ${performance.points} points in GW ${gw}. ${top.name} led the scoring with ${top.points}${sorted[1] ? `, followed by ${sorted[1].name} (${sorted[1].points})` : ''}.`};
}
