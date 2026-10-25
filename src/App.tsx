
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
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

    const { data: s } = supabase.auth.onAuthStateChange((_event, ss) => {
      setSession(ss)
    })

    return () => s.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setG(null)
    setErr('')
    if (session) {
      getGroup().then(setG).catch((e: Error) => setErr(e.message))
    }
  }, [session])

  if (hash.startsWith('#/share/')) {
    return <SharedView token={hash.slice(8)} />
  }

  if (!configured) {
    return (
      <div className="app auth">
        <b className="logo">Zigama</b>
        <h1>Almost ready</h1>
        <div className="info">
          Add your Supabase keys to your .env file and restart npm run dev.
        </div>
      </div>
    )
  }

  if (!ready) {
    return <div className="app"><p className="empty">Loading...</p></div>
  }

  if (!session) return <Auth />

  if (err) {
    return (
      <div className="app">
        <div className="err">{err}</div>
        <button className="btn ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>
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

function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const go = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMsg('')
    setIsError(false)
    setBusy(true)

    try {
      if (mode === 'up') {
        const result = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: {
            data: { full_name: name.trim() },
          },
        })

        if (result.error) throw result.error

        if (!result.data.session) {
          setMsg('Account created. Check your email for a confirmation link, then sign in.')
        } else {
          setMsg('Account created successfully.')
        }
      } else {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pw,
        })

        if (result.error) throw result.error
      }
    } catch (error) {
      setIsError(true)
      setMsg(error instanceof Error ? error.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    if (!email.trim()) {
      setIsError(true)
      setMsg('Enter your email address first, then choose Forgot password.')
      return
    }

    setBusy(true)
    setMsg('')
    setIsError(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin },
      )

      if (error) throw error
      setMsg('If an account exists for this email, a password reset link will be sent.')
    } catch (error) {
      setIsError(true)
      setMsg(error instanceof Error ? error.message : 'Could not request a reset link.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'in' ? 'up' : 'in')
    setMsg('')
    setIsError(false)
    setPw('')
  }

  return (
    <main className="zig-auth-page">
      <section className="zig-auth-shell">
        <aside className="zig-auth-brand">
          <a className="zig-brand-logo" href="/" aria-label="Zigama home">
            <span className="zig-logo-mark">Z</span>
            <span>Zigama</span>
          </a>

          <div className="zig-brand-message">
            <span className="zig-eyebrow">SAVE TOGETHER. GROW TOGETHER.</span>
            <h1>Small contributions.<br />Stronger futures.</h1>
            <p>
              A clearer, simpler way to manage your ikimina,
              track contributions, and build financial progress together.
            </p>

            <div className="zig-brand-stat">
              <div className="zig-stat-icon">↗</div>
              <div>
                <strong>Your group, in one place</strong>
                <span>Contributions. Records. Progress.</span>
              </div>
            </div>
          </div>

          <div className="zig-brand-footer">
            <span className="zig-footer-dot" />
            Built for saving together
            <span>© {new Date().getFullYear()} Zigama</span>
          </div>
        </aside>

        <section className="zig-auth-form-panel">
          <div className="zig-mobile-logo">
            <span className="zig-logo-mark">Z</span>
            <span>Zigama</span>
          </div>

          <div className="zig-auth-form-wrap">
            <div className="zig-form-heading">
              <span className="zig-form-kicker">
                {mode === 'in' ? 'WELCOME BACK' : 'GET STARTED'}
              </span>
              <h2>{mode === 'in' ? 'Sign in to Zigama' : 'Create your account'}</h2>
              <p>
                {mode === 'in'
                  ? 'Enter your details to access your savings group.'
                  : 'Set up your account and start managing your ikimina.'}
              </p>
            </div>

            <form className="zig-form" onSubmit={go}>
              {mode === 'up' && (
                <label className="zig-field">
                  <span>Full name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    minLength={2}
                    required
                  />
                </label>
              )}

              <label className="zig-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="zig-field">
                <span>Password</span>
                <div className="zig-password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    placeholder={mode === 'up' ? 'At least 8 characters' : 'Enter your password'}
                    autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                    minLength={8}
                    required
                  />
                  <button
                    className="zig-show-password"
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              {mode === 'in' && (
                <div className="zig-forgot-row">
                  <button
                    type="button"
                    className="zig-text-button"
                    onClick={resetPassword}
                    disabled={busy}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {msg && (
                <div
                  className={`zig-message ${isError ? 'zig-message-error' : 'zig-message-success'}`}
                  role="status"
                >
                  {msg}
                </div>
              )}

              <button className="zig-submit" type="submit" disabled={busy}>
                {busy
                  ? 'Please wait...'
                  : mode === 'in'
                    ? 'Sign in to your account'
                    : 'Create account'}
                {!busy && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <div className="zig-auth-switch">
              {mode === 'in' ? "Don't have an account?" : 'Already have an account?'}
              <button type="button" onClick={switchMode}>
                {mode === 'in' ? 'Create account' : 'Sign in'}
              </button>
            </div>

            <div className="zig-security-note">
              <span aria-hidden="true">▣</span>
              Your account is protected by secure authentication.
            </div>
          </div>
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

  const go = async (e: FormEvent<HTMLFormElement>) => {
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
    <div className="app auth">
      <b className="logo">Zigama</b>
      <h1>Set up your ikimina</h1>
      <p className="soft">Three answers and you are ready.</p>

      <form onSubmit={go}>
        <label>
          Group name
          <input value={n} onChange={e => setN(e.target.value)} required />
        </label>

        <label>
          Contribution per member (RWF)
          <input
            type="number"
            min="1"
            step="1"
            value={a}
            onChange={e => setA(e.target.value)}
            required
          />
        </label>

        <label>
          How often?
          <select value={f} onChange={e => setF(e.target.value)}>
            <option value="monthly">Every month</option>
            <option value="weekly">Every week</option>
          </select>
        </label>

        {msg && <div className="err">{msg}</div>}

        <button className="btn" disabled={busy}>
          {busy ? 'Creating...' : 'Create group'}
        </button>
      </form>
    </div>
  )
}

     