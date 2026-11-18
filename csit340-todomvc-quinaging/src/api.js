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
  const response = await fetch(path, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'The database request failed.')
  return data
}
