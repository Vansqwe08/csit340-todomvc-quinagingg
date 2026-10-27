import { useCallback, useEffect, useRef, useState } from 'react'
import AmbientPlayer from './AmbientPlayer.jsx'
import StudyTaskDrawer from './StudyTaskDrawer.jsx'
import { AnalyticsView, CalendarView, SettingsView } from './StudyViews.jsx'

const filters = ['All tasks', 'In progress', 'Completed']
const subjects = ['Mathematics', 'Science', 'Reading', 'Writing', 'History', 'Other']
const focusPresets = [
  { focus: 25, rest: 5 },
  { focus: 50, rest: 10 },
  { focus: 45, rest: 15 },
]
const studyTips = [
  { quote: 'Try explaining what you’ve learned in your own words.', signoff: 'TEACH IT TO REMEMBER IT' },
  { quote: 'A short break can help your brain make sense of new ideas.', signoff: 'REST IS PART OF LEARNING' },
  { quote: 'Test yourself before you look back at your notes.', signoff: 'PRACTICE ACTIVE RECALL' },
  { quote: 'Start with one small question, then follow your curiosity.', signoff: 'STAY CURIOUS' },
]
const quickStarts = [
  { text: 'Review my class notes', subject: 'Reading' },
  { text: 'Practice 5 problems', subject: 'Mathematics' },
  { text: 'Plan my next study session', subject: 'Other' },
]
const tasksStorageKey = 'daylight-study-tasks'
const statsStorageKey = 'daylight-study-stats'
const streakStorageKey = 'daylight-study-streak'
const nameStorageKey = 'daylight-study-name'
const navigationItems = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'tasks', label: 'Tasks', icon: '☷' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
  { id: 'analytics', label: 'Analytics', icon: '◔' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function weekStartsOnMonday(date) {
  return (date.getDay() + 6) % 7
}

function readStoredValue(key, fallback) {
  const storedValue = localStorage.getItem(key)
  return storedValue ? JSON.parse(storedValue) : fallback
}

function isTaskComplete(task) {
  const subtasks = task.subtasks || []
  return task.completed || (subtasks.length > 0 && subtasks.every((subtask) => subtask.completed))
}

function Todos({ onLogout, theme, onToggleTheme }) {
  const [text, setText] = useState('')
  const [subject, setSubject] = useState(subjects[0])
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState('All tasks')
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All subjects')
  const [todos, setTodos] = useState(() => readStoredValue(tasksStorageKey, []))
  const [focusStats, setFocusStats] = useState(() =>
    readStoredValue(statsStorageKey, { sessions: 0, minutes: 0 }),
  )
  const [focusLength, setFocusLength] = useState(25)
  const [breakLength, setBreakLength] = useState(5)
  const [customFocusInput, setCustomFocusInput] = useState('30')
  const [customBreakInput, setCustomBreakInput] = useState('5')
  const [customTimerError, setCustomTimerError] = useState('')
  const [timerPhase, setTimerPhase] = useState('focus')
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60)
  const secondsRemainingRef = useRef(25 * 60)
  const [isFocusRunning, setIsFocusRunning] = useState(false)
  const [studyTipIndex, setStudyTipIndex] = useState(0)
  const [streak, setStreak] = useState(() => readStoredValue(streakStorageKey, { days: 0, lastStudiedDate: '' }))
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [celebrationKey, setCelebrationKey] = useState(0)
  const [activeTab, setActiveTab] = useState('home')
  const [userName, setUserName] = useState(() => localStorage.getItem(nameStorageKey) || 'there')
  const timerDuration = timerPhase === 'focus' ? focusLength : breakLength

  useEffect(() => {
    localStorage.setItem(tasksStorageKey, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem(statsStorageKey, JSON.stringify(focusStats))
  }, [focusStats])

  useEffect(() => {
    localStorage.setItem(streakStorageKey, JSON.stringify(streak))
  }, [streak])

  useEffect(() => {
    if (!celebrationKey) return undefined

    const timeoutId = window.setTimeout(() => setCelebrationKey(0), 1500)
    return () => window.clearTimeout(timeoutId)
  }, [celebrationKey])

  useEffect(() => {
    if (!isFocusRunning) return undefined

    const timerId = window.setInterval(() => {
      const nextRemaining = Math.max(secondsRemainingRef.current - 1, 0)
      secondsRemainingRef.current = nextRemaining
      setSecondsRemaining(nextRemaining)

      if (nextRemaining === 0) {
        setIsFocusRunning(false)
        const nextPhase = timerPhase === 'focus' ? 'break' : 'focus'
        if (timerPhase === 'focus') {
          setFocusStats((stats) => ({
            sessions: stats.sessions + 1,
            minutes: stats.minutes + focusLength,
          }))
        }
        const nextDuration = nextPhase === 'focus' ? focusLength : breakLength
        secondsRemainingRef.current = nextDuration * 60
        setTimerPhase(nextPhase)
        setSecondsRemaining(nextDuration * 60)
      }
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [breakLength, focusLength, isFocusRunning, timerPhase])

  const closeTaskDrawer = useCallback(() => setSelectedTaskId(null), [])

  function recordStudyDay() {
    const today = getLocalDateString()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayString = getLocalDateString(yesterday)

    setStreak((current) => ({
      days: current.lastStudiedDate === today
        ? current.days
        : current.lastStudiedDate === yesterdayString
          ? current.days + 1
          : 1,
      lastStudiedDate: today,
      history: [...new Set([...(current.history || []), today])].slice(-30),
    }))
  }

  function celebrateCompletion() {
    setCelebrationKey((key) => key + 1)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = text.trim()

    if (!trimmed) return

    setTodos((currentTodos) => [
      ...currentTodos,
      {
        id: crypto.randomUUID(),
        text: trimmed,
        subject,
        dueDate,
        completed: false,
      },
    ])
    setText('')
    setDueDate('')
  }

  function addQuickStart(quickStart) {
    setTodos((currentTodos) => [
      ...currentTodos,
      {
        id: crypto.randomUUID(),
        text: quickStart.text,
        subject: quickStart.subject,
        dueDate: '',
        completed: false,
      },
    ])
  }

  function handleToggle(id) {
    const task = todos.find((item) => item.id === id)
    if (!task) return

    const completing = !isTaskComplete(task)
    const completesAllTasks = completing && todos.every(
      (item) => item.id === id || isTaskComplete(item),
    )
    if (completesAllTasks) {
      recordStudyDay()
      celebrateCompletion()
    }

    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: completing,
              subtasks: (todo.subtasks || []).map((subtask) => ({ ...subtask, completed: completing })),
            }
          : todo,
      ),
    )
  }

  function handleDelete(id) {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
  }

  function handleToggleAll() {
    const allCompleted = todos.length > 0 && todos.every(isTaskComplete)
    if (!allCompleted) {
      recordStudyDay()
      celebrateCompletion()
    }
    setTodos((currentTodos) =>
      currentTodos.map((todo) => ({
        ...todo,
        completed: !allCompleted,
        subtasks: (todo.subtasks || []).map((subtask) => ({ ...subtask, completed: !allCompleted })),
      })),
    )
  }

  function handleClearCompleted() {
    setTodos((currentTodos) => currentTodos.filter((todo) => !todo.completed))
  }

  function selectFocusPreset(preset) {
    setIsFocusRunning(false)
    setFocusLength(preset.focus)
    setBreakLength(preset.rest)
    setTimerPhase('focus')
    setCustomTimerError('')
    secondsRemainingRef.current = preset.focus * 60
    setSecondsRemaining(preset.focus * 60)
  }

  function applyCustomTimer() {
    const customFocus = Number(customFocusInput)
    const customBreak = Number(customBreakInput)

    if (!Number.isInteger(customFocus) || customFocus < 1 || customFocus > 180
      || !Number.isInteger(customBreak) || customBreak < 1 || customBreak > 60) {
      setCustomTimerError('Choose a focus from 1–180 min and a break from 1–60 min.')
      return
    }

    setIsFocusRunning(false)
    setFocusLength(customFocus)
    setBreakLength(customBreak)
    setTimerPhase('focus')
    secondsRemainingRef.current = customFocus * 60
    setSecondsRemaining(customFocus * 60)
    setCustomTimerError('')
  }

  function toggleFocusTimer() {
    if (secondsRemaining === 0) {
      const duration = timerPhase === 'focus' ? focusLength : breakLength
      secondsRemainingRef.current = duration * 60
      setSecondsRemaining(duration * 60)
    }
    setIsFocusRunning((running) => !running)
  }

  function resetFocusTimer() {
    setIsFocusRunning(false)
    setTimerPhase('focus')
    secondsRemainingRef.current = focusLength * 60
    setSecondsRemaining(focusLength * 60)
  }

  function updateTaskSubtasks(taskId, update) {
    const task = todos.find((item) => item.id === taskId)
    if (!task) return

    const subtasks = update(task.subtasks || [])
    const taskCompleted = subtasks.length ? subtasks.every((subtask) => subtask.completed) : task.completed
    const nextTodos = todos.map((item) =>
      item.id === taskId ? { ...item, subtasks, completed: taskCompleted } : item,
    )
    const completesAllTasks = !todos.every(isTaskComplete) && nextTodos.every(isTaskComplete)

    if (completesAllTasks) {
      recordStudyDay()
      celebrateCompletion()
    }

    setTodos((currentTodos) =>
      currentTodos.map((item) =>
        item.id === taskId ? { ...item, subtasks, completed: taskCompleted } : item,
      ),
    )
  }

  const activeCount = todos.filter((todo) => !isTaskComplete(todo)).length
  const completedCount = todos.length - activeCount
  const completion = todos.length ? Math.round((completedCount / todos.length) * 100) : 0
  const availableSubjects = [...new Set(todos.map((todo) => todo.subject).filter(Boolean))]
  const visibleTodos = todos.filter((todo) => {
    const matchesFilter =
      filter === 'In progress'
        ? !isTaskComplete(todo)
        : filter === 'Completed'
          ? isTaskComplete(todo)
          : true

    const matchesSubject = subjectFilter === 'All subjects' || todo.subject === subjectFilter
    const searchableText = `${todo.text} ${todo.subject || ''}`.toLowerCase()

    return matchesFilter && matchesSubject && searchableText.includes(query.trim().toLowerCase())
  })
  const timerMinutes = String(Math.floor(secondsRemaining / 60)).padStart(2, '0')
  const timerSeconds = String(secondsRemaining % 60).padStart(2, '0')
  const timerProgress = (secondsRemaining / (timerDuration * 60)) * 100
  const selectedTask = todos.find((todo) => todo.id === selectedTaskId)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const streakIsCurrent = streak.lastStudiedDate === getLocalDateString()
    || streak.lastStudiedDate === getLocalDateString(yesterday)
  const displayedStreak = streakIsCurrent ? streak.days : 0
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekStartsOnMonday(now))
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    const dateKey = getLocalDateString(date)
    return {
      dateKey,
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date).slice(0, 1),
      complete: (streak.history || []).includes(dateKey),
      future: date > now,
    }
  })

  function updateUserName(value) {
    const nextName = value.trim() ? value : ''
    setUserName(nextName)
    localStorage.setItem(nameStorageKey, nextName)
  }

  const dateLabel = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <a className="brand sidebar-brand" href="#" onClick={(event) => {
          event.preventDefault()
          setActiveTab('home')
        }} aria-label="Daylight home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path d="M16 5.5c-1.6 4.1-5.8 5-5.8 10.1a5.8 5.8 0 1 0 11.6 0C21.8 10.5 17.6 9.6 16 5.5Z" fill="currentColor" />
              <path d="M15.9 18.4c-2.6.1-4.1 1.8-4.4 4.1 2.8-.1 4.4-1.5 4.4-4.1Zm.2 0c2.6.1 4.1 1.8 4.4 4.1-2.8-.1-4.4-1.5-4.4-4.1Z" fill="#fff" />
            </svg>
          </span>
          <span>daylight<span className="brand-period">.</span></span>
        </a>
        <p className="nav-section-label">STUDY SPACE</p>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeTab === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {activeTab === item.id && <span className="nav-active-mark" aria-hidden="true" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-quote">
          <span aria-hidden="true">✦</span>
          <p>“Small steps every day lead to big results.”</p>
          <small>KEEP GOING</small>
        </div>
        <div className="sidebar-profile">
          <span className="profile-avatar">{(userName.trim().charAt(0) || 'D').toUpperCase()}</span>
          <span><strong>{userName.trim() || 'Daylight learner'}</strong><small>Learning at your pace</small></span>
        </div>
      </aside>
      <div className="planner">
      <header className="topbar">
        <div className="greeting-heading">
          <h1>{greeting}, {userName.trim() || 'there'} <span aria-hidden="true">✦</span></h1>
          <p>Stay focused. Build your tomorrow.</p>
        </div>
        <div className="topbar-actions">
          <div className="date-chip">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="3.1" y="4.7" width="13.8" height="12" rx="2.1" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 3v3.2M13.5 3v3.2M3.3 8.2h13.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{dateLabel}</span>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
          </button>
          <button type="button" className="logout-button" onClick={onLogout}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M8.2 4.2H5.4c-.7 0-1.2.5-1.2 1.2v9.2c0 .7.5 1.2 1.2 1.2h2.8m4-2.8 3-3-3-3m3 3H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {activeTab === 'home' && <section className="welcome">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR STUDY SPACE</p>
          <h1>Small steps, <span>big learning.</span></h1>
          <p className="welcome-copy">Build a study rhythm that works for you. What will you learn today?</p>
        </div>
        <div className="welcome-summary" aria-label="Today's study summary">
          <p className="summary-label">TODAY AT A GLANCE</p>
          <div className="summary-stats">
            <div><strong>{activeCount}</strong><span>to study</span></div>
            <div><strong>{completedCount}</strong><span>completed</span></div>
            <div><strong>{focusStats.sessions}</strong><span>focus sessions</span></div>
          </div>
          <div className="summary-progress" role="progressbar" aria-label="Today's study tasks completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
            <span style={{ width: `${completion}%` }} />
          </div>
          <span className="summary-caption">{completion}% of your tasks complete</span>
        </div>
      </section>}

      {(activeTab === 'home' || activeTab === 'tasks') ? <div className={`workspace${activeTab === 'tasks' ? ' tasks-workspace' : ''}`}>
        <section className="task-card" aria-label="Your tasks">
          <div className="card-heading">
            <div>
              <p className="section-kicker">YOUR LEARNING PLAN</p>
              <h2>Study tasks <span className="task-total">{todos.length}</span></h2>
            </div>
            {todos.length > 0 && (
              <button
                type="button"
                className="complete-all-button"
                onClick={handleToggleAll}
                aria-label={activeCount ? 'Mark all tasks complete' : 'Mark all tasks active'}
              >
                {activeCount ? 'Complete all' : 'Undo all'}
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m5 10 3.2 3.2L15.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          <form className="add-form" onSubmit={handleSubmit}>
            <span className="add-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </span>
            <input
              aria-label="Add a task"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What would you like to study?"
              maxLength={180}
            />
            <button type="submit" disabled={!text.trim()}>Add task</button>
            <div className="add-options">
              <label>
                <span className="sr-only">Subject</span>
                <select value={subject} onChange={(event) => setSubject(event.target.value)} aria-label="Choose a subject">
                  {subjects.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="due-date-input">
                <span className="sr-only">Optional due date</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  aria-label="Optional due date"
                  min={getLocalDateString()}
                />
              </label>
              <span className="add-hint">Add a subject and optional due date</span>
            </div>
          </form>

          <div className="task-toolbar">
            <div className="filter-tabs" role="group" aria-label="Filter tasks">
              {filters.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={filter === option ? 'filter-tab active' : 'filter-tab'}
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                >
                  {option}
                  {option === 'In progress' && activeCount > 0 && (
                    <span className="filter-count">{activeCount}</span>
                  )}
                </button>
              ))}
            </div>
            {availableSubjects.length > 1 && (
              <label className="subject-filter">
                <span className="sr-only">Filter by subject</span>
                <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} aria-label="Filter by subject">
                  <option>All subjects</option>
                  {availableSubjects.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            )}
            {todos.length > 0 && (
              <label className="search-box">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="8.8" cy="8.8" r="5.6" stroke="currentColor" strokeWidth="1.5" />
                  <path d="m13 13 3.7 3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  aria-label="Search tasks"
                />
              </label>
            )}
          </div>

          {visibleTodos.length > 0 ? (
            <ul className="task-list">
              {visibleTodos.map((todo) => (
                <li className={isTaskComplete(todo) ? 'task-item is-complete' : 'task-item'} key={todo.id}>
                  <button
                    className="task-check"
                    type="button"
                    onClick={() => handleToggle(todo.id)}
                    aria-label={isTaskComplete(todo) ? `Mark ${todo.text} as active` : `Complete ${todo.text}`}
                    aria-pressed={isTaskComplete(todo)}
                  >
                    {isTaskComplete(todo) && (
                      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="m5 10 3.2 3.2L15.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className="task-content">
                    <button type="button" className="task-open" onClick={() => setSelectedTaskId(todo.id)} aria-label={`Open checklist for ${todo.text}`}>
                      <span className="task-text">{todo.text}</span>
                    </button>
                    <span className="task-details">
                      {todo.subject && <span className="subject-tag">{todo.subject}</span>}
                      {(todo.subtasks || []).length > 0 && (
                        <span className="subtask-count">
                          {(todo.subtasks || []).filter((subtask) => subtask.completed).length}/{todo.subtasks.length} steps
                        </span>
                      )}
                      {todo.dueDate && (
                        <time className={todo.dueDate < getLocalDateString() && !isTaskComplete(todo) ? 'task-due overdue' : 'task-due'} dateTime={todo.dueDate}>
                          Due {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${todo.dueDate}T00:00:00`))}
                        </time>
                      )}
                    </span>
                  </span>
                  <button
                    className="delete-task"
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    aria-label={`Delete ${todo.text}`}
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4.5 6.3h11M8 6.3V4.5h4v1.8m-6.1 0 .6 9.2h7l.6-9.2M8.2 9v4.2m3.6-4.2v4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <span className="empty-illustration" aria-hidden="true">
                {query || filter !== 'All tasks' ? (
                  <svg viewBox="0 0 48 48" fill="none">
                    <circle cx="21" cy="21" r="12" stroke="currentColor" strokeWidth="2.5" />
                    <path d="m30 30 9 9M16 21h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 48 48" fill="none">
                    <path d="m24 7 3.4 10.4L38 21l-10.6 3.5L24 35l-3.5-10.5L10 21l10.5-3.6L24 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="m37 30 1.7 5.3L44 37l-5.3 1.8L37 44l-1.8-5.2L30 37l5.2-1.7L37 30ZM12 5l1.5 4.5L18 11l-4.5 1.5L12 17l-1.5-4.5L6 11l4.5-1.5L12 5Z" fill="currentColor" />
                  </svg>
                )}
              </span>
              <h3>{query || filter !== 'All tasks' ? 'Nothing to see here' : 'A fresh page'}</h3>
              <p>
                {query || filter !== 'All tasks'
                  ? 'Try another search, subject, or status filter.'
                  : 'Start with a small study goal. You can always add more as you go.'}
              </p>
              {!todos.length && !query && filter === 'All tasks' && (
                <div className="quick-starts" aria-label="Quick-start study tasks">
                  {quickStarts.map((quickStart) => (
                    <button type="button" key={quickStart.text} onClick={() => addQuickStart(quickStart)}>
                      <span aria-hidden="true">+</span>
                      {quickStart.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {todos.length > 0 && (
            <footer className="task-footer">
              <span><strong>{activeCount}</strong> {activeCount === 1 ? 'task' : 'tasks'} left to go</span>
              {completedCount > 0 && (
                <button type="button" onClick={handleClearCompleted}>
                  Clear completed <span>({completedCount})</span>
                </button>
              )}
            </footer>
          )}
        </section>

        {activeTab === 'home' && <aside className="sidebar">
          <section className="progress-card">
            <div className="progress-topline">
              <span className="progress-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 20s-7-3.7-7-9.2A3.8 3.8 0 0 1 12 9a3.8 3.8 0 0 1 7 1.8C19 16.3 12 20 12 20Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="m9.2 13.2 1.8 1.8 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="progress-label">YOUR MOMENTUM</span>
            </div>
            <div className="streak-banner" aria-label={`${displayedStreak} day study streak`}>
              <span aria-hidden="true">🔥</span>
              <strong>{displayedStreak} {displayedStreak === 1 ? 'day' : 'days'} straight</strong>
              <span className="streak-caption">Keep showing up</span>
            </div>
            <p className="progress-number">{completion}<span>%</span></p>
            <p className="progress-caption">
              {todos.length === 0
                ? 'Your progress starts with one small step.'
                : completedCount === todos.length
                  ? 'Everything is done. Take a well-earned breath.'
                  : `${completedCount} of ${todos.length} ${todos.length === 1 ? 'task' : 'tasks'} complete. Keep it going!`}
            </p>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Tasks completed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
            >
              <span style={{ width: `${completion}%` }} />
            </div>
            <div className="progress-legend">
              <span><i className="legend-dot done-dot" /> Done <strong>{completedCount}</strong></span>
              <span><i className="legend-dot todo-dot" /> To do <strong>{activeCount}</strong></span>
            </div>
            <div className="week-strip" aria-label="Study days this week">
              {weekDays.map((day) => (
                <div className={day.complete ? 'week-day complete' : day.future ? 'week-day future' : 'week-day'} key={day.dateKey} aria-label={`${day.dateKey}${day.complete ? ', study goal completed' : ', no study goal completed'}`}>
                  <span>{day.label}</span>
                  <i aria-hidden="true">{day.complete ? '✓' : ''}</i>
                </div>
              ))}
            </div>
          </section>

          <section className="focus-card" aria-label="Study focus timer">
            <div className="focus-heading">
              <div>
                <p className="section-kicker">FOCUS MODE</p>
                <h2>Study sprint</h2>
              </div>
              <span className="focus-session-count">{focusStats.sessions} done</span>
            </div>
            <p className="focus-phase-label">{timerPhase === 'focus' ? 'FOCUS SESSION' : 'REST & RESET'}</p>
            <div
              className="focus-timer"
              role="timer"
              aria-label={`${timerMinutes} minutes and ${timerSeconds} seconds remaining`}
              style={{ '--timer-progress': `${timerProgress}%` }}
            >
              <div className="focus-timer-inner">
                <span>{timerMinutes}:{timerSeconds}</span>
                <small>{isFocusRunning ? (timerPhase === 'focus' ? 'FOCUSING' : 'ON A BREAK') : 'READY WHEN YOU ARE'}</small>
              </div>
            </div>
            <div className="focus-presets" aria-label="Focus session length">
              {focusPresets.map((preset) => (
                <button
                  type="button"
                  key={preset.focus}
                  className={focusLength === preset.focus && breakLength === preset.rest ? 'focus-preset active' : 'focus-preset'}
                  onClick={() => selectFocusPreset(preset)}
                  disabled={isFocusRunning}
                  aria-pressed={focusLength === preset.focus && breakLength === preset.rest}
                >
                  {preset.focus}/{preset.rest}
                </button>
              ))}
            </div>
            <div className="custom-timer">
              <label>
                <span>Focus</span>
                <input type="number" min="1" max="180" value={customFocusInput} onChange={(event) => setCustomFocusInput(event.target.value)} aria-label="Custom focus minutes" disabled={isFocusRunning} />
              </label>
              <span aria-hidden="true">/</span>
              <label>
                <span>Break</span>
                <input type="number" min="1" max="60" value={customBreakInput} onChange={(event) => setCustomBreakInput(event.target.value)} aria-label="Custom break minutes" disabled={isFocusRunning} />
              </label>
              <button type="button" onClick={applyCustomTimer} disabled={isFocusRunning}>Set</button>
            </div>
            {customTimerError && <p className="timer-error" role="alert">{customTimerError}</p>}
            <div className="focus-actions">
              <button type="button" className="focus-start" onClick={toggleFocusTimer}>
                {isFocusRunning ? 'Pause session' : timerPhase === 'break' ? 'Start break' : secondsRemaining < focusLength * 60 ? 'Resume focus' : 'Start focus'}
              </button>
              <button type="button" className="focus-reset" onClick={resetFocusTimer} aria-label="Reset focus timer">
                Reset
              </button>
            </div>
            <p className="focus-total">{focusStats.minutes} focused minutes in total</p>
            <AmbientPlayer />
          </section>

          <section className="note-card">
            <button
              type="button"
              className="note-next"
              aria-label="Show another study tip"
              onClick={() => setStudyTipIndex((index) => (index + 1) % studyTips.length)}
            >
              <span aria-hidden="true">↗</span>
            </button>
            <p className="note-label">A STUDY TIP</p>
            <p className="note-quote">“{studyTips[studyTipIndex].quote}”</p>
            <span className="note-signoff">{studyTips[studyTipIndex].signoff}</span>
          </section>
        </aside>}
      </div> : activeTab === 'calendar' ? (
        <CalendarView todos={todos} onOpenTask={setSelectedTaskId} />
      ) : activeTab === 'analytics' ? (
        <AnalyticsView todos={todos} focusStats={focusStats} streakDays={displayedStreak} />
      ) : (
        <SettingsView theme={theme} onToggleTheme={onToggleTheme} name={userName} onNameChange={updateUserName} />
      )}
      {selectedTask && (
        <StudyTaskDrawer
          task={selectedTask}
          onClose={closeTaskDrawer}
          onDelete={(taskId) => {
            handleDelete(taskId)
            closeTaskDrawer()
          }}
          onUpdateSubtasks={updateTaskSubtasks}
        />
      )}
      {celebrationKey > 0 && (
        <div key={celebrationKey} className="celebration-burst" aria-label="All study tasks complete. Great work!" role="status">
          {Array.from({ length: 14 }, (_, index) => <span key={index} style={{ '--particle-index': index }} />)}
        </div>
      )}
      </div>
    </main>
  )
}

export default Todos
