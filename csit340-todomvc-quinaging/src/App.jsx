import { useEffect, useLayoutEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen.jsx'
import Todos from './components/Todos.jsx'
import Info from './components/Info.jsx'
import './App.css'
import { apiRequest, clearSession, getSession } from './api.js'

function getInitialTheme() {
  const savedTheme = localStorage.getItem('daylight-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const [session] = useState(getSession)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)
  const [databaseState, setDatabaseState] = useState(null)

  useEffect(() => {
    if (!session) return
    apiRequest('/api/state')
      .then((state) => {
        setDatabaseState(state)
        setTheme(state.theme === 'dark' ? 'dark' : 'light')
        setIsAuthenticated(true)
      })
      .catch(() => {
        clearSession()
        setIsAuthenticated(false)
      })
  }, [session])

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('daylight-theme', nextTheme)
    setTheme(nextTheme)
    apiRequest('/api/state', {
      method: 'PUT',
      body: JSON.stringify({ theme: nextTheme }),
    }).catch(() => {})
  }

  async function handleLogin() {
    try {
      const state = await apiRequest('/api/state')
      setDatabaseState(state)
      setTheme(state.theme === 'dark' ? 'dark' : 'light')
      setIsAuthenticated(true)
    } catch {
      clearSession()
      setIsAuthenticated(false)
    }
  }

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />
  }

  return (
    <>
      <Todos
        onLogout={() => {
          apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {})
          clearSession()
          setIsAuthenticated(false)
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        initialState={databaseState}
      />
      <Info name="Kris Van Ruzzel Quinaging" />
    </>
  )
}

export default App