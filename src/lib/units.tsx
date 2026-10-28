"use client";
// km ↔ miles display setting. All maths stays metric; this only changes how numbers are shown.
import { createContext, useContext, useEffect, useState } from "react";

export type Units = "km" | "mi";
export const KM_PER_MI = 1.609344;
export const L_PER_US_GAL = 3.785411784;

const UnitsContext = createContext<{ units: Units; setUnits: (u: Units) => void }>({ units: "km", setUnits: () => {} });

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnitsState] = useState<Units>("km");
  useEffect(() => {
    try {
      if (localStorage.getItem("units") === "mi") setUnitsState("mi");
    } catch {
      // storage blocked: keep km
    }
  }, []);
  const setUnits = (u: Units) => {
    setUnitsState(u);
    try {
      localStorage.setItem("units", u);
    } catch {
      // ignore
    }
  };
  return <UnitsContext.Provider value={{ units, setUnits }}>{children}</UnitsContext.Provider>;
}

export const useUnits = () => useContext(UnitsContext);
