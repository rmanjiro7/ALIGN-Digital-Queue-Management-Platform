import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Icon } from './Icon';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Custom hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, [removeToast]);

  const success = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast({ type: 'success', message, title, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast({ type: 'error', message, title, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast({ type: 'warning', message, title, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => {
      addToast({ type: 'info', message, title, duration });
    },
    [addToast]
  );

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

// Individual Toast Item Component
interface ToastItemProps {
  toast: Toast;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Match animation duration
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    }
  };

  // Get icon and colors based on toast type
  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <Icon icon="lucide:check-circle-2" className="w-4 h-4 shrink-0 text-emerald-600" />,
          borderClass: 'border-emerald-200',
          role: 'status',
          ariaLive: 'polite' as const,
        };
      case 'error':
        return {
          icon: <Icon icon="lucide:x-circle" className="w-4 h-4 shrink-0 text-red-600" />,
          borderClass: 'border-red-200',
          role: 'alert',
          ariaLive: 'assertive' as const,
        };
      case 'warning':
        return {
          icon: <Icon icon="lucide:alert-triangle" className="w-4 h-4 shrink-0 text-amber-600" />,
          borderClass: 'border-amber-200',
          role: 'status',
          ariaLive: 'polite' as const,
        };
      case 'info':
        return {
          icon: <Icon icon="lucide:info" className="w-4 h-4 shrink-0 text-[#f54e00]" />,
          borderClass: 'border-[#e6e5e0]',
          role: 'status',
          ariaLive: 'polite' as const,
        };
    }
  };

  const config = getToastConfig();

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      onKeyDown={handleKeyDown}
      className={`
        pointer-events-auto
        bg-white
        border ${config.borderClass}
        rounded-md
        p-4
        shadow-md
        flex items-start gap-3
        transition-all duration-300
        ${isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
        animate-in slide-in-from-right
      `}
    >
      {/* Icon */}
      <div className="mt-0.5">{config.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-xs font-medium text-[#26251e] mb-0.5">
            {toast.title}
          </div>
        )}
        <div className="text-xs text-[#73726c] leading-relaxed break-words font-sans">
          {toast.message}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 hover:bg-[#fafaf7] rounded transition-colors cursor-pointer text-[#8c8b85] hover:text-[#26251e]"
        aria-label="Dismiss notification"
        type="button"
      >
        <Icon icon="lucide:x" className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Convenience export for direct toast calls (alternative to hook)
let toastFunctions: Omit<ToastContextValue, 'toasts' | 'addToast' | 'removeToast'> | null = null;

export const setToastFunctions = (
  functions: Omit<ToastContextValue, 'toasts' | 'addToast' | 'removeToast'>
) => {
  toastFunctions = functions;
};

// Imperative API for use outside React components (optional)
export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    if (toastFunctions) toastFunctions.success(message, title, duration);
    else console.warn('Toast not initialized. Wrap app in ToastProvider.');
  },
  error: (message: string, title?: string, duration?: number) => {
    if (toastFunctions) toastFunctions.error(message, title, duration);
    else console.warn('Toast not initialized. Wrap app in ToastProvider.');
  },
  warning: (message: string, title?: string, duration?: number) => {
    if (toastFunctions) toastFunctions.warning(message, title, duration);
    else console.warn('Toast not initialized. Wrap app in ToastProvider.');
  },
  info: (message: string, title?: string, duration?: number) => {
    if (toastFunctions) toastFunctions.info(message, title, duration);
    else console.warn('Toast not initialized. Wrap app in ToastProvider.');
  },
};
