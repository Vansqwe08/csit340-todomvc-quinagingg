import { useState } from 'react'

const ADMIN_EMAIL = 'admin@daylight.app'
const ADMIN_PASSWORD = 'daylight-admin'

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  function handleLogin(event) {
    event.preventDefault()

    if (
      email.trim().toLowerCase() === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {
      onLogin()
      return
    }

    setMessage('That email and password do not match the demo admin account.')
    setMessageType('error')
  }

  function handleRegister(event) {
    event.preventDefault()
    setMessage('Registration is disabled in this demo. Your details were not saved; only the admin account can sign in.')
    setMessageType('notice')
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setMessageType('')
  }

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <a className="brand auth-brand" href="#" aria-label="Daylight home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 5.5c-1.6 4.1-5.8 5-5.8 10.1a5.8 5.8 0 1 0 11.6 0C21.8 10.5 17.6 9.6 16 5.5Z" fill="currentColor" />
              <path d="M15.9 18.4c-2.6.1-4.1 1.8-4.4 4.1 2.8-.1 4.4-1.5 4.4-4.1Zm.2 0c2.6.1 4.1 1.8 4.4 4.1-2.8-.1-4.4-1.5-4.4-4.1Z" fill="#fff" />
            </svg>
          </span>
          <span>daylight<span className="brand-period">.</span></span>
        </a>

        <div className="auth-story">
          <p className="auth-eyebrow"><span /> YOUR STUDY SPACE</p>
          <h1>Make learning<br />feel a little <span>lighter.</span></h1>
          <p className="auth-story-copy">
            Plan your study tasks, focus in short sprints, and celebrate every step forward.
          </p>
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-sparkle">✳</div>
            <p className="preview-label">A LITTLE PROGRESS, EVERY DAY</p>
            <div className="preview-line"><span className="preview-check">✓</span><span>Review your biology notes</span></div>
            <div className="preview-line"><span className="preview-check">✓</span><span>Practice a few math problems</span></div>
            <div className="preview-line preview-muted"><span className="preview-empty" /><span>Take a well-earned break</span></div>
            <div className="preview-progress"><span /></div>
          </div>
        </div>

        <p className="auth-showcase-footer">A calmer way to make learning happen.</p>
        <span className="auth-orb auth-orb-one" aria-hidden="true" />
        <span className="auth-orb auth-orb-two" aria-hidden="true" />
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path d="M16 5.5c-1.6 4.1-5.8 5-5.8 10.1a5.8 5.8 0 1 0 11.6 0C21.8 10.5 17.6 9.6 16 5.5Z" fill="currentColor" />
                <path d="M15.9 18.4c-2.6.1-4.1 1.8-4.4 4.1 2.8-.1 4.4-1.5 4.4-4.1Zm.2 0c2.6.1 4.1 1.8 4.4 4.1-2.8-.1-4.4-1.5-4.4-4.1Z" fill="#fff" />
              </svg>
            </span>
            <span>daylight<span className="brand-period">.</span></span>
          </div>

          <div className="auth-heading">
            <p className="auth-form-eyebrow">WELCOME TO DAYLIGHT</p>
            <h2>{mode === 'login' ? 'Your day, your way.' : 'Join the community.'}</h2>
            <p>
              {mode === 'login'
                ? 'Sign in to pick up where you left off.'
                : 'Create an account and make space for what matters.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => changeMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => changeMode('register')}
            >
              Register
            </button>
          </div>

          {mode === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-field">
                <span>Email address</span>
                <span className="auth-input-wrap">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="2.7" y="4.3" width="14.6" height="11.4" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m3.7 5.5 6.3 5.1 6.3-5.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="auth-field">
                <span>Password</span>
                <span className="auth-input-wrap">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="4" y="8.5" width="12" height="8.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6.7 8.5V6.2a3.3 3.3 0 0 1 6.6 0v2.3M10 11.8v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </span>
              </label>

              {message && <p className={`auth-message ${messageType}`} role="alert">{message}</p>}

              <button className="auth-submit" type="submit">
                Sign in <span aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <label className="auth-field">
                <span>Your name</span>
                <span className="auth-input-wrap">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="6.3" r="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4.2 16.4c.4-2.6 2.5-4.1 5.8-4.1s5.4 1.5 5.8 4.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    name="name"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="auth-field">
                <span>Email address</span>
                <span className="auth-input-wrap">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="2.7" y="4.3" width="14.6" height="11.4" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="m3.7 5.5 6.3 5.1 6.3-5.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="email"
                    name="registration-email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              <p className="registration-note">
                Account creation is currently turned off. This demo only allows the administrator to sign in.
              </p>
              {message && <p className={`auth-message ${messageType}`} role="status">{message}</p>}
              <button className="auth-submit" type="submit">
                Request an account <span aria-hidden="true">→</span>
              </button>
            </form>
          )}

          <p className="auth-legal">
            Demo sign-in only. This front-end check is not secure authentication.
          </p>
        </div>
      </section>
    </main>
  )
}

export default AuthScreen
