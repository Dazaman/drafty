"use client";
import { useSyncExternalStore } from "react";
const subscribe=(listener:()=>void)=>{
  window.addEventListener("hashchange",listener);
  return ()=>window.removeEventListener("hashchange",listener);
};
const getSnapshot=()=>window.location.hash;
const getServerSnapshot=()=>"";
export function useLocationHash() {
  return useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
}
