"use client";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import { useJsonData } from "@/hooks/useData";
import { BRAND } from "@/lib/brand";
import type { AppConfig } from "@/lib/types";
const LeagueContext = createContext<{ data: AppConfig | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
export function useLeagueConfig() { return useContext(LeagueContext); }
export default function LeagueProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const result = useJsonData<AppConfig>("/data/config.json");
  useEffect(() => { document.title = result.data?.season?.label ? `${result.data.leagueName || BRAND.name} · ${result.data.season.label}` : BRAND.name; }, [result.data, pathname]);
  return <LeagueContext.Provider value={result}>{children}</LeagueContext.Provider>;
}
