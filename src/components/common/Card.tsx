import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'interactive' | 'pastel_rose' | 'pastel_lavender' | 'pastel_mint';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-7'
  };

  const variantStyles = {
    default: 'bg-white border border-[#EBE5DF] shadow-[0_2px_8px_rgba(43,45,66,0.03)]',
    elevated: 'bg-white border border-[#EBE5DF] shadow-[0_8px_24px_rgba(43,45,66,0.06)]',
    subtle: 'bg-[#F5F1EB]/70 border border-[#EBE5DF]/80',
    interactive: 'bg-white border border-[#EBE5DF] hover:border-[#E8A598] hover:shadow-[0_6px_20px_rgba(232,165,152,0.12)] transition-all duration-200 cursor-pointer active:scale-[0.99]',
    pastel_rose: 'bg-[#FDF2F0] border border-[#E8A598]/40',
    pastel_lavender: 'bg-[#F3E5F5] border border-[#B39DDB]/40',
    pastel_mint: 'bg-[#E0F2F1] border border-[#80CBC4]/40'
  };

  return (
    <div
      className={`rounded-2xl ${paddingStyles[padding]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
