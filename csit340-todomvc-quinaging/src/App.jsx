import { useLayoutEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen.jsx'
import Todos from './components/Todos.jsx'
import Info from './components/Info.jsx'
import './App.css'

function getInitialTheme() {
  const savedTheme = localStorage.getItem('daylight-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('daylight-theme', nextTheme)
    setTheme(nextTheme)
  }

  if (!isAuthenticated) {
    return <AuthScreen onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <>
      <Todos
        onLogout={() => setIsAuthenticated(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <Info name="Kris Van Ruzzel Quinaging" />
    </>
  )
}

export default App