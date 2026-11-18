import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import process from 'node:process'

let databaseReady

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

async function getDatabase() {
  if (!process.env.DATABASE_URL) {
    const error = new Error('Vercel database is not configured. Add your Neon connection string as DATABASE_URL.')
    error.status = 503
    throw error
  }

  const sql = neon(process.env.DATABASE_URL)
  if (!databaseReady) {
    databaseReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL
        )
      `
      await sql`
        CREATE TABLE IF NOT EXISTS app_state (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          todos JSONB NOT NULL DEFAULT '[]'::jsonb,
          schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
          focus_stats JSONB NOT NULL DEFAULT '{"sessions":0,"minutes":0}'::jsonb,
          streak JSONB NOT NULL DEFAULT '{"days":0,"lastStudiedDate":"","history":[]}'::jsonb,
          profile JSONB NOT NULL DEFAULT '{}'::jsonb,
          theme TEXT NOT NULL DEFAULT 'light',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
    })().catch((error) => {
      databaseReady = undefined
      throw error
    })
  }
  await databaseReady
  return sql
}

async function readBody(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

async function findSession(sql, request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!token) return null

  const [user] = await sql`
    SELECT users.id, users.name, users.username, users.email, sessions.token
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ${token} AND sessions.expires_at > NOW()
  `
  return user || null
}

async function createSession(sql, user) {
  const token = crypto.randomBytes(32).toString('hex')
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${user.id}, NOW() + INTERVAL '30 days')
  `
  return {
    token,
    user: { id: user.id, name: user.name, username: user.username, email: user.email },
  }
}

async function handleRegister(sql, request) {
  const body = await readBody(request)
  if (!body) return jsonResponse({ error: 'A valid JSON request body is required.' }, 400)

  const name = String(body.name || '').trim()
  const username = String(body.username || '').trim().toLowerCase()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!name || !/^[a-z0-9_.-]{3,30}$/.test(username) || !email.includes('@') || password.length < 6) {
    return jsonResponse({
      error: 'Enter your name, a username (3-30 letters, numbers, dots, dashes, or underscores), a valid email, and a password of at least 6 characters.',
    }, 400)
  }

  const [existingUsername] = await sql`SELECT id FROM users WHERE username = ${username}`
  if (existingUsername) return jsonResponse({ error: 'That username is already taken.' }, 409)

  const [existingEmail] = await sql`SELECT id FROM users WHERE email = ${email}`
  if (existingEmail) return jsonResponse({ error: 'An account with this email already exists.' }, 409)

  const id = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(password, 10)
  try {
    await sql.transaction([
      sql`
        INSERT INTO users (id, name, username, email, password_hash)
        VALUES (${id}, ${name}, ${username}, ${email}, ${passwordHash})
      `,
      sql`INSERT INTO app_state (user_id) VALUES (${id})`,
    ])
  } catch (error) {
    if (error.code === '23505') {
      return jsonResponse({ error: 'That username or email is already in use.' }, 409)
    }
    throw error
  }

  return jsonResponse(await createSession(sql, { id, name, username, email }), 201)
}

async function handleLogin(sql, request) {
  const body = await readBody(request)
  if (!body) return jsonResponse({ error: 'A valid JSON request body is required.' }, 400)

  const username = String(body.username || '').trim().toLowerCase()
  const password = String(body.password || '')
  const [user] = await sql`SELECT * FROM users WHERE username = ${username}`

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return jsonResponse({ error: 'That username and password do not match an account.' }, 401)
  }
  return jsonResponse(await createSession(sql, user))
}

async function handleState(sql, request) {
  const user = await findSession(sql, request)
  if (!user) return jsonResponse({ error: 'Please sign in again.' }, 401)

  if (request.method === 'GET') {
    const [state] = await sql`SELECT * FROM app_state WHERE user_id = ${user.id}`
    if (!state) return jsonResponse({ error: 'Account data could not be found.' }, 404)
    return jsonResponse({
      todos: state.todos,
      schedule: state.schedule,
      focusStats: state.focus_stats,
      streak: state.streak,
      profile: state.profile,
      theme: state.theme,
    })
  }

  if (request.method === 'PUT') {
    const body = await readBody(request)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'A valid JSON request body is required.' }, 400)
    }
    const [current] = await sql`SELECT * FROM app_state WHERE user_id = ${user.id}`
    if (!current) return jsonResponse({ error: 'Account data could not be found.' }, 404)

    const state = {
      todos: body.todos ?? current.todos,
      schedule: body.schedule ?? current.schedule,
      focusStats: body.focusStats ?? current.focus_stats,
      streak: body.streak ?? current.streak,
      profile: body.profile ?? current.profile,
      theme: body.theme ?? current.theme,
    }
    await sql`
      UPDATE app_state
      SET todos = ${JSON.stringify(state.todos)}::jsonb,
          schedule = ${JSON.stringify(state.schedule)}::jsonb,
          focus_stats = ${JSON.stringify(state.focusStats)}::jsonb,
          streak = ${JSON.stringify(state.streak)}::jsonb,
          profile = ${JSON.stringify(state.profile)}::jsonb,
          theme = ${state.theme},
          updated_at = NOW()
      WHERE user_id = ${user.id}
    `
    return jsonResponse({ ok: true })
  }

  return jsonResponse({ error: 'Method not allowed.' }, 405)
}

export async function handleVercelApiRequest(request) {
  try {
    const pathname = new URL(request.url).pathname.replace(/\/+$/, '')
    const sql = await getDatabase()

    if (pathname === '/api/auth/register' && request.method === 'POST') {
      return await handleRegister(sql, request)
    }
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      return await handleLogin(sql, request)
    }
    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      const user = await findSession(sql, request)
      if (!user) return jsonResponse({ error: 'Please sign in again.' }, 401)
      await sql`DELETE FROM sessions WHERE token = ${user.token}`
      return jsonResponse({ ok: true })
    }
    if (pathname === '/api/state') return await handleState(sql, request)

    return jsonResponse({ error: 'API route not found.' }, 404)
  } catch (error) {
    console.error('Vercel database API request failed:', error)
    return jsonResponse({
      error: error.status === 503
        ? error.message
        : 'The database could not complete this request. Check the Vercel function logs and DATABASE_URL.',
    }, error.status || 500)
  }
}
