import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { getViharYearBoundsForStartYear } from '../services/viharYear';

interface ViharYearSelectorProps {
    selectedStartYear: number;
    currentStartYear: number; // "today's" VY start year — labeled "Current" in the list
    onChange: (startYear: number) => void;
    yearsBack?: number; // how many past VYs to offer, default 5
}

// A "modern" pill dropdown for picking which Vihar Year's data to view —
// used on both Dashboard and Group Analytics so the choice stays consistent.
const ViharYearSelector: React.FC<ViharYearSelectorProps> = ({ selectedStartYear, currentStartYear, onChange, yearsBack = 5 }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const options = Array.from({ length: yearsBack + 1 }, (_, i) => currentStartYear - i);
    const selectedBounds = getViharYearBoundsForStartYear(selectedStartYear);

    return (
        <div className="relative shrink-0" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:border-saffron-300 hover:bg-saffron-50/50 transition-colors text-xs font-bold text-[#241C17]"
            >
                <Calendar size={13} className="text-saffron-600" />
                {selectedBounds.label}
                <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 py-1">
                    {options.map(y => {
                        const bounds = getViharYearBoundsForStartYear(y);
                        const isSelected = y === selectedStartYear;
                        const isCurrent = y === currentStartYear;
                        return (
                            <button
                                key={y}
                                type="button"
                                onClick={() => { onChange(y); setOpen(false); }}
                                className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between gap-2 hover:bg-saffron-50 transition-colors ${isSelected ? 'text-saffron-700 bg-saffron-50' : 'text-gray-600'}`}
                            >
                                <span>{bounds.label}</span>
                                {isCurrent && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full shrink-0">Current</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ViharYearSelector;
