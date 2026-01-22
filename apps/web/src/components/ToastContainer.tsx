import React from 'react'
import { useToast, Toast as ToastType } from '../contexts/ToastContext'

const ToastIcon = ({ type }: { type: ToastType['type'] }) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  return (
    <span className="text-lg mr-3 flex-shrink-0">
      {icons[type]}
    </span>
  )
}

const Toast = ({ toast }: { toast: ToastType }) => {
  const { removeToast } = useToast()

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  return (
    <div
      className={`
        ${typeStyles[toast.type]}
        border rounded-lg p-4 shadow-lg backdrop-blur-sm
        transform transition-all duration-300 ease-in-out
        max-w-md w-full
        animate-in slide-in-from-right fade-in
        data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out
      `}
    >
      <div className="flex items-start">
        <ToastIcon type={toast.type} />
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{toast.title}</p>
          {toast.message && (
            <p className="text-xs mt-1 opacity-90">{toast.message}</p>
          )}
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-xs underline hover:no-underline font-medium"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => removeToast(toast.id)}
          className="ml-2 text-lg leading-none opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-h-screen overflow-hidden">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

export default ToastContainer