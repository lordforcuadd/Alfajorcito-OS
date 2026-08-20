import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'mint' | 'lavender';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A598] select-none cursor-pointer text-center';

  const sizeStyles = {
    sm: 'text-xs px-3 py-2 min-h-[38px] sm:min-h-[36px] gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-sm sm:text-base px-5 py-3 min-h-[48px] gap-2.5'
  };

  const variantStyles = {
    primary: 'bg-[#E8A598] hover:bg-[#D98880] text-[#2B2D42] shadow-xs font-bold border border-[#D98880]/30',
    secondary: 'bg-white hover:bg-[#F5F1EB] text-[#2B2D42] border border-[#EBE5DF] shadow-xs',
    ghost: 'bg-transparent hover:bg-[#F5F1EB] text-[#5A6275] hover:text-[#2B2D42]',
    danger: 'bg-[#FFEBEE] hover:bg-[#FFCDD2] text-[#C62828] border border-[#EF9A9A]',
    mint: 'bg-[#E0F2F1] hover:bg-[#B2DFDB] text-[#00695C] border border-[#80CBC4]',
    lavender: 'bg-[#F3E5F5] hover:bg-[#E1BEE7] text-[#6A1B9A] border border-[#CE93D8]'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4 text-current shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
      ) : null}
      {typeof children === 'string' ? (
        <span className="truncate">{children}</span>
      ) : (
        children
      )}
    </button>
  );
};
