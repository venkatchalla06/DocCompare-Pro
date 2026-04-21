import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, FileText, X } from 'lucide-react'

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/html': ['.html', '.htm'],
  'text/markdown': ['.md'],
}
const MAX_SIZE = 50 * 1024 * 1024

interface Props {
  label: string
  file: File | null
  onFile: (f: File | null) => void
  color: 'blue' | 'green'
}

export default function DropZone({ label, file, onFile, color }: Props) {
  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop, accept: ACCEPTED, maxSize: MAX_SIZE, maxFiles: 1,
  })

  const borderColor = color === 'blue' ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'
  const activeColor = color === 'blue' ? 'border-blue-600 bg-blue-100' : 'border-green-600 bg-green-100'
  const iconColor   = color === 'blue' ? 'text-blue-400' : 'text-green-400'

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-gray-700">{label}</label>

      {file ? (
        <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${borderColor}`}>
          <FileText className={`w-8 h-8 ${iconColor}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={() => onFile(null)}
            className="p-1 rounded-full hover:bg-white/60 transition"
            title="Remove file"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition
            ${isDragActive ? activeColor : borderColor} hover:${activeColor}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${iconColor}`} />
          <p className="font-medium text-gray-700">
            {isDragActive ? 'Drop it here…' : 'Drag & drop or click to browse'}
          </p>
          <p className="text-xs text-gray-500 mt-1">PDF, DOCX, DOC, TXT, XLSX, HTML, MD — max 50 MB</p>
        </div>
      )}

      {fileRejections.length > 0 && (
        <p className="text-xs text-red-600 mt-1">
          {fileRejections[0].errors[0].message}
        </p>
      )}
    </div>
  )
}
