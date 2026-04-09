import { Loader2 } from 'lucide-react'

interface Props {
  text?: string
  fullscreen?: boolean
}

export function Spinner({ text, fullscreen }: Props) {
  const inner = (
    <div className="flex flex-col items-center gap-2 text-gray-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      {text && <p className="text-sm">{text}</p>}
    </div>
  )
  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {inner}
      </div>
    )
  }
  return <div className="flex items-center justify-center p-8">{inner}</div>
}

interface OverlayProps {
  show: boolean
  text?: string
}

export function LoadingOverlay({ show, text }: OverlayProps) {
  if (!show) return null
  return <Spinner fullscreen text={text} />
}
