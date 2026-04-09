import { useToast } from '@/hooks/useToast'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
  info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
}

const BG = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-blue-50 border-blue-200',
}

export function ToastContainer() {
  const { toasts, remove } = useToast()
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-3 rounded-lg border shadow-md pointer-events-auto animate-in slide-in-from-right ${BG[toast.type]}`}
        >
          {ICONS[toast.type]}
          <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
          <button
            onClick={() => remove(toast.id)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            style={{ minWidth: 24, minHeight: 24 }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
