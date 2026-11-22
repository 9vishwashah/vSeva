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
    // Right-anchoring the dropdown to its trigger button (the original,
    // unchanged default) overflows off the left edge of the viewport when
    // that button itself sits near the screen's left edge (seen on the
    // Group Analytics page on mobile, where this button wraps onto its own
    // line at the row's start). Measured off the trigger, not the dropdown
    // itself, so no extra render/flicker is needed before it opens.
    const [alignLeft, setAlignLeft] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const DROPDOWN_WIDTH = 176; // px, matches w-44 below

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
                onClick={() => {
                    if (!open && ref.current) {
                        const rect = ref.current.getBoundingClientRect();
                        setAlignLeft(rect.right - DROPDOWN_WIDTH < 8);
                    }
                    setOpen(o => !o);
                }}
                className="num flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-surface ring-1 ring-inset ring-line hover:bg-white transition-colors text-[13px] font-semibold text-ink whitespace-nowrap"
            >
                <Calendar size={15} className="text-ink-2" />
                {selectedBounds.label}
                <ChevronDown size={14} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className={`absolute ${alignLeft ? 'left-0' : 'right-0'} mt-2 w-44 bg-surface rounded-2xl shadow-xl ring-1 ring-line z-50 overflow-hidden py-1.5`}>
                    {options.map(y => {
                        const bounds = getViharYearBoundsForStartYear(y);
                        const isSelected = y === selectedStartYear;
                        const isCurrent = y === currentStartYear;
                        return (
                            <button
                                key={y}
                                type="button"
                                onClick={() => { onChange(y); setOpen(false); }}
                                className={`num w-full text-left px-4 py-2.5 text-[14px] font-medium flex items-center justify-between gap-2 hover:bg-sunken transition-colors ${isSelected ? 'text-ink font-semibold bg-sunken' : 'text-ink-2'}`}
                            >
                                <span>{bounds.label}</span>
                                {isCurrent && <span className="text-[11px] font-semibold text-ok bg-ok-soft px-2 py-0.5 rounded-full shrink-0">Current</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ViharYearSelector;
