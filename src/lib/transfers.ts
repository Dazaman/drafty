import type { Transfer } from "./types";

export function mapTransfer(row: Record<string,string>): Transfer {
  return { team:row.team, waiverOrFree:row.waiver_or_free, waiverGw:Number(row.waiver_gw),
    nextGw:row.next_gw ? Number(row.next_gw) : NaN, playerIn:row.player_in, playerOut:row.player_out,
    playerInPts:row.player_in_pts ? Number(row.player_in_pts) : NaN,
    playerOutPts:row.player_out_pts ? Number(row.player_out_pts) : NaN,
    netPts:row.net_pts ? Number(row.net_pts) : NaN };
}
