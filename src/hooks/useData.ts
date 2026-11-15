"use client";

import { useState, useEffect, useRef } from "react";
import { csvParse } from "d3";

function useFile<T>(path: string, parse: (text: string) => T) {
  const parser = useRef(parse);
  useEffect(() => { parser.current = parse; }, [parse]);
  const [result, setResult] = useState<{ path: string; data: T | null; error: string | null }>({ path: "", data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`Failed to load ${path}`); return res.text(); })
      .then(text => { if (!controller.signal.aborted) setResult({ path, data: parser.current(text), error: null }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ path, data: null, error: error.message }); });
    return () => controller.abort();
  }, [path]);
  const current = result.path === path;
  return { data: current ? result.data : null, error: current ? result.error : null, loading: !current };
}

export function useCsvData<T>(path: string, mapRow: (row: Record<string, string>) => T) {
  return useFile(path, text => csvParse(text).map(row => mapRow(row as Record<string, string>)));
}
export function useJsonData<T>(path: string) {
  return useFile<T>(path, text => JSON.parse(text) as T);
}
