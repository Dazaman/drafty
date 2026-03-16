import Link from "next/link";
import type { Transfer } from "@/lib/types";

interface TransferHighlightsProps {
  best: Transfer[];
  worst: Transfer[];
}

function TransferCard({
  title,
  transfers,
  variant,
}: {
  title: string;
  transfers: Transfer[];
  variant: "best" | "worst";
}) {
  const borderColor = variant === "best" ? "border-mint/15" : "border-ice/15";

  return (
    <div className={`flex-1 min-w-[220px] bg-ocean-surface rounded-lg p-3.5 border ${borderColor}`}>
      <h3 className={`text-xs font-semibold ${variant === "best" ? "text-mint" : "text-ice"} mb-2`}>{title}</h3>
      {transfers.slice(0, 3).map((t, i) => (
        <div
          key={`${t.playerIn}-${t.waiverGw}`}
          className={`py-1.5 ${i < 2 ? "border-b border-mint/5" : ""}`}
        >
          <div className="flex justify-between items-center text-xs">
            <span className="text-bright">
              {t.playerIn} → <span className="text-muted">(for {t.playerOut})</span>
            </span>
            <span className={variant === "best" ? "text-mint" : "text-error"}>
              {t.netPts > 0 ? "+" : ""}
              {Math.round(t.netPts)} pts
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted">
            <span>{t.team}</span>
            <span>·</span>
            <span>GW {t.nextGw}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TransferHighlights({ best, worst }: TransferHighlightsProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2.5">
        <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px]">
          Transfer Highlights
        </h2>
        <Link href="/transfers" className="text-[10px] text-mint/60 hover:text-mint transition-colors">
          View all →
        </Link>
      </div>
      <div className="flex flex-col md:flex-row gap-2.5">
        <TransferCard title="Best Transfers" transfers={best} variant="best" />
        <TransferCard title="Worst Transfers" transfers={worst} variant="worst" />
      </div>
    </div>
  );
}
