import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { validateFile, formatFileSize } from '@/lib/utils'

interface Props {
  allowedTypes: string[]
  onFileSelect: (file: File) => void
  label?: string
  accept?: string
}

export function FileUploader({ allowedTypes, onFileSelect, label = '点击或拖拽上传文件', accept }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const err = validateFile(file, allowedTypes)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    onFileSelect(file)
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }`}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xs text-gray-400 mt-1">支持 {allowedTypes.map(t => t.split('/')[1]).join('、')}，最大 10MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept || allowedTypes.join(',')}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      {error && (
        <div className="flex items-center gap-1.5 mt-2 text-red-500 text-xs">
          <X className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  )
}
