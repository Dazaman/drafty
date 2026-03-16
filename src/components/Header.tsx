interface Earning {
  name: string;
  amount: number;
}

interface HeaderProps {
  currentGw: number;
  earnings: Earning[];
}

export default function Header({ currentGw, earnings }: HeaderProps) {
  const sorted = [...earnings].filter((e) => e.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-bright text-2xl font-bold">Drafty 24/25</h1>
        <p className="text-muted text-sm mt-1">
          FPL Draft League · Updated GW {currentGw}
        </p>
      </div>
      {sorted.length > 0 && (
        <div className="flex items-center gap-3 bg-ocean-surface rounded-lg px-4 py-2 border border-mint/10">
          <span className="text-muted text-[10px] uppercase tracking-wider">Earnings</span>
          <div className="flex gap-3">
            {sorted.map((e, i) => (
              <div key={e.name} className="text-center">
                <div className={`text-sm font-bold ${i === 0 ? "text-mint" : "text-ice"}`}>
                  ${e.amount}
                </div>
                <div className="text-[8px] text-muted">{e.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
