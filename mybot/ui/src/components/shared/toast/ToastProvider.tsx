import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CheckCircle, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return <CheckCircle size={18} />;
  if (type === 'error') return <XCircle size={18} />;
  return <Info size={18} />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function removeToast(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function showToast(type: ToastType, message: string) {
    const id = Date.now() + Math.random();

    setToasts((current) => [...current, { id, type, message }]);

    window.setTimeout(() => {
      removeToast(id);
    }, 3500);
  }

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => showToast('success', message),
      error: (message) => showToast('error', message),
      info: (message) => showToast('info', message),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-5 right-5 z-[9999] grid w-[min(420px,calc(100vw-40px))] gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${toastStyles[toast.type]}`}
          >
            <ToastIcon type={toast.type} />
            <div className="min-w-0 flex-1 break-words">{toast.message}</div>
            <button
              type="button"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-black/5"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  return context;
}
