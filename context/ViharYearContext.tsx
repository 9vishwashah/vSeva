import React, { createContext, useContext, useState, useMemo } from 'react';
import { getViharYearStartYear, getViharYearBoundsForStartYear, ViharYearBounds } from '../services/viharYear';

interface ViharYearContextValue {
  selectedVYStartYear: number;
  setSelectedVYStartYear: (year: number) => void;
  currentVYStartYear: number;
  selectedVY: ViharYearBounds;
}

const ViharYearContext = createContext<ViharYearContextValue | undefined>(undefined);

// A single, app-wide Vihar Year selection — set once (from the Dashboard's
// selector) and read everywhere else, instead of every page keeping its own
// independent selectedVYStartYear state that resets on remount/navigation.
export const ViharYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentVYStartYear = getViharYearStartYear();
  const [selectedVYStartYear, setSelectedVYStartYear] = useState<number>(currentVYStartYear);
  const selectedVY = useMemo(
    () => getViharYearBoundsForStartYear(selectedVYStartYear),
    [selectedVYStartYear]
  );

  const value = useMemo(
    () => ({ selectedVYStartYear, setSelectedVYStartYear, currentVYStartYear, selectedVY }),
    [selectedVYStartYear, currentVYStartYear, selectedVY]
  );

  return <ViharYearContext.Provider value={value}>{children}</ViharYearContext.Provider>;
};

export function useViharYear(): ViharYearContextValue {
  const ctx = useContext(ViharYearContext);
  if (!ctx) throw new Error('useViharYear must be used within a ViharYearProvider');
  return ctx;
}
