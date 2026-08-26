import React, { useEffect, useState, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showCloseButton = true
}) => {
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Manage Focus Trap & Keyboard Navigation (Only runs on open/close transitions)
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus on close
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Focus first appropriate element (preferring inputs/textareas over the close button)
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        // If user already focused something inside the dialog, do not steal focus
        if (dialogRef.current.contains(document.activeElement)) {
          return;
        }

        // 1. Prefer autofocus elements or first input/textarea/select in modal body
        const formControls = dialogRef.current.querySelectorAll<HTMLElement>(
          '[data-autofocus], input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
        );
        if (formControls.length > 0) {
          formControls[0].focus();
          return;
        }

        // 2. Fallback to any focusable element
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: if on first element, wrap to last
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to original element
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const maxWidthStyles = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '4xl': 'sm:max-w-4xl',
    full: 'sm:max-w-[92vw] sm:h-[90vh]'
  };

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center p-2.5 sm:p-6 overflow-hidden">
      {/* Dark Backdrop covering the entire viewport */}
      <div
        className="fixed inset-0 w-full h-full bg-[#1E202C]/65 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        aria-hidden="true"
      />

      {/* Symmetrically Centered Modal Dialog with strict desktop maxWidth & a11y attributes */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative w-full max-w-[calc(100vw-1.25rem)] ${maxWidthStyles[maxWidth]} bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#EBE5DF] overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] z-10 animate-fade-in outline-none`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#EBE5DF] bg-white shrink-0 gap-2">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 id={titleId} className="text-sm sm:text-base font-bold text-[#2B2D42] leading-snug break-words">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-[11px] sm:text-xs text-[#5A6275] mt-1 leading-relaxed break-words">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 text-[#8D99AE] hover:text-[#2B2D42] hover:bg-[#F5F1EB] rounded-xl transition-colors cursor-pointer shrink-0 mt-0.5"
                aria-label="Cerrar ventana modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content with min-h-0 for smooth flex child scrolling */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 overscroll-contain scroll-touch">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
