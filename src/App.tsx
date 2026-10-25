
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, configured } from './lib/supabase'
import { getGroup, createGroup } from './lib/data'
import { checkAmount } from './lib/money'
import type { G } from './lib/types'
import Dashboard from './Dashboard'
import SharedView from './SharedView'
import './auth.css'

export default function App() {
  const [hash, setHash] = useState(location.hash)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [g, setG] = useState<G | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    const f = () => setHash(location.hash)
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])

  useEffect(() => {
    if (!configured) {
      setReady(true)
      return
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setErr(error.message)
      setSession(data.session)
      setReady(true)
    })

    const { data: s } = supabase.auth.onAuthStateChange((_e, ss) => {
      setSession(ss)
    })

    return () => s.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setG(null)
    setErr('')
    if (session) getGroup().then(setG).catch(e => setErr(e.message))
  }, [session])

  if (hash.startsWith('#/share/')) {
    return <SharedView token={hash.slice(8)} />
  }

  if (!configured) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <Brand />
          <h1>Almost ready</h1>
          <p className="auth-description">
            Connect your Supabase project to start using Zigama.
          </p>
          <div className="auth-message">
            Add your Supabase keys to your local <code>.env</code> file using
            <code> .env.example </code> as a guide, then restart the app.
          </div>
        </section>
      </main>
    )
  }

  if (!ready) {
    return (
      <main className="auth-shell">
        <section className="auth-card loading-card">
          <Brand />
          <div className="auth-spinner" />
          <p className="auth-description">Preparing your savings space...</p>
        </section>
      </main>
    )
  }

  if (!session) return <Auth />

  if (err) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <Brand />
          <div className="auth-message auth-error">{err}</div>
          <button
            className="auth-primary"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </section>
      </main>
    )
  }

  if (!g) return <Setup onDone={setG} />

  return (
    <Dashboard
      g={g}
      onSignOut={() => supabase.auth.signOut()}
      onDeleted={() => setG(null)}
    />
  )
}

function Brand() {
  return (
    <a href="/" className="auth-brand" aria-label="Zigama home">
      <span className="brand-symbol">Z</span>
      <span>Zigama</span>
    </a>
  )
}


function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetMode, setResetMode] = useState(false)

  const go = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg('')
    setBusy(true)

    try {
      const cleanEmail = email.trim()

      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        })
        if (error) throw error

        setMsg('If an account exists for this email, password reset instructions will be sent.')
        return
      }

      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pw,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pw,
        })
        if (error) throw error

        setMsg(
          data.session
            ? 'Your account has been created.'
            : 'Check your email to confirm your account, then sign in.'
        )
      }
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const changeMode = (next: 'in' | 'up') => {
    setMode(next)
    setResetMode(false)
    setMsg('')
    setPw('')
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-main-card">
        <div className="auth-top">
          <Brand />
          <span className="auth-region">IKIMINA MANAGEMENT</span>
        </div>

        <div className="auth-heading">
          <h1>
            {resetMode
              ? 'Reset password'
              : mode === 'in'
                ? 'Welcome back'
                : 'Create your account'}
          </h1>
          <p className="auth-description">
            {resetMode
              ? 'Enter your email to receive a password reset link.'
              : mode === 'in'
                ? 'Sign in to manage your savings group.'
                : 'Get started with your savings group on Zigama.'}
          </p>
        </div>

        {!resetMode && (
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'in'}
              className={mode === 'in' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => changeMode('in')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'up'}
              className={mode === 'up' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => changeMode('up')}
            >
              Create account
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={go}>
          <label htmlFor="zigama-email">Email address</label>
          <input
            id="zigama-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />

          {!resetMode && (
            <>
              <div className="auth-label-row">
                <label htmlFor="zigama-password">Password</label>
                {mode === 'in' && (
                  <button
                    className="auth-text-link"
                    type="button"
                    onClick={() => {
                      setResetMode(true)
                      setMsg('')
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="password-wrap">
                <input
                  id="zigama-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'up' ? 'At least 8 characters' : 'Enter your password'}
                  minLength={8}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </>
          )}

          {msg && (
            <div
              className="auth-message"
              role="status"
              aria-live="polite"
            >
              {msg}
            </div>
          )}

          <button className="auth-primary" type="submit" disabled={busy}>
            {busy
              ? 'Please wait...'
              : resetMode
                ? 'Send reset link'
                : mode === 'in'
                  ? 'Sign in'
                  : 'Create account'}
          </button>
        </form>

        {resetMode && (
          <button
            className="auth-back-link"
            type="button"
            onClick={() => {
              setResetMode(false)
              setMsg('')
            }}
          >
            ← Back to sign in
          </button>
        )}

        <div className="auth-bottom">
          <span className="auth-bottom-mark">✓</span>
          <span>Your account and group records are protected.</span>
        </div>
      </section>

      <footer className="auth-page-footer">
        Zigama <span>·</span> Save together, grow together.
      </footer>
    </main>
  )
}

  return (
    <main className="auth-shell">
      <section className="auth-layout">
        <aside className="auth-story">
          <Brand />

          <div className="story-content">
            <span className="story-eyebrow">
              YOUR COMMUNITY. YOUR FUTURE.
            </span>

            <h1>
              Save together.
              <br />
              <span>Grow together.</span>
            </h1>

            <p className="story-description">
              Small contributions. Stronger futures. A clearer, simpler way
              to manage your ikimina, track contributions, and build financial
              progress together.
            </p>

            <div className="story-feature">
              <span className="feature-icon">↗</span>
              <div>
                <strong>Your group, in one place</strong>
                <p>Contributions. Records. Progress.</p>
              </div>
            </div>
          </div>

          <p className="story-footer">
            Built for saving together <span>·</span> © 2026 Zigama
          </p>
        </aside>

        <section className="auth-form-side">
          <div className="mobile-brand">
            <Brand />
          </div>

          <div className="auth-form-content">
            <span className="form-eyebrow">
              {resetMode
                ? 'ACCOUNT RECOVERY'
                : mode === 'in'
                  ? 'WELCOME BACK'
                  : 'GET STARTED'}
            </span>

            <h2>
              {resetMode
                ? 'Reset your password'
                : mode === 'in'
                  ? 'Sign in to Zigama'
                  : 'Create your account'}
            </h2>

            <p className="auth-description">
              {resetMode
                ? 'Enter your email and we will send you password reset instructions.'
                : mode === 'in'
                  ? 'Enter your details to access your savings group.'
                  : 'Create an account to start managing your savings group.'}
            </p>

            <form className="auth-form" onSubmit={go}>
              <label htmlFor="zigama-email">Email address</label>
              <input
                id="zigama-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              {!resetMode && (
                <>
                  <label htmlFor="zigama-password">Password</label>
                  <div className="password-wrap">
                    <input
                      id="zigama-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      minLength={8}
                      value={pw}
                      onChange={e => setPw(e.target.value)}
                      autoComplete={
                        mode === 'in' ? 'current-password' : 'new-password'
                      }
                      required
                    />
                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </>
              )}

              {msg && (
                <div className="auth-message" role="status">
                  {msg}
                </div>
              )}

              <button className="auth-primary" type="submit" disabled={busy}>
                {busy
                  ? 'Please wait...'
                  : resetMode
                    ? 'Send reset instructions'
                    : mode === 'in'
                      ? 'Sign in to your account'
                      : 'Create account'}
              </button>
            </form>

            {mode === 'in' && !resetMode && (
              <button
                className="auth-text-link forgot-link"
                type="button"
                onClick={() => setResetMode(true)}
              >
                Forgot password?
              </button>
            )}

            <div className="auth-divider">
              <span> {resetMode ? 'Remember your password?' : 'OR'} </span>
            </div>

            <p className="auth-switch">
              {resetMode ? (
                <button
                  className="auth-text-link"
                  type="button"
                  onClick={() => {
                    setResetMode(false)
                    setMsg('')
                  }}
                >
                  Back to sign in
                </button>
              ) : mode === 'in' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    className="auth-text-link"
                    type="button"
                    onClick={() => {
                      setMode('up')
                      setMsg('')
                    }}
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    className="auth-text-link"
                    type="button"
                    onClick={() => {
                      setMode('in')
                      setMsg('')
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            <div className="auth-security">
              <span className="security-icon">✓</span>
              <p>
                Your account is protected by secure authentication.
              </p>
            </div>
          </div>

          <p className="mobile-footer">Built for saving together · © 2026 Zigama</p>
        </section>
      </section>
    </main>
  )
}

function Setup({ onDone }: { onDone: (g: G) => void }) {
  const [n, setN] = useState('')
  const [a, setA] = useState('')
  const [f, setF] = useState('monthly')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async (e: React.FormEvent) => {
    e.preventDefault()
    const bad = checkAmount(Number(a))

    if (bad || n.trim().length < 2) {
      setMsg(bad || 'Group name is too short.')
      return
    }

    setBusy(true)
    setMsg('')

    try {
      onDone(await createGroup(n.trim(), Number(a), f))
    } catch (x) {
      setMsg((x as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card setup-card">
        <Brand />

        <span className="form-eyebrow">YOUR GROUP STARTS HERE</span>
        <h1>Set up your ikimina</h1>
        <p className="auth-description">
          Three simple details and your group is ready.
        </p>

        <form className="auth-form" onSubmit={go}>
          <label htmlFor="group-name">Group name</label>
          <input
            id="group-name"
            value={n}
            onChange={e => setN(e.target.value)}
            placeholder="e.g. Our Family Savings"
            minLength={2}
            required
          />

          <label htmlFor="group-amount">Contribution per member (RWF)</label>
          <input
            id="group-amount"
            type="number"
            min="1"
            step="1"
            value={a}
            onChange={e => setA(e.target.value)}
            placeholder="e.g. 10000"
            required
          />

          <label htmlFor="group-frequency">How often do you contribute?</label>
          <select
            id="group-frequency"
            value={f}
            onChange={e => setF(e.target.value)}
          >
            <option value="monthly">Every month</option>
            <option value="weekly">Every week</option>
          </select>

          {msg && (
            <div className="auth-message auth-error" role="alert">
              {msg}
            </div>
          )}

          <button className="auth-primary" type="submit" disabled={busy}>
            {busy ? 'Creating group...' : 'Create my group'}
          </button>
        </form>
      </section>
    </main>
  )
}

     