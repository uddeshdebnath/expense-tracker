'use client'

import { supabase } from '@/lib/supabaseClient'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ─── tiny SVG icons (no extra dep) ────────────────────────────────────────────
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M2 7l10 7 10-7"/>
    </svg>
  )
}

function IconLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}

function IconEye({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

// ─── decorative ledger lines (background texture) ─────────────────────────────
function LedgerLines() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-full"
          style={{
            top: `${60 + i * 52}px`,
            height: '1px',
            background: 'rgba(26,23,20,0.055)',
          }}
        />
      ))}
      {/* left margin rule */}
      <div
        className="absolute top-0 bottom-0"
        style={{ left: '52px', width: '1px', background: 'rgba(193,125,42,0.18)' }}
      />
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()

  // 'login' | 'signup'
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState(null)
  // Signup-specific: show confirmation instead of form after success
  const [signedUp, setSignedUp] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  // Redirect already-authenticated users straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    })

    // Also catches token refresh or magic-link confirmation in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/dashboard')
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Switch mode and clear transient state
  function switchMode(next) {
    setMode(next)
    setError(null)
    setSignedUp(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const msg =
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message
      setError(msg)
      setLoading(false)
    }
    // On success: onAuthStateChange fires → router.replace('/dashboard')
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Supabase sends a confirmation email by default.
    // If email confirmation is disabled in your project, onAuthStateChange
    // will fire immediately and redirect to /dashboard automatically.
    setSignedUp(true)
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--cream)' }}>
        <span className="font-mono text-sm" style={{ color: 'var(--ink-muted)' }}>···</span>
      </div>
    )
  }

  // ── Signup success screen ──────────────────────────────────────────────────
  if (signedUp) {
    return (
      <main className="relative min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
        <LedgerLines />
        <div className="relative flex flex-col flex-1 px-8 pt-20 pb-12 max-w-sm mx-auto w-full">
          <div
            className="inline-flex items-center justify-center w-9 h-9 rounded mb-10"
            style={{ background: 'var(--amber)', color: '#fff' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 className="font-serif text-3xl leading-tight mb-4" style={{ color: 'var(--ink)' }}>
            Check your<br /><em>inbox.</em>
          </h1>
          <p className="font-mono text-xs leading-relaxed" style={{ color: 'var(--ink-muted)', fontWeight: 300 }}>
            We sent a confirmation link to <strong style={{ fontWeight: 400 }}>{email}</strong>.
            Click it to activate your account, then come back to sign in.
          </p>
          <button
            onClick={() => switchMode('login')}
            className="mt-10 font-mono text-xs underline text-left"
            style={{ color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back to sign in
          </button>
        </div>
      </main>
    )
  }

  const isLogin = mode === 'login'

  return (
    <main
      className="relative min-h-screen flex flex-col"
      style={{ background: 'var(--cream)' }}
    >
      <LedgerLines />

      <div className="relative flex flex-col flex-1 px-8 pt-20 pb-12 max-w-sm mx-auto w-full">

        {/* Brand */}
        <header className="mb-14">
          <div
            className="inline-flex items-center justify-center w-9 h-9 rounded mb-6"
            style={{ background: 'var(--amber)', color: '#fff' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="font-serif text-3xl leading-tight" style={{ color: 'var(--ink)' }}>
            {isLogin ? (<>Welcome<br /><em>back.</em></>) : (<>Create an<br /><em>account.</em></>)}
          </h1>
          <p className="font-mono text-xs mt-3" style={{ color: 'var(--ink-muted)', fontWeight: 300 }}>
            {isLogin ? 'Sign in to your shared ledger' : 'Start tracking shared expenses'}
          </p>
        </header>

        {/* Form */}
        <form onSubmit={isLogin ? handleLogin : handleSignup} className="flex flex-col gap-10" noValidate>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="flex items-center gap-2 font-mono text-xs mb-3"
              style={{ color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              <IconMail /> Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-ledger"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="flex items-center gap-2 font-mono text-xs mb-3"
              style={{ color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              <IconLock /> Password
              {!isLogin && (
                <span style={{ color: 'var(--ink-faint)', fontWeight: 300 }}>(min. 6 chars)</span>
              )}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={isLogin ? undefined : 6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-ledger pr-8"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1"
                style={{ color: 'var(--ink-faint)' }}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <IconEye open={showPw} />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="font-mono text-xs px-4 py-3 rounded"
              style={{
                background: 'var(--red-bg)',
                color: 'var(--red-soft)',
                border: '1px solid rgba(155,58,42,0.18)',
                letterSpacing: '0.01em',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Primary action */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              background: loading ? 'var(--ink-faint)' : 'var(--ink)',
              color: 'var(--cream)',
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: 'none',
              borderRadius: '2px',
              padding: '14px 24px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease, transform 0.1s ease',
              width: '100%',
            }}
            onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {loading
              ? (isLogin ? 'Signing in…' : 'Creating account…')
              : (isLogin ? 'Sign in →' : 'Create account →')}
          </button>
        </form>

        {/* Mode switch */}
        <div className="mt-8">
          <p className="font-mono text-xs" style={{ color: 'var(--ink-muted)', fontWeight: 300 }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(isLogin ? 'signup' : 'login')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'DM Mono', monospace",
                fontSize: 'inherit',
                color: 'var(--amber)',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-16">
          <p className="font-mono text-xs" style={{ color: 'var(--ink-faint)', fontWeight: 300 }}>
            Session is saved automatically.
          </p>
        </footer>
      </div>
    </main>
  )
}