export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('daylight-session') || 'null')
  } catch {
    return null
  }
}

export function saveSession(session) {
  localStorage.setItem('daylight-session', JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem('daylight-session')
}

export async function apiRequest(path, options = {}) {
  const session = getSession()
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...options.headers,
  }
  let response
  try {
    response = await fetch(path, { ...options, headers })
  } catch {
    throw new Error('Could not reach the database API. Make sure the API server is running or deployed.')
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json().catch(() => null) : null
  if (!response.ok) {
    throw new Error(data?.error || `The database API returned HTTP ${response.status}.`)
  }
  if (!data) {
    throw new Error('The site returned a page instead of the database API. Check the Vercel API deployment.')
  }
  return data
}
