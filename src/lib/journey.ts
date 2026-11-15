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
