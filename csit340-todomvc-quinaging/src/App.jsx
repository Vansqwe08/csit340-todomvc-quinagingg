import { useState } from 'react'
import AuthScreen from './components/AuthScreen.jsx'
import Todos from './components/Todos.jsx'
import Info from './components/Info.jsx'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  if (!isAuthenticated) {
    return <AuthScreen onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <>
      <Todos onLogout={() => setIsAuthenticated(false)} />
      <Info name="Kris Van Ruzzel Quinaging" />
    </>
  )
}

export default App