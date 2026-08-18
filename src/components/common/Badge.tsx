import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import type { VerificationStatus, CitationStyle } from '../../types';

export type BadgeVariant =
  | 'default'
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'age_ok'
  | 'age_review'
  | 'age_bad'
  | 'rose'
  | 'lavender'
  | 'mint'
  | 'amber';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold'
  };

  const variantStyles = {
    default: 'bg-[#F5F1EB] text-[#5A6275] border border-[#EBE5DF]',
    verified: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
    partially_verified: 'bg-amber-50 text-amber-800 border border-amber-300',
    unverified: 'bg-rose-50 text-rose-800 border border-rose-300',
    age_ok: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    age_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    age_bad: 'bg-rose-50 text-rose-700 border border-rose-200',
    rose: 'bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/60',
    lavender: 'bg-[#F3E5F5] text-[#512DA8] border border-[#B39DDB]/60',
    mint: 'bg-[#E0F2F1] text-[#004D40] border border-[#80CBC4]/60',
    amber: 'bg-[#FFF8E1] text-[#795548] border border-[#FFCC80]/60'
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl select-none shrink-0 whitespace-nowrap leading-none tracking-normal ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
      <span className="shrink-0">{children}</span>
    </span>
  );
};

export const VerificationBadge: React.FC<{ status: VerificationStatus; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  if (status === 'VERIFIED') {
    return (
      <Badge variant="verified" size={size} icon={<CheckCircle2 className="w-3 h-3 text-emerald-700" />}>
        VERIFICADA
      </Badge>
    );
  }
  if (status === 'PARTIALLY_VERIFIED') {
    return (
      <Badge variant="partially_verified" size={size} icon={<HelpCircle className="w-3 h-3 text-amber-700" />}>
        PARCIAL
      </Badge>
    );
  }
  return (
    <Badge variant="unverified" size={size} icon={<AlertCircle className="w-3 h-3 text-rose-700" />}>
      POR VERIFICAR
    </Badge>
  );
};

export const CitationStyleBadge: React.FC<{ style: CitationStyle; size?: 'sm' | 'md'; className?: string }> = ({
  style,
  size = 'sm',
  className = ''
}) => {
  const labelMap: Record<CitationStyle, string> = {
    APA_7: 'APA 7',
    MLA_9: 'MLA 9',
    IEEE: 'IEEE',
    CHICAGO_AUTHOR_DATE: 'Chicago',
    CHICAGO_NOTES: 'Chicago',
    VANCOUVER: 'Vancouver'
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold font-mono tracking-tight shrink-0 whitespace-nowrap select-none rounded-lg px-2.5 py-1 text-[10px] sm:text-[11px] bg-[#FDF2F0] text-[#8C3A32] border border-[#E8A598]/60 shadow-2xs ${className}`}
    >
      {labelMap[style] || style}
    </span>
  );
};
