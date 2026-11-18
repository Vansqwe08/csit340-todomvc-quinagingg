import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import process from 'node:process'

fs.mkdirSync('./data', { recursive: true })
const app = express()
const db = new Database('./data/daylight.sqlite')
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    username TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_state (
    user_id TEXT PRIMARY KEY,
    todos TEXT NOT NULL DEFAULT '[]',
    schedule TEXT NOT NULL DEFAULT '[]',
    focus_stats TEXT NOT NULL DEFAULT '{"sessions":0,"minutes":0}',
    streak TEXT NOT NULL DEFAULT '{"days":0,"lastStudiedDate":"","history":[]}',
    profile TEXT NOT NULL DEFAULT '{}',
    theme TEXT NOT NULL DEFAULT 'light',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

const userColumns = db.pragma('table_info(users)')
if (!userColumns.some((column) => column.name === 'username')) {
  db.exec('ALTER TABLE users ADD COLUMN username TEXT')
}

const existingUsers = db.prepare(`
  SELECT id, email FROM users
  WHERE username IS NULL OR username = ''
  ORDER BY CASE WHEN email = 'admin@daylight.app' THEN 0 ELSE 1 END, id
`).all()
const usernames = new Set(db.prepare('SELECT username FROM users WHERE username IS NOT NULL').all()
  .map((user) => user.username.toLowerCase()))
const updateUsername = db.prepare('UPDATE users SET username = ? WHERE id = ?')
for (const user of existingUsers) {
  const base = (user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '_') || 'user').slice(0, 30)
  let username = base
  let suffix = 2
  while (usernames.has(username.toLowerCase())) {
    const tail = String(suffix++)
    username = `${base.slice(0, 30 - tail.length)}${tail}`
  }
  updateUsername.run(username, user.id)
  usernames.add(username.toLowerCase())
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users(username COLLATE NOCASE)')

const ADMIN_EMAIL = 'admin@daylight.app'
const ADMIN_PASSWORD = 'daylight-admin'

const findUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
const findUserByUsername = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
const getState = db.prepare('SELECT * FROM app_state WHERE user_id = ?')
const getSession = db.prepare(`
  SELECT sessions.token, users.id, users.name, users.email
  FROM sessions
  JOIN users ON users.id = sessions.user_id
  WHERE sessions.token = ? AND sessions.expires_at > datetime('now')
`)

if (!findUserByEmail.get(ADMIN_EMAIL)) {
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO users (id, name, username, email, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run(id, 'Administrator', 'admin', ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASSWORD, 10))
  db.prepare('INSERT INTO app_state (user_id) VALUES (?)').run(id)
}

app.use(cors())
app.use(express.json({ limit: '2mb' }))

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex')
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))")
    .run(token, user.id)
  return { token, user: { id: user.id, name: user.name, username: user.username, email: user.email } }
}

function authenticate(req, res, next) {
  const authorization = req.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const session = getSession.get(token)
  if (!session) return res.status(401).json({ error: 'Please sign in again.' })
  req.user = session
  req.token = token
  next()
}

app.post('/api/auth/register', (req, res) => {
  const name = String(req.body.name || '').trim()
  const username = String(req.body.username || '').trim().toLowerCase()
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (!name || !email || password.length < 6
    || !/^[a-z0-9_.-]{3,30}$/.test(username)) {
    return res.status(400).json({
      error: 'Enter your name, a username (3-30 letters, numbers, dots, dashes, or underscores), and a password of at least 6 characters.',
    })
  }
  if (findUserByUsername.get(username)) {
    return res.status(409).json({ error: 'That username is already taken.' })
  }
  if (findUserByEmail.get(email)) {
    return res.status(409).json({ error: 'An account with this email already exists.' })
  }

  const id = crypto.randomUUID()
  db.prepare('INSERT INTO users (id, name, username, email, password_hash) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, username, email, bcrypt.hashSync(password, 10))
  db.prepare('INSERT INTO app_state (user_id) VALUES (?)').run(id)
  res.status(201).json(createSession({ id, name, username, email }))
})

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')
  const user = findUserByUsername.get(username)

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'That username and password do not match an account.' })
  }
  res.json(createSession(user))
})

app.post('/api/auth/logout', authenticate, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token)
  res.json({ ok: true })
})

app.get('/api/state', authenticate, (req, res) => {
  const state = getState.get(req.user.id)
  res.json({
    todos: JSON.parse(state.todos),
    schedule: JSON.parse(state.schedule),
    focusStats: JSON.parse(state.focus_stats),
    streak: JSON.parse(state.streak),
    profile: JSON.parse(state.profile),
    theme: state.theme,
  })
})

app.put('/api/state', authenticate, (req, res) => {
  const body = req.body || {}
  const current = getState.get(req.user.id)
  const state = {
    todos: body.todos ?? JSON.parse(current.todos),
    schedule: body.schedule ?? JSON.parse(current.schedule),
    focusStats: body.focusStats ?? JSON.parse(current.focus_stats),
    streak: body.streak ?? JSON.parse(current.streak),
    profile: body.profile ?? JSON.parse(current.profile),
    theme: body.theme ?? current.theme,
  }

  db.prepare(`
    UPDATE app_state
    SET todos = ?, schedule = ?, focus_stats = ?, streak = ?, profile = ?, theme = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(
    JSON.stringify(state.todos),
    JSON.stringify(state.schedule),
    JSON.stringify(state.focusStats),
    JSON.stringify(state.streak),
    JSON.stringify(state.profile),
    state.theme,
    req.user.id,
  )
  res.json({ ok: true })
})

const port = Number(process.env.PORT || 3001)
app.listen(port, () => {
  console.log(`Daylight database API listening on http://localhost:${port}`)
})
