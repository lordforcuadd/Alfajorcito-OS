import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1 sm:space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] sm:text-xs font-bold text-[#5A6275] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 sm:left-3.5 pointer-events-none text-[#8D99AE] flex items-center shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-white border ${
            error ? 'border-[#EF9A9A] focus:ring-[#EF9A9A]' : 'border-[#EBE5DF] focus:border-[#E8A598] focus:ring-[#E8A598]/20'
          } rounded-xl sm:rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm text-[#2B2D42] placeholder:text-[#8D99AE] focus:outline-none focus:ring-2 sm:focus:ring-3 transition-all duration-150 shadow-2xs ${
            leftIcon ? 'pl-9 sm:pl-10' : ''
          } ${rightIcon ? 'pr-9 sm:pr-10' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 sm:right-3.5 text-[#8D99AE] flex items-center shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-[11px] sm:text-xs text-[#C62828] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] sm:text-xs text-[#8D99AE]">{helperText}</p>
      ) : null}
    </div>
  );
});
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  leftIcon,
  children,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1 sm:space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-[11px] sm:text-xs font-bold text-[#5A6275] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 sm:left-3.5 pointer-events-none text-[#8D99AE] flex items-center shrink-0">
            {leftIcon}
          </div>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full appearance-none bg-white border ${
            error ? 'border-[#EF9A9A] focus:ring-[#EF9A9A]' : 'border-[#EBE5DF] focus:border-[#E8A598] focus:ring-[#E8A598]/20'
          } rounded-xl sm:rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 pr-9 sm:pr-10 text-xs sm:text-sm text-[#2B2D42] focus:outline-none focus:ring-2 sm:focus:ring-3 transition-all duration-150 shadow-2xs cursor-pointer ${
            leftIcon ? 'pl-9 sm:pl-10' : ''
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 sm:right-3.5 pointer-events-none text-[#8D99AE] flex items-center shrink-0">
          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </div>
      {error ? (
        <p className="text-[11px] sm:text-xs text-[#C62828] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] sm:text-xs text-[#8D99AE]">{helperText}</p>
      ) : null}
    </div>
  );
});
Select.displayName = 'Select';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  helperText,
  className = '',
  id,
  rows = 4,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1 sm:space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] sm:text-xs font-bold text-[#5A6275] uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`w-full bg-white border ${
          error ? 'border-[#EF9A9A] focus:ring-[#EF9A9A]' : 'border-[#EBE5DF] focus:border-[#E8A598] focus:ring-[#E8A598]/20'
        } rounded-xl sm:rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm text-[#2B2D42] placeholder:text-[#8D99AE] focus:outline-none focus:ring-2 sm:focus:ring-3 transition-all duration-150 resize-y shadow-2xs ${className}`}
        {...props}
      />
      {error ? (
        <p className="text-[11px] sm:text-xs text-[#C62828] font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] sm:text-xs text-[#8D99AE]">{helperText}</p>
      ) : null}
    </div>
  );
});
TextArea.displayName = 'TextArea';
