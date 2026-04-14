'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { ArrowRight, FileText, Lock, UploadCloud, X } from 'lucide-react'

interface UploadZoneProps {
  onUpload: (files: File[]) => void
}

export default function UploadZone({ onUpload }: UploadZoneProps) {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...acceptedFiles.filter((f) => !existing.has(f.name))]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  return (
    <div className="flex flex-col gap-3">

      <p className="text-xs text-zinc-400 leading-relaxed">
        Upload transcripts from multiple years to find all your employers.
      </p>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          group relative flex flex-col items-center justify-center gap-4
          rounded-2xl border-2 border-dashed p-10 cursor-pointer
          transition-all duration-300
          ${isDragActive
            ? 'border-amber-400 bg-amber-50 scale-[1.01]'
            : files.length > 0
              ? 'border-zinc-200 bg-zinc-50 hover:border-amber-300'
              : 'border-zinc-200 bg-zinc-50 hover:border-amber-400 hover:bg-amber-50/30'
          }
        `}
      >
        <input {...getInputProps()} />

        {isDragActive && (
          <div className="absolute inset-0 rounded-2xl bg-amber-100/20 blur-xl pointer-events-none" />
        )}

        <div className={`
          flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-all duration-300
          ${isDragActive
            ? 'bg-amber-100 ring-amber-300'
            : 'bg-white ring-zinc-200 group-hover:bg-amber-50 group-hover:ring-amber-300'
          }
        `}>
          <UploadCloud className={`h-5 w-5 transition-colors duration-300 ${
            isDragActive ? 'text-amber-500' : 'text-zinc-400 group-hover:text-amber-500'
          }`} />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-zinc-700">
            {isDragActive
              ? 'Drop your PDFs here'
              : files.length > 0
                ? 'Drop more transcripts to add'
                : 'Drag & drop your IRS tax transcripts'}
          </p>
          <p className="text-xs text-zinc-400">
            PDF format · multiple files supported
            <span className="mx-2 text-zinc-200">·</span>
            IRS Wage &amp; Income Transcript
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-300">
          <span className="h-px w-8 bg-zinc-200" />
          or click to browse
          <span className="h-px w-8 bg-zinc-200" />
        </div>
      </div>

      {/* File pills */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2 shadow-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="flex-1 min-w-0 truncate text-sm text-zinc-700">{file.name}</span>
              <span className="shrink-0 text-xs text-zinc-400">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(file.name)}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scan button */}
      {files.length > 0 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-zinc-400">
            {files.length} file{files.length !== 1 ? 's' : ''} ready to scan
          </p>
          <button
            type="button"
            onClick={() => onUpload(files)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-200 transition-opacity hover:opacity-90"
          >
            Scan Transcript{files.length !== 1 ? 's' : ''}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Privacy notice */}
      <div className="flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3 text-green-500 shrink-0" />
        <p className="text-xs text-zinc-400 text-center">
          Your documents are processed in memory and deleted immediately.{' '}
          <span className="text-zinc-500">We never store your files.</span>
        </p>
      </div>

    </div>
  )
}
