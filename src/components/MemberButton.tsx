"use client";

import React from 'react';

interface MemberButtonProps {
    name: string;
    role: string;
    part?: string;
    isHiring?: boolean;
    isSelected?: boolean;
    onClick: () => void;
}

const PART_COLORS: Record<string, string> = {
    'PO': 'border-amber-400 bg-amber-400 text-white shadow-amber-200',
    'UX': 'border-indigo-400 bg-indigo-400 text-white shadow-indigo-200',
    'Eng': 'border-emerald-400 bg-emerald-400 text-white shadow-emerald-200',
    'R&D': 'border-pink-400 bg-pink-400 text-white shadow-pink-200',
};

const PART_BORDERS: Record<string, string> = {
    'PO': 'border-amber-200 text-amber-600 hover:border-amber-400',
    'UX': 'border-indigo-200 text-indigo-600 hover:border-indigo-400',
    'Eng': 'border-emerald-200 text-emerald-600 hover:border-emerald-400',
    'R&D': 'border-pink-200 text-pink-600 hover:border-pink-400',
};

export default function MemberButton({ name, role, part = 'PO', isHiring, isSelected, onClick }: MemberButtonProps) {
    if (isHiring) {
        return (
            <div className="px-4 py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-300 flex flex-col items-center">
                <span className="text-xs font-bold leading-tight">{name}</span>
                <span className="text-[10px] opacity-60 font-medium">{role}</span>
            </div>
        );
    }

    const activeStyles = PART_COLORS[part] || 'border-accent bg-accent text-white shadow-blue-200';
    const inactiveStyles = PART_BORDERS[part] || 'border-slate-200 text-slate-600 hover:border-slate-400';

    return (
        <button
            onClick={onClick}
            className={`
        px-4 py-2 rounded-xl border-2 transition-all duration-300 flex flex-col items-center
        ${isSelected
                    ? `${activeStyles} scale-105 shadow-lg z-10 font-bold`
                    : `${inactiveStyles} bg-white/50 opacity-80 backdrop-blur-sm`
                }
      `}
        >
            <span className="text-xs leading-tight whitespace-nowrap">{name}</span>
            <span className={`text-[10px] font-medium ${isSelected ? 'opacity-90' : 'opacity-50'}`}>{role}</span>
        </button>
    );
}
