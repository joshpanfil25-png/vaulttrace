'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, MessageCircle, X } from 'lucide-react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function HelpButton() {
  const [open, setOpen]           = useState(false)
  const [name, setName]           = useState('')
  const [phone, setPhone]         = useState('')
  const [status, setStatus]       = useState<Status>('idle')
  const [errorMsg, setErrorMsg]   = useState('')
  const nameRef                   = useRef<HTMLInputElement>(null)

  // Focus name field when modal opens
  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 50)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleClose() {
    setOpen(false)
    // Reset after close animation settles
    setTimeout(() => {
      if (status !== 'success') {
        setStatus('idle')
        setErrorMsg('')
      }
    }, 200)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/help-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     name.trim(),
          phone:    phone.trim(),
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      })

      if (res.ok) {
        setStatus('success')
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg((data as { error?: string }).error ?? 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Need help?"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-medium text-white shadow-xl shadow-amber-500/25 transition-all hover:opacity-90 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Need help?</span>
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          {/* Dim overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          {/* ── Modal ── */}
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/60">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-zinc-100">Need help?</span>
              </div>
              <button
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              {status === 'success' ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">Got it — we&apos;ll call you shortly.</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    We typically follow up within a few minutes during business hours.
                  </p>
                  <button
                    onClick={handleClose}
                    className="mt-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Enter your details and we&apos;ll personally walk you through the process.
                  </p>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="help-name" className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Your name
                    </label>
                    <input
                      ref={nameRef}
                      id="help-name"
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); if (status === 'error') setStatus('idle') }}
                      placeholder="Jane Smith"
                      autoComplete="name"
                      className="rounded-xl border border-zinc-700/60 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="help-phone" className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Phone number
                    </label>
                    <input
                      id="help-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); if (status === 'error') setStatus('idle') }}
                      placeholder="(555) 000-0000"
                      autoComplete="tel"
                      className="rounded-xl border border-zinc-700/60 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10"
                    />
                  </div>

                  {status === 'error' && errorMsg && (
                    <p className="text-xs text-red-400">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'submitting' || !name.trim() || !phone.trim()}
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-sm font-medium text-white shadow-md shadow-amber-500/20 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? 'Sending…' : 'Request a callback'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
